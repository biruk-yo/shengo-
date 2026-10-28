import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, startRound, beginTurn, submitArgument, submitScore, isFinished, winner } from '../dist/engine.mjs';

const config = { topic: 'A good question?', players: [{ name: 'Maya', position: 'Yes' }, { name: 'Noah', position: 'No' }], judges: ['Sam'], totalRounds: 3, turnSeconds: 60 };
function ready(judges = ['Sam']) { const b = createBattle({ ...config, judges }); b.ready = [true, true]; return b; }
function argue(b) { startRound(b); beginTurn(b); submitArgument(b, 'First argument'); beginTurn(b); submitArgument(b, 'Second argument'); }

test('both players must accept rules before a battle starts', () => {
  const b = createBattle(config);
  assert.throws(() => startRound(b), /ready/);
  b.ready[0] = true; assert.throws(() => startRound(b), /ready/);
  b.ready[1] = true; startRound(b); assert.equal(b.status, 'handoff');
});
test('judge scores stay unapplied until everyone submits; average prevents judge-count inflation', () => {
  const b = ready(['Sam', 'Alex', 'Jordan']); argue(b);
  submitScore(b, [6, 3], 'A clear opening.'); assert.deepEqual(b.hp, [100, 100]);
  submitScore(b, [8, 5], 'Good reasoning.'); assert.equal(b.status, 'judging');
  submitScore(b, [7, 4], 'Useful evidence.');
  assert.deepEqual(b.rounds[0].damage, [28, 16]); assert.deepEqual(b.hp, [84, 72]); assert.equal(b.status, 'reveal');
  assert.throws(() => submitScore(b, [10, 10], 'Duplicate.'), /closed/);
});
test('both final attacks resolve in a double knockout and produce a draw', () => {
  const b = ready();
  for (let i = 0; i < 3; i++) { argue(b); submitScore(b, [10, 10], 'Both arguments are excellent.'); }
  assert.deepEqual(b.hp, [0, 0]); assert.equal(isFinished(b), true); assert.equal(winner(b), 'draw');
  assert.throws(() => startRound(b), /complete/);
});
test('highest remaining health wins after the final round', () => {
  const b = ready();
  for (let i = 0; i < 3; i++) { argue(b); submitScore(b, [8, 5], 'Maya supported the claim more clearly.'); }
  assert.deepEqual(b.hp, [40, 4]); assert.equal(winner(b), 0);
});
test('turn order alternates, timer starts on readiness, and expired blank arguments earn zero', () => {
  const b = ready(); startRound(b); assert.equal(b.deadline, null); beginTurn(b, 1000); assert.equal(b.deadline, 61000);
  assert.throws(() => submitArgument(b, ''), /point/);
  submitArgument(b, '', '', true); assert.equal(b.deadline, null); assert.equal(b.turn, 1);
  beginTurn(b); submitArgument(b, 'A real point'); submitScore(b, [10, 7], 'First player missed their turn.');
  assert.deepEqual(b.rounds[0].damage, [0, 28]); startRound(b); assert.equal(b.turn, 1);
});
test('rejects unsupported evidence protocols and invalid scores', () => {
  const b = ready(); startRound(b); beginTurn(b);
  assert.throws(() => submitArgument(b, 'Click this', 'javascript:alert(1)'), /http/);
  submitArgument(b, 'A source', 'https://example.com/evidence'); beginTurn(b); submitArgument(b, 'A reply');
  for (const score of [-1, 11, NaN, Infinity, '5']) assert.throws(() => submitScore(b, [score, 5], 'Reason'), /between/);
  assert.throws(() => submitScore(b, [5, 5], ' '), /explanation/);
  assert.equal(b.rounds[0].scores.length, 0);
});
test('participants cannot also be judges and judge names must be distinct', () => {
  assert.throws(() => createBattle({ ...config, judges: ['maya'] }), /different names/);
  assert.throws(() => createBattle({ ...config, judges: ['Sam', 'sam'] }), /different names/);
  assert.throws(() => createBattle({ ...config, judges: [] }), /one and five/);
});
test('in-progress battles survive JSON serialization', () => {
  const b = ready(); argue(b); submitScore(b, [7, 8], 'A fair round.');
  const restored = JSON.parse(JSON.stringify(b)); startRound(restored); beginTurn(restored); submitArgument(restored, 'Still here');
  assert.equal(restored.rounds.length, 2); assert.deepEqual(restored.hp, [68, 72]);
});
