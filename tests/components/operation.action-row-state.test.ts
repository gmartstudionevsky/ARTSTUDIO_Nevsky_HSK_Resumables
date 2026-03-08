import assert from 'node:assert/strict';
import test from 'node:test';

import { buildInitialActionRowDraft, hydrateActionRowDraftWithUnits, resolveDefaultPurposeId, validateActionRowDraft } from '../../src/components/operation/action-row-state';
import { ItemOption, UnitOption } from '../../src/lib/operation/types';

const item: ItemOption = {
  id: '00000000-0000-0000-0000-000000000001',
  code: 'IT-1',
  name: 'Позиция',
  isActive: true,
  defaultExpenseArticle: { id: '00000000-0000-0000-0000-000000000011', code: 'EA', name: 'Статья' },
  defaultPurpose: { id: '00000000-0000-0000-0000-000000000022', code: 'P', name: 'Назначение' },
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

test('resolveDefaultPurposeId: uses header purpose for IN single purpose mode', () => {
  const purposeId = resolveDefaultPurposeId(item, {
    type: 'IN',
    intakeMode: 'SINGLE_PURPOSE',
    headerPurposeId: '00000000-0000-0000-0000-000000000099',
    workspaceSectionId: '00000000-0000-0000-0000-000000000098',
  });

  assert.equal(purposeId, '00000000-0000-0000-0000-000000000099');
});

test('buildInitialActionRowDraft: sets default unit and row defaults', () => {
  const draft = buildInitialActionRowDraft(item, units, {
    type: 'OUT',
    intakeMode: 'SINGLE_PURPOSE',
    headerPurposeId: '',
    workspaceSectionId: '00000000-0000-0000-0000-000000000098',
  });

  assert.equal(draft.qtyInput, '1');
  assert.equal(draft.unitId, units[1]?.unitId);
  assert.equal(draft.expenseArticleId, item.defaultExpenseArticle.id);
  assert.equal(draft.purposeId, item.defaultPurpose.id);
});

test('validateActionRowDraft: returns local errors for qty/unit', () => {
  assert.equal(validateActionRowDraft({ qtyInput: '0', unitId: '', expenseArticleId: '', purposeId: '', comment: '', expanded: false, loadingUnits: false, isSubmitting: false, error: '' }), 'Введите количество больше нуля');
  assert.equal(validateActionRowDraft({ qtyInput: '2', unitId: '', expenseArticleId: '', purposeId: '', comment: '', expanded: false, loadingUnits: false, isSubmitting: false, error: '' }), 'Выберите единицу');
});

test('hydrateActionRowDraftWithUnits: keeps user-entered qty during late unit hydration', () => {
  const hydrated = hydrateActionRowDraftWithUnits({
    currentDraft: {
      qtyInput: '10',
      unitId: '',
      expenseArticleId: item.defaultExpenseArticle.id,
      purposeId: item.defaultPurpose.id,
      comment: 'Комментарий',
      expanded: false,
      loadingUnits: true,
      isSubmitting: false,
      error: 'old',
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
});
