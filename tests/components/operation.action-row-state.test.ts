import assert from 'node:assert/strict';
import test from 'node:test';

import { buildInitialActionRowDraft, getSecondLayerEligibilityHints, hasSecondLayerPayload, hydrateActionRowDraftWithUnits, isActionRowFilled, pickParticipatingRowIds, resolveDefaultPurposeId, validateActionRowDraft } from '../../src/components/operation/action-row-state';
import { ItemOption, UnitOption } from '../../src/lib/operation/types';

const item: ItemOption = {
  id: '00000000-0000-0000-0000-000000000001',
  code: 'IT-1',
  name: 'Позиция',
  isActive: true,
  defaultExpenseArticle: { id: '00000000-0000-0000-0000-000000000011', code: 'EA', name: 'Статья' },
  defaultPurpose: { id: '00000000-0000-0000-0000-000000000022', code: 'P', name: 'Раздел' },
};

const units: UnitOption[] = [
  {
    id: 'u1',
    itemId: item.id,
    unitId: '00000000-0000-0000-0000-000000000033',
    factorToBase: '1',
    isAllowed: true,
    isDefaultInput: false,
    isDefaultReport: true,
    unit: { id: '00000000-0000-0000-0000-000000000033', name: 'кг', isActive: true },
  },
  {
    id: 'u2',
    itemId: item.id,
    unitId: '00000000-0000-0000-0000-000000000044',
    factorToBase: '0.5',
    isAllowed: true,
    isDefaultInput: true,
    isDefaultReport: false,
    unit: { id: '00000000-0000-0000-0000-000000000044', name: 'уп', isActive: true },
  },
];

const baseDraft = {
  qtyInput: '',
  unitId: '',
  expenseArticleId: '',
  purposeId: '',
  comment: '',
  expanded: false,
  secondLayerExpanded: false,
  showEligibilityHint: false,
  showControlledParameters: false,
  loadingUnits: false,
  isSubmitting: false,
  error: '',
  distributions: [],
};

test('resolveDefaultPurposeId: uses header purpose for IN single purpose mode', () => {
  const purposeId = resolveDefaultPurposeId(item, {
    type: 'IN',
    intakeMode: 'SINGLE_PURPOSE',
    headerPurposeId: '00000000-0000-0000-0000-000000000099',
    workspaceSectionId: '00000000-0000-0000-0000-000000000098',
  });

  assert.equal(purposeId, '00000000-0000-0000-0000-000000000099');
});

test('buildInitialActionRowDraft: starts empty and keeps defaults', () => {
  const draft = buildInitialActionRowDraft(item, units, {
    type: 'OUT',
    intakeMode: 'SINGLE_PURPOSE',
    headerPurposeId: '',
    workspaceSectionId: '00000000-0000-0000-0000-000000000098',
  });

  assert.equal(draft.qtyInput, '');
  assert.equal(draft.unitId, units[1]?.unitId);
  assert.equal(draft.expenseArticleId, item.defaultExpenseArticle.id);
  assert.equal(draft.purposeId, item.defaultPurpose.id);
  assert.deepEqual(draft.distributions, []);
  assert.equal(draft.secondLayerExpanded, false);
});

test('validateActionRowDraft: returns local errors for qty/unit', () => {
  assert.equal(validateActionRowDraft({ ...baseDraft, qtyInput: '0' }), 'Введите количество больше нуля');
  assert.equal(validateActionRowDraft({ ...baseDraft, qtyInput: '2' }), 'Выберите единицу');
});

test('hydrateActionRowDraftWithUnits: keeps user-entered qty during late unit hydration', () => {
  const hydrated = hydrateActionRowDraftWithUnits({
    currentDraft: {
      ...baseDraft,
      qtyInput: '10',
      expenseArticleId: item.defaultExpenseArticle.id,
      purposeId: item.defaultPurpose.id,
      comment: 'Комментарий',
      loadingUnits: true,
      error: 'old',
      distributions: [{ purposeId: item.defaultPurpose.id, qtyInput: '10' }],
    },
    item,
    unitRows: units,
    context: {
      type: 'IN',
      intakeMode: 'SINGLE_PURPOSE',
      headerPurposeId: '',
      workspaceSectionId: '00000000-0000-0000-0000-000000000098',
    },
  });

  assert.equal(hydrated.qtyInput, '10');
  assert.equal(hydrated.unitId, units[1]?.unitId);
  assert.equal(hydrated.loadingUnits, false);
  assert.equal(hydrated.error, '');
  assert.equal(hydrated.distributions.length, 1);
});

test('filled-row rule: only rows with qty input participate', () => {
  const rowDrafts = {
    a: { ...baseDraft, unitId: 'u1' },
    b: { ...baseDraft, qtyInput: '2', unitId: 'u2' },
  };

  assert.equal(isActionRowFilled(rowDrafts.a), false);
  assert.equal(isActionRowFilled(rowDrafts.b), true);
  assert.deepEqual(pickParticipatingRowIds(rowDrafts), ['b']);
});

test('second-layer hints: returns calm contextual notes for reduced availability', () => {
  const hints = getSecondLayerEligibilityHints({
    ...item,
    analytics: {
      availability: {
        expenseArticle: 'required',
        section: 'required',
        controlledParameters: 'optional',
      },
      controlledParameters: { mode: 'optional', valuesCount: 0 },
      projectionEligibility: { expandedMetrics: false, reasons: ['optional empty'] },
    },
  });

  assert.equal(hints.length >= 2, true);
});

test('second-layer payload guard: false when analytics absent', () => {
  assert.equal(hasSecondLayerPayload(item), false);
  assert.equal(hasSecondLayerPayload({ ...item, analytics: { section: { id: 's1', name: 'Секция' } } }), true);
});
