import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlan, dinnerShortlist, readHistory } from '../src/engine.ts';

test('unsupported requests never silently start an unrelated demo', () => {
  assert.equal(createPlan('Send money to Alice'), null);
  assert.equal(createPlan(''), null);
});
test('supported instructions map to the correct workspace', () => {
  assert.equal(createPlan('Find vegetarian dinner recipes')?.scenario, 'recipes');
  assert.equal(createPlan('Organize my open tabs')?.scenario, 'tabs');
  assert.equal(createPlan('Plan a focused afternoon')?.scenario, 'plan');
  assert.equal(createPlan('幫我找晚餐食譜')?.scenario, 'recipes');
});
test('dinner results actually satisfy dietary and time constraints', () => {
  const results = dinnerShortlist();
  assert.equal(results.length, 3);
  assert.ok(results.every(r => r.vegetarian && r.time < 30));
  assert.equal(new Set(results.map(r => r.id)).size, 3);
});
test('corrupt or unexpected persisted data cannot crash history', () => {
  for (const value of [null, 'broken', '{}', 'null', '[null,{},42]']) assert.deepEqual(readHistory(value), []);
  const valid = {id: '1', title: 'Dinner', scenario: 'recipes', prompt: 'Find dinner', completedAt: '2026-11-12T14:00:00Z'};
  assert.deepEqual(readHistory(JSON.stringify([valid, {...valid, scenario: 'other'}])), [valid]);
  assert.equal(readHistory(JSON.stringify(Array(50).fill(valid))).length, 30);
});
