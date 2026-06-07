import test from 'node:test';
import assert from 'node:assert/strict';
import {
  coinsForPoints,
  dailyFixedTarget,
  incentiveFor,
  kpiPercentage,
  salaryNet,
  workingDays,
} from '../src/calculations.js';

test('calculates working days while excluding Fridays and saved holidays', () => {
  const days = workingDays(2026, 6, ['2026-06-16']);
  assert.equal(days, 25);
});

test('calculates fixed daily target', () => {
  assert.equal(dailyFixedTarget(500000, 25), 20000);
});

test('calculates KPI percentage safely', () => {
  assert.equal(kpiPercentage(105, 100), 105);
  assert.equal(kpiPercentage(100, 0), 0);
});

test('selects category incentive tiers', () => {
  assert.equal(incentiveFor('Biscuit', 102), 11500);
  assert.equal(incentiveFor('Cake', 105), 13000);
  assert.equal(incentiveFor('Piper', 99.9), 0);
});

test('converts points into monthly wallet coins', () => {
  assert.equal(coinsForPoints(30), 100);
  assert.equal(coinsForPoints(60), 200);
  assert.equal(coinsForPoints(10), 10);
});

test('calculates salary deductions and incentives', () => {
  const salary = salaryNet({ halfDays: 2, absents: 1, kpiIncentive: 9500, badgeBonus: 1000 });
  assert.equal(salary.deductions, 3066);
  assert.equal(salary.netSalary, 43159);
});
