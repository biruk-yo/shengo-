export const DAMAGE_MULTIPLIER = 4;

export function createBattle(config) {
  const clean = (value, max) => String(value ?? '').trim().slice(0, max);
  const players = config.players?.map(p => ({ name: clean(p.name, 30), position: clean(p.position, 140) }));
  const judges = config.judges?.map(j => clean(j, 30)).filter(Boolean);
  if (!clean(config.topic, 140) || players?.length !== 2 || players.some(p => !p.name || !p.position)) throw new Error('Add a topic, two names, and both positions.');
  if (!judges?.length || judges.length > 5 || new Set(judges.map(j => j.toLowerCase())).size !== judges.length) throw new Error('Add between one and five judges with different names.');
  if (new Set([...players.map(p => p.name), ...judges].map(n => n.toLowerCase())).size !== 2 + judges.length) throw new Error('Participants and judges need different names.');
  return {
    id: crypto.randomUUID(), topic: clean(config.topic, 140), players, judges,
    totalRounds: [3, 5].includes(Number(config.totalRounds)) ? Number(config.totalRounds) : 3,
    turnSeconds: [0, 60, 90, 120].includes(Number(config.turnSeconds)) ? Number(config.turnSeconds) : 0,
    createdAt: Date.now(), hp: [100, 100], ready: [false, false], status: 'lobby',
    rounds: [], draft: '', evidence: '', turn: 0, deadline: null, reactions: {},
  };
}

export function startRound(battle) {
  if (battle.status === 'lobby' && !battle.ready.every(Boolean)) throw new Error('Both participants must be ready.');
  if (!['lobby', 'reveal'].includes(battle.status)) throw new Error('The round cannot start yet.');
  if (battle.rounds.length >= battle.totalRounds || battle.hp.some(hp => hp === 0)) throw new Error('This battle is already complete.');
  battle.rounds.push({ arguments: [null, null], scores: [], damage: null });
  battle.turn = (battle.rounds.length - 1) % 2;
  battle.status = 'handoff';
}

export function beginTurn(battle, now = Date.now()) {
  if (battle.status !== 'handoff') throw new Error('No turn is waiting to start.');
  battle.status = 'argument';
  battle.deadline = battle.turnSeconds ? now + battle.turnSeconds * 1000 : null;
}

export function submitArgument(battle, text, evidence = '', timedOut = false) {
  if (battle.status !== 'argument') throw new Error('It is not an argument turn.');
  text = String(text).trim().slice(0, 2000);
  if (!text && !timedOut) throw new Error('Make your point before submitting.');
  if (evidence) {
    try { if (!['http:', 'https:'].includes(new URL(evidence).protocol)) throw new Error(); }
    catch { throw new Error('Evidence needs a full http:// or https:// link.'); }
  }
  const round = battle.rounds.at(-1);
  round.arguments[battle.turn] = { text, evidence, timedOut };
  battle.draft = ''; battle.evidence = ''; battle.deadline = null;
  if (round.arguments.every(Boolean)) battle.status = 'judging';
  else { battle.turn = 1 - battle.turn; battle.status = 'handoff'; }
}

export function submitScore(battle, scores, feedback) {
  if (battle.status !== 'judging') throw new Error('Judging is closed.');
  if (!Array.isArray(scores) || scores.length !== 2 || scores.some(s => typeof s !== 'number' || !Number.isFinite(s) || s < 0 || s > 10)) throw new Error('Score each argument between 0 and 10.');
  if (!String(feedback).trim()) throw new Error('Add a short explanation for your scores.');
  const round = battle.rounds.at(-1);
  round.scores.push({ scores: scores.map((s, i) => round.arguments[i].text ? s : 0), feedback: String(feedback).trim().slice(0, 400) });
  if (round.scores.length === battle.judges.length) {
    round.hpBefore = [...battle.hp];
    round.damage = [0, 1].map(i => Math.round(round.scores.reduce((sum, vote) => sum + vote.scores[i], 0) / battle.judges.length * DAMAGE_MULTIPLIER));
    battle.hp = battle.hp.map((hp, i) => Math.max(0, hp - round.damage[1 - i]));
    battle.status = 'reveal';
  }
}

export function isFinished(battle) {
  return battle.status === 'complete' || (battle.status === 'reveal' && (battle.rounds.length === battle.totalRounds || battle.hp.some(hp => hp === 0)));
}

export function winner(battle) {
  if (!isFinished(battle)) return null;
  return battle.hp[0] === battle.hp[1] ? 'draw' : battle.hp[0] > battle.hp[1] ? 0 : 1;
}
