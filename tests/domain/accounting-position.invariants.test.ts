import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateAccountingPositionInvariants,
  mapItemRecordToAccountingPosition,
  mapItemRecordToAccountingPositionWithValidation,
} from '../../src/lib/domain/accounting-position';

const legacyItem = {
  id: 'item-1',
  code: 'IT-001',
  name: 'Тестовая позиция',
  isActive: true,
  minQtyBase: null,
  synonyms: null,
  note: null,
  category: { id: 'cat-1', name: 'Материалы' },
  defaultExpenseArticle: { id: 'exp-1', code: 'EA-1', name: 'Расходники' },
  defaultPurpose: { id: 'sec-1', code: 'S-1', name: 'Производство' },
  baseUnit: { id: 'u-1', name: 'шт' },
  defaultInputUnit: { id: 'u-1', name: 'шт' },
  reportUnit: { id: 'u-1', name: 'шт' },
};

test('A: valid when required axes are present, controlledParameters disabled', () => {
  const position = mapItemRecordToAccountingPosition(legacyItem);
  const invariants = evaluateAccountingPositionInvariants(position);

  assert.equal(invariants.valid, true);
  assert.equal(invariants.projectionEligibility.expandedMetrics, true);
});

test('A/C: optional controlledParameters without values is valid but excluded from expanded metrics', () => {
  const position = mapItemRecordToAccountingPosition(legacyItem, {
    strict: false,
    availability: { controlledParameters: 'optional' },
  });

  const invariants = evaluateAccountingPositionInvariants(position);
  assert.equal(invariants.valid, true);
  assert.equal(invariants.projectionEligibility.expandedMetrics, false);
  assert.ok(invariants.projectionEligibility.reasons.some((reason) => reason.includes('опционален')));
});

test('B: invalid when required expenseArticle is missing', () => {
  const position = mapItemRecordToAccountingPosition(legacyItem, { strict: false });
  position.analytics.expenseArticle = null;

  const invariants = evaluateAccountingPositionInvariants(position);
  assert.equal(invariants.valid, false);
  assert.ok(invariants.issues.some((issue) => issue.code === 'AXIS_REQUIRED_MISSING' && issue.axis === 'expenseArticle'));
});

test('B: invalid when required section is missing', () => {
  const position = mapItemRecordToAccountingPosition(legacyItem, { strict: false });
  position.analytics.section = null;

  const invariants = evaluateAccountingPositionInvariants(position);
  assert.equal(invariants.valid, false);
  assert.ok(invariants.issues.some((issue) => issue.code === 'AXIS_REQUIRED_MISSING' && issue.axis === 'section'));
});

test('B: invalid when controlledParameters availability conflicts with mode', () => {
  const { invariants } = mapItemRecordToAccountingPositionWithValidation(legacyItem, {
    strict: false,
    availability: { controlledParameters: 'optional' },
  });
  const position = mapItemRecordToAccountingPosition(legacyItem, { strict: false });
  position.analytics.controlledParameters.mode = 'required';
  position.analytics.availability.controlledParameters = 'disabled';

  const invalid = evaluateAccountingPositionInvariants(position);
  assert.equal(invalid.valid, false);
  assert.ok(invalid.issues.some((issue) => issue.code === 'CONTROLLED_PARAMETERS_MODE_CONFLICT'));

  assert.equal(invariants.valid, true);
});

test('D: compatibility mapping with disabled axis does not produce required/disabled conflict', () => {
  const { invariants, position } = mapItemRecordToAccountingPositionWithValidation(legacyItem, {
    strict: false,
    availability: { expenseArticle: 'disabled' },
  });

  assert.equal(position.analytics.expenseArticle, null);
  assert.equal(position.analytics.compatibility.expenseArticleId, null);
  assert.equal(invariants.valid, true);
});
