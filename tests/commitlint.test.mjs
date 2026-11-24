import { test } from 'node:test';
import assert from 'node:assert/strict';
import lint from '@commitlint/lint';
import load from '@commitlint/load';

const config = await load({}, { file: new URL('../commitlint.config.mjs', import.meta.url).pathname });
const check = (message) => lint(message, config.rules, { plugins: config.plugins, parserOpts: config.parserPreset?.parserOpts });

test('accepts a Conventional Commit', async () => {
  assert.equal((await check('feat: add the labels script')).valid, true);
  assert.equal((await check('fix(bff): return 409 for a duplicate e-mail')).valid, true);
});

test('rejects a message without a type', async () => {
  assert.equal((await check('add the labels script')).valid, false);
});

test('rejects an unknown type', async () => {
  assert.equal((await check('feature: add the labels script')).valid, false);
});

test('rejects a Co-authored-by trailer', async () => {
  const result = await check('feat: add x\n\nbody\n\nCo-authored-by: Someone <a@b.c>');
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.name === 'no-attribution-trailer'));
});

test('rejects a Co-authored-by trailer in any letter case', async () => {
  assert.equal((await check('feat: add x\n\nco-authored-by: Someone <a@b.c>')).valid, false);
});

test('rejects an AI attribution line', async () => {
  assert.equal((await check('feat: add x\n\nGenerated with Claude Code')).valid, false);
});

test('accepts a body that does not mention attribution', async () => {
  assert.equal((await check('feat: add x\n\nExplains why the change is needed.')).valid, true);
});
