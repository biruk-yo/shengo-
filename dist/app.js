import { voicePanel, voicePage, voiceStatus, refreshVoiceUI, readVoiceLink } from './voice-ui.mjs';
import { createBattle, startRound, beginTurn, submitArgument, submitScore, isFinished, winner, DAMAGE_MULTIPLIER } from './engine.mjs';

const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const paths = {
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  swords: '<path d="m4 3 7 7-3 3-7-7V3h3Zm16 0-7 7 3 3 7-7V3h-3ZM5 15l4 4m6-14 4 4M3 21l5-5m8 0 5 5M14 14l4 4M10 14l-4 4"/>',
  trophy: '<path d="M8 3h8v7a4 4 0 0 1-8 0V3Zm0 2H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 2v5m-4 2h8m-6-2h4"/>',
  book: '<path d="M12 5C9 3 5 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7l0-7Z"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  people: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m2-17a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 4v3"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  link: '<path d="m10 13 4-4m-6 7-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 10a4 4 0 0 0 6 0l4-4a4 4 0 0 0-6-6l-1 1" transform="translate(1 0) scale(.9)"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="var(--paper)"/><circle cx="15" cy="17" r="3" fill="var(--paper)"/>',
  spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM21 2v4m-2-2h4"/>',
  play: '<path d="m9 5 11 7-11 7V5Z"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 10-8 10S4 17 4 12V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  back: '<path d="M19 12H5m5-5-5 5 5 5"/>',
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
const avatar = (index = 0, size = '') => `<svg class="avatar ${size}" viewBox="0 0 100 100" aria-hidden="true"><rect x="3" y="3" width="94" height="94" rx="30" fill="${index % 2 ? '#d4e3fa' : '#f8d4c7'}"/><path d="M21 100c0-29 58-29 58 0" fill="${index % 2 ? '#7d9ed9' : '#b77ed0'}"/><path d="M33 64v15c6 9 28 9 34 0V64" fill="#d69d79"/><ellipse cx="50" cy="47" rx="26" ry="30" fill="${index % 2 ? '#bd805c' : '#e8b48e'}"/>${index % 2 ? '<path d="M24 43c-4-24 12-30 27-30 19 0 29 10 28 28-11-2-18-9-20-17-9 10-21 13-35 12" fill="#403344"/><path d="M26 29c-2 12 1 21 3 26l-8-9 1-16" fill="#403344"/>' : '<path d="M24 46c-10-28 3-38 18-35 13-10 34 0 36 13 8 9 5 24-2 29l-3-22c-12 5-21-2-25-5-4 10-13 14-24 14" fill="#503b41"/><circle cx="28" cy="16" r="11" fill="#503b41"/>'}<ellipse cx="41" cy="47" rx="2.8" ry="3.8" fill="#3f2c36"/><ellipse cx="61" cy="47" rx="2.8" ry="3.8" fill="#3f2c36"/><path d="M43 61q8 8 16-1" fill="none" stroke="#633d40" stroke-width="2.7" stroke-linecap="round"/>${index % 2 ? '' : '<circle cx="31" cy="57" r="4" fill="#e89984" opacity=".6"/><circle cx="70" cy="57" r="4" fill="#e89984" opacity=".6"/>'}</svg>`;

const heroArt = `<svg viewBox="0 0 350 300" fill="none" aria-hidden="true"><ellipse cx="182" cy="272" rx="140" ry="15" fill="#d8cbef" opacity=".65"/><path d="m40 47 7 8m1-23 2 12m-18-3 10 4M285 77l8-8m-1 18 12-1" stroke="#b7a0d9" stroke-width="3" stroke-linecap="round"/><path d="m283 201 5 9 10 2-8 7 1 10-9-5-9 4 2-10-7-8 10-1Z" fill="#c3b2e7"/><path d="M137 63 169 39l-8 25h23l-35 32 7-30-19-3Z" fill="#e8f4a8" stroke="#615277" stroke-width="2.5" stroke-linejoin="round"/><g transform="rotate(-12 115 172)"><path d="m79 218-5 36-18 7m68-42 6 35 20 8" stroke="#493650" stroke-width="7" stroke-linecap="round"/><path d="m41 159-15 17 7 17m133-29 20-21" stroke="#493650" stroke-width="6" stroke-linecap="round"/><path d="M42 115q0-22 24-22h90q23 0 23 23v82q0 23-24 23h-37l-23 20v-20H64q-22 0-22-22Z" fill="#f7a18d" stroke="#493650" stroke-width="3"/><path d="M56 111h95" stroke="#ffd2bd" stroke-width="5" stroke-linecap="round"/><ellipse cx="84" cy="155" rx="7" ry="11" fill="#493650"/><ellipse cx="133" cy="155" rx="7" ry="11" fill="#493650"/><path d="M96 178q14 14 29-2" stroke="#493650" stroke-width="4" stroke-linecap="round"/><ellipse cx="70" cy="174" rx="9" ry="5" fill="#e9827f"/><ellipse cx="148" cy="174" rx="9" ry="5" fill="#e9827f"/></g><g transform="rotate(12 244 172)"><path d="m209 227-4 30-18 5m64-35 10 25 16 2" stroke="#493650" stroke-width="7" stroke-linecap="round"/><path d="m190 163-18-17m130 15 17 12-6 15" stroke="#493650" stroke-width="6" stroke-linecap="round"/><path d="M184 130q0-22 23-22h76q23 0 23 23v76q0 23-23 23h-21v19l-23-19h-33q-22 0-22-22Z" fill="#a695e6" stroke="#493650" stroke-width="3"/><path d="M198 124h82" stroke="#d2c4fb" stroke-width="5" stroke-linecap="round"/><path d="m207 162 14-6m39 0 14 6" stroke="#493650" stroke-width="5" stroke-linecap="round"/><ellipse cx="218" cy="170" rx="6" ry="9" fill="#493650"/><ellipse cx="264" cy="170" rx="6" ry="9" fill="#493650"/><path d="M228 190q14 12 28-1" stroke="#493650" stroke-width="4" stroke-linecap="round"/></g><g transform="rotate(-8 274 43)"><rect x="227" y="20" width="84" height="29" rx="9" fill="#fffdf6" stroke="#c5b4dd"/><text x="269" y="39" fill="#76628d" text-anchor="middle" font-size="10" font-family="sans-serif" font-weight="700">LET’S SETTLE IT.</text></g><path d="m32 236 4 8 9 1-6 6 1 9-8-4-8 4 2-9-7-6 9-1Z" fill="#e6eea1" stroke="#a9ad72" stroke-width="1.5"/></svg>`;

const topics = [
  { emoji: '🍍', color: '#fff0ce', category: 'The classics', topic: 'Does pineapple belong on pizza?', subtitle: 'A deliciously controversial conversation.', positions: ['Pineapple belongs on pizza', 'Keep fruit off my pizza'] },
  { emoji: '🤖', color: '#ebe7fc', category: 'Big questions', topic: 'AI: creative partner or copycat?', subtitle: 'Human imagination meets the machine.', positions: ['AI helps us create', 'Creativity needs a human'] },
  { emoji: '🏡', color: '#e8efde', category: 'Work & life', topic: 'Is remote work the better way?', subtitle: 'The couch vs. the conference room.', positions: ['Remote work wins', 'The office brings us together'] },
];
let battles = [], settings = { reactions: true, motion: true }, page = 'home', currentId = null, filter = 'all', lastReaction = 0;
try { const stored = JSON.parse(localStorage.getItem('shengo-v1') || '{}'); battles = Array.isArray(stored.battles) ? stored.battles.filter(b => b.id && b.players?.length === 2 && Array.isArray(b.rounds) && Array.isArray(b.judges)) : []; settings = { ...settings, ...stored.settings }; } catch { /* Corrupt storage starts a clean session. */ }
const battle = () => battles.find(b => b.id === currentId);
function save() { try { localStorage.setItem('shengo-v1', JSON.stringify({ battles, settings })); } catch { toast('Browser storage is full. This session may not be saved.'); } }
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').classList.remove('visible'), 3500); }
function nav(target) { page = target; render(); window.scrollTo({ top: 0 }); }
function room(id) { currentId = id; nav('room'); }
const roundName = (i, total) => i === 0 ? 'Opening strike' : i === total - 1 ? 'Final argument' : i === 1 ? 'Counterargument' : 'Rebuttal';

function layout(content) {
  const active = page === 'room' ? 'battles' : page;
  const ongoing = battles.filter(b => b.status !== 'complete').length;
  const links = [['home', 'grid', 'The lobby'], ['battles', 'swords', 'My battles'], ['results', 'trophy', 'Results'], ['voice', 'mic', 'Voice lounge'], ['rules', 'book', 'How to play']];
  return `<aside class="sidebar"><button class="logo" data-nav="home" aria-label="Shengo home"><img src="./icon.svg" alt=""><span class="logo-text">shengo<span class="logo-dot">.</span></span></button><div class="workspace-label">YOUR PLAYGROUND</div><nav class="nav" aria-label="Main navigation">${links.map(([key, glyph, label]) => `<button class="nav-item ${active === key ? 'active' : ''}" data-nav="${key}" ${active === key ? 'aria-current="page"' : ''}>${icon(glyph)}<span class="nav-label">${label}</span>${key === 'battles' && ongoing ? `<span class="nav-count">${ongoing}</span>` : ''}</button>`).join('')}</nav><div class="sidebar-bottom"><div class="sidebar-card"><span class="sprout">🌱</span><h4>Different views.<br>Better conversations.</h4><p>Challenge the idea.<br>Respect the person.</p><button data-nav="rules">The Shengo spirit ${icon('arrow')}</button></div><div class="profile"><span class="profile-avatar">✌️</span><div class="profile-copy"><strong>Your playground</strong><small>Local player · no login needed</small></div>${icon('spark')}</div></div></aside><div class="shell"><header class="topbar"><div class="breadcrumb">Your playground ${icon('chevron')} <strong>${({ home: 'The lobby', battles: 'My battles', results: 'Results', rules: 'How to play', room: 'The arena', settings: 'Preferences', voice: 'Voice lounge' })[page]}</strong></div><button class="mobile-logo logo" data-nav="home" aria-label="Shengo home"><img src="./icon.svg" alt="">shengo<span class="logo-dot">.</span></button><div class="top-actions"><button class="voice-status" data-voice-status data-voice-action="show" aria-label="Open voice lounge">${voiceStatus()}</button><button class="icon-button" data-nav="settings" aria-label="Preferences">${icon('settings')}</button></div></header><main id="main" tabindex="-1" class="fade-in">${content}<footer class="footer"><span>Made for a little friendly disagreement. ${icon('heart')}</span><span>Good points. Good people. Shengo.</span></footer></main></div>`;
}

function home() {
  return `<div class="page-heading"><div><h1>Welcome to the playground <span class="welcome-wave">✌️</span></h1><p>A good disagreement starts a great conversation.</p></div><button class="btn btn-white" data-action="share">${icon('link')} Share a topic</button></div><div class="hero-grid"><section class="hero"><div class="hero-content"><div class="hero-label">${icon('bolt')} BIG OPINIONS. FRIENDLY COMPETITION.</div><h2>Make your point.<br><span>Win the room.</span></h2><p>Two sides. A few fair judges. One epic debate.<br>Turn “I disagree” into a little friendly rivalry.</p><div class="hero-actions"><button class="btn btn-dark" data-action="create">${icon('plus')} Start a battle</button><button class="btn btn-outline" data-action="demo">${icon('play')} Try a demo</button></div><div class="hero-footnote">${icon('people')} Same device. Real opinions. All in good fun.</div></div><div class="hero-art">${heroArt}</div></section><aside class="how-card"><div class="how-top"><h3>A battle in 3 moves</h3><span>✦</span></div>${[['Pick your battle', 'Choose a topic. Find your worthy opponent.'], ['Make your case', 'Take turns. Bring the evidence. Land your point.'], ['Let the judges decide', 'Earn points. Deal damage. Win the room.']].map(([title, text], i) => `<div class="how-step"><span class="step-number">0${i + 1}</span><div><strong>${title}</strong><p>${text}</p></div></div>`).join('')}</aside></div><div class="section-head"><div><h2>A little fuel for the fire 🔥</h2><p>Pick a conversation starter. We’ll bring the arena.</p></div><button class="text-button" data-action="create">Have your own topic? ${icon('arrow')}</button></div><section class="topic-grid" aria-label="Debate topics">${topics.map((t, i) => `<article class="topic-card"><div class="topic-top"><span class="topic-emoji" style="--topic-color:${t.color}">${t.emoji}</span><span class="tag">${t.category}</span></div><h3>${t.topic}</h3><p>${t.subtitle}</p><div class="topic-bottom"><span>2 sides · endless opinions</span><button data-topic="${i}">Pick a side ${icon('arrow')}</button></div></article>`).join('')}</section><div class="section-head"><div><h2>Your corner of the arena</h2><p>Your debates, ready whenever you are.</p></div><button class="text-button" data-nav="battles">View all ${icon('arrow')}</button></div><section class="arena-list">${battles.length ? battles.slice().reverse().slice(0, 2).map(battleRow).join('') : `<div class="battle-row"><div class="battle-row-icon">${icon('swords')}</div><div class="battle-row-text"><h3>Your first friendly rivalry starts here.</h3><p>Set up a battle, gather your people, and make your case.</p></div><span class="pill pill-purple">A fresh start</span><button class="btn btn-white" data-action="create">Let’s go ${icon('arrow')}</button></div>`}</section>`;
}

function battleRow(b) {
  const done = b.status === 'complete';
  return `<div class="battle-row"><div class="battle-row-icon">${icon(done ? 'trophy' : 'swords')}</div><div class="battle-row-text"><h3>${escape(b.topic)}</h3><p>${escape(b.players[0].name)} vs. ${escape(b.players[1].name)} · ${b.totalRounds} rounds · ${b.judges.length} judge${b.judges.length > 1 ? 's' : ''}</p></div><span class="pill ${done ? 'pill-green' : 'pill-purple'}">${done ? 'Finished' : b.status === 'lobby' ? 'In the lobby' : 'In progress'}</span><button class="btn btn-white" data-room="${escape(b.id)}">${done ? 'View result' : b.status === 'lobby' ? 'Enter lobby' : 'Resume'} ${icon('arrow')}</button></div>`;
}

function battleList(results = false) {
  const items = battles.filter(b => results ? b.status === 'complete' : filter === 'all' || (filter === 'finished' ? b.status === 'complete' : b.status !== 'complete')).slice().reverse();
  return `<div class="page-heading"><div><h1>${results ? 'Every battle tells a story.' : 'Your battles. Your big ideas.'}</h1><p>${results ? 'The scores, the strongest arguments, and a chance for a rematch.' : 'Pick up where you left off. Everything is saved on this browser.'}</p></div><button class="btn btn-primary" data-action="create">${icon('plus')} New battle</button></div>${!results ? `<div class="section-head"><h2>My battles</h2><div class="filters">${['all', 'active', 'finished'].map(f => `<button class="filter ${filter === f ? 'active' : ''}" data-filter="${f}" aria-pressed="${filter === f}">${f[0].toUpperCase() + f.slice(1)}</button>`).join('')}</div></div>` : ''}<div class="arena-list history-list">${items.length ? items.map(battleRow).join('') : `<div class="empty-state"><span style="font-size:32px">${results ? '🏆' : '💬'}</span><strong>${results ? 'Your first trophy is waiting.' : 'A quiet arena… for now.'}</strong><p>${results ? 'Finish a debate to see your results here.' : 'Start a new battle or try a practice round.'}</p><button class="btn btn-primary" style="margin-top:18px" data-action="${results ? 'create' : 'demo'}">${results ? 'Start a battle' : 'Try a demo'} ${icon('arrow')}</button></div>`}</div>`;
}

function banner(b) { return `<section class="room-banner"><div><div class="eyebrow">${b.demo ? 'PRACTICE ARENA' : 'YOUR FRIENDLY RIVALRY'}</div><h2>${escape(b.topic)}</h2><p>${b.totalRounds} rounds · ${b.turnSeconds ? `${b.turnSeconds} seconds per turn` : 'No time limit'} · 100 HP · Judge score × ${DAMAGE_MULTIPLIER} = damage</p></div><span class="pill pill-purple">${icon('people')} Pass-and-play</span></section>`; }

function lobby(b) {
  return `<div class="page-heading"><div><h1>Meet me in the arena.</h1><p>Gather around one device. Pick your side. Get ready.</p></div><button class="btn btn-white" data-action="share-battle">${icon('link')} Share topic</button></div>${banner(b)}<div data-voice-panel data-compact="true">${voicePanel(true)}</div><div class="room-layout"><div><section class="panel"><div class="player-selection">${b.players.map((p, i) => `${i ? '<div class="versus">VS</div>' : ''}<div class="player-card ${i ? 'blue' : ''} ${b.ready[i] ? 'ready' : ''}"><div class="eyebrow">PLAYER ${i + 1}</div>${avatar(i)}<h3>${escape(p.name)}</h3><p>${escape(p.position)}</p><button class="ready-button ${b.ready[i] ? 'is-ready' : ''}" data-ready="${i}" aria-pressed="${b.ready[i]}">${b.ready[i] ? '✓ Ready to rumble' : `${escape(p.name)}, ready?`}</button></div>`).join('')}</div><div class="room-actions"><p>Both players approve these judges and rules by getting ready.</p><button class="btn btn-primary" data-action="start" ${b.ready.every(Boolean) ? '' : 'disabled'}>${icon('bolt')} Let the battle begin</button></div></section><section class="panel judge-panel"><h3>The judging crew <span class="muted">· ${b.judges.length}</span></h3><div class="judge-row">${b.judges.map((j, i) => `<span class="judge-chip"><span class="judge-avatar">${['⚖️', '🌟', '🎯', '🌱', '🦉'][i]}</span>${escape(j)}</span>`).join('')}</div><p class="step-caption">Each judge scores independently. Scores stay hidden until everyone is done.</p></section></div><aside class="room-aside"><div class="panel"><h3>The house rules</h3><div class="rule-row"><span>Starting health</span><strong>100 HP each</strong></div><div class="rule-row"><span>Judge scores</span><strong>0–10 points</strong></div><div class="rule-row"><span>Damage</span><strong>Average × 4</strong></div><div class="rule-row"><span>Winner</span><strong>Most HP left</strong></div><p style="margin-top:14px">Both arguments land before damage is dealt. A knockout ends the battle after both attacks.</p><button class="btn btn-white" data-nav="rules">${icon('book')} Full playbook</button></div><div class="notice">✌️ This edition is played together on one device. Share a topic to create a separate battle; online rooms are coming later.</div></aside></div>`;
}

function healthBoard(b) {
  return `<section class="health-board" aria-label="Player health">${b.players.map((p, i) => `${i ? `<div class="round-center"><span>ROUND</span><strong>${b.rounds.length}<span> / ${b.totalRounds}</span></strong><small>${b.status === 'reveal' ? 'RESULTS' : 'MAKE IT COUNT'}</small></div>` : ''}<div class="health ${i ? 'blue' : ''}"><div class="health-label">${avatar(i)}<strong>${escape(p.name)}</strong><span class="hp">${b.hp[i]} <small>/ 100 HP</small></span></div><div class="health-track" role="progressbar" aria-label="${escape(p.name)} health" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${b.hp[i]}"><div class="health-fill" style="width:${b.hp[i]}%"></div></div><p class="health-position">${escape(p.position)}</p></div>`).join('')}</section>`;
}

function argumentsView(b, round) { return `<div class="argument-grid">${round.arguments.map((a, i) => `<article class="argument-card ${i ? 'blue' : ''}"><h4>${escape(b.players[i].name)}’s point</h4><p>${a ? escape(a.text || 'No argument submitted before time ran out.') : 'This player hasn’t made their point yet.'}</p>${a?.evidence ? `<a href="${escape(a.evidence)}" target="_blank" rel="noopener noreferrer">${icon('link')} View evidence</a>` : ''}</article>`).join('')}</div>`; }

function feedbackView(b, r) { return r.scores.map((v, i) => `<div class="judge-feedback"><strong>${escape(b.judges[i])} · ${escape(b.players[0].name)} ${v.scores[0]}/10 · ${escape(b.players[1].name)} ${v.scores[1]}/10</strong><p>${escape(v.feedback)}</p></div>`).join(''); }

function stage(b) {
  const r = b.rounds.at(-1), player = b.players[b.turn];
  if (b.status === 'handoff') return `<div class="handoff"><span class="pill pill-purple">${roundName(b.rounds.length - 1, b.totalRounds)}</span>${avatar(b.turn)}<h2>You’re up, ${escape(player.name)}.</h2><p>Pass the device to ${escape(player.name)}. ${b.turnSeconds ? 'Your timer starts when you’re ready.' : 'Take a breath. A good point is worth making.'}</p><button class="btn btn-primary" data-action="begin">${icon('bolt')} I’m ready. Let’s go.</button>${r.arguments.some(Boolean) ? `<details class="score-details"><summary>Read the other side’s argument</summary>${argumentsView(b, r)}</details>` : ''}</div>`;
  if (b.status === 'argument') return `<div class="stage-top"><div><span class="eyebrow muted">${roundName(b.rounds.length - 1, b.totalRounds)}</span><h3>${escape(player.name)}, make your point.</h3></div><span class="timer" id="timer">${b.turnSeconds ? timeLeft(b) : '∞'}</span></div>${r.arguments.some(Boolean) ? `<details class="score-details" style="margin:0 0 18px;border:0;padding:0"><summary>Read the other side’s argument</summary>${argumentsView(b, r)}</details>` : ''}<form id="argument-form" class="argument-form"><div class="field"><label for="argument">Your argument</label><textarea id="argument" name="argument" maxlength="2000" placeholder="A strong point starts with a clear idea…" required>${escape(b.draft)}</textarea></div><div class="input-footer"><span>Saved as you type · ${b.turnSeconds ? 'Your draft submits when time runs out' : 'Make it thoughtful. Keep it friendly.'}</span><span id="character-count">${b.draft.length}/2000</span></div><div class="field"><label for="evidence">Back it up with a link <span class="muted">(optional)</span></label><input id="evidence" name="evidence" type="url" placeholder="https://your-source.com" value="${escape(b.evidence)}" maxlength="2000"></div><p id="argument-error" class="form-error" role="alert"></p><div class="form-actions"><button class="btn btn-primary" type="submit">Submit my point ${icon('arrow')}</button></div></form>`;
  if (b.status === 'judging') return `<div class="stage-top"><div><span class="eyebrow muted">JUDGE ${r.scores.length + 1} OF ${b.judges.length}</span><h3>${escape(b.judges[r.scores.length])}, your call.</h3></div><span class="pill pill-purple">Scores are hidden</span></div>${argumentsView(b, r)}<p class="muted" style="font-size:12px">Score clarity, evidence, and ${b.rounds.length === 1 ? 'reasoning' : 'the response to the other side'}. Judge the argument, not your favorite person.</p><form id="score-form"><div class="score-grid">${b.players.map((p, i) => `<div><label class="score-label" for="score-${i}">${escape(p.name)} <output id="score-value-${i}">${r.arguments[i].text ? '5' : '0'}</output></label><input type="range" min="0" max="10" step="1" value="${r.arguments[i].text ? '5' : '0'}" id="score-${i}" name="score-${i}" ${r.arguments[i].text ? '' : 'disabled'}><div class="range-ends"><span>0 · No impact</span><span>10 · Excellent</span></div></div>`).join('')}</div><div class="field"><label for="feedback">What made the difference?</label><textarea id="feedback" name="feedback" rows="2" maxlength="400" required placeholder="Give both players something useful to take away…"></textarea></div><p id="score-error" class="form-error" role="alert"></p><div class="form-actions"><button class="btn btn-primary" type="submit">${icon('check')} Lock in my scores</button></div></form>`;
  if (b.status === 'reveal') return `<div class="round-reveal"><div class="eyebrow">ROUND ${b.rounds.length} · THE VERDICT IS IN</div><h2>Good points. Real impact.</h2><div class="damage-grid">${b.players.map((p, i) => `<div class="damage-card ${i ? 'blue' : ''}"><p>${escape(p.name)} deals</p><strong>${r.damage[i]}</strong><span>DAMAGE TO ${escape(b.players[1 - i].name).toUpperCase()}</span></div>`).join('')}</div><p class="muted" style="font-size:11px">Average judge score × 4. Both attacks land together.</p><details class="score-details"><summary>See what the judges thought</summary>${feedbackView(b, r)}</details><button class="btn btn-primary" style="margin-top:25px" data-action="next">${isFinished(b) ? 'Reveal the winner' : 'Next round'} ${icon(isFinished(b) ? 'trophy' : 'arrow')}</button></div>`;
  return '';
}

function arena(b) {
  return `<div class="page-heading"><div><h1>Good friends. Great debate.</h1><p>${escape(b.topic)}</p></div><button class="btn btn-white" data-nav="battles">${icon('back')} My battles</button></div><div data-voice-panel data-compact="true">${voicePanel(true)}</div>${healthBoard(b)}<div class="battle-body"><section class="panel" id="stage">${stage(b)}</section><aside class="battle-aside"><div class="panel"><div class="reaction-title"><h3>Bring the energy</h3><button data-action="mute" aria-label="${settings.reactions ? 'Mute' : 'Enable'} reactions">${settings.reactions ? '◉' : '○'}</button></div><p>A little applause goes a long way. Reactions never affect scores.</p><div class="reaction-buttons">${['🔥', '👏', '🤔', '💯', '😂'].map(e => `<button class="reaction-btn" data-reaction="${e}" aria-label="React ${e}" ${settings.reactions ? '' : 'disabled'}>${e}<small>${b.reactions[e] || 0}</small></button>`).join('')}</div><div class="reaction-buttons"><button class="sticker-btn" data-reaction="GOOD POINT!" ${settings.reactions ? '' : 'disabled'}>GOOD POINT!</button><button class="sticker-btn" data-reaction="LET ’EM COOK" ${settings.reactions ? '' : 'disabled'}>LET ’EM COOK 🔥</button></div></div><div class="panel"><h4>The road to victory</h4><ol class="round-list">${Array.from({ length: b.totalRounds }, (_, i) => `<li class="${i < b.rounds.length - 1 ? 'done' : i === b.rounds.length - 1 ? 'current' : ''}"><span class="round-dot">${i < b.rounds.length - 1 ? '✓' : i + 1}</span>${roundName(i, b.totalRounds)}</li>`).join('')}</ol><p>100 HP each. Most health remaining wins. A tie is a fair result.</p></div><div class="panel"><h4>🌱 Keep it a good conversation.</h4><p>Be curious. Challenge the argument. Respect the person making it.</p></div></aside></div>${b.rounds.length > 1 ? `<details class="panel archive-round"><summary>Previous rounds</summary>${b.rounds.slice(0, -1).map((r, i) => `<h4 style="margin:15px 0">Round ${i + 1} · ${roundName(i, b.totalRounds)}</h4>${argumentsView(b, r)}${feedbackView(b, r)}`).join('')}</details>` : ''}`;
}

function result(b) {
  const w = winner(b), draw = w === 'draw';
  return `<div class="page-heading"><div><h1>That’s a wrap.</h1><p>${escape(b.topic)}</p></div><span class="pill pill-green">Battle complete</span></div><section class="result-hero"><div class="crown">${draw ? '🤝' : '👑'}</div><div class="eyebrow">${draw ? 'EVENLY MATCHED' : b.hp.some(h => h === 0) ? 'KNOCKOUT · BOTH ATTACKS RESOLVED' : 'WINNER BY JUDGES’ DECISION'}</div>${avatar(draw ? 0 : w)}<h1>${draw ? 'A worthy draw.' : `${escape(b.players[w].name)} wins the room!`}</h1><p>${draw ? 'Two strong sides. One great conversation.' : `A stronger case today. Respect to ${escape(b.players[1 - w].name)} for bringing the challenge.`}</p><div class="hero-actions"><button class="btn btn-primary" data-action="rematch">${icon('swords')} Run it back</button><button class="btn btn-white" data-action="swap">${icon('spark')} Swap sides</button></div></section>${healthBoard(b)}<section class="panel"><h3>The scorecard</h3><table class="result-table"><thead><tr><th>Round</th>${b.players.map(p => `<th>${escape(p.name)}’s damage</th>`).join('')}</tr></thead><tbody>${b.rounds.map((r, i) => `<tr><td>${i + 1}. ${roundName(i, b.totalRounds)}</td><td>${r.damage[0]}</td><td>${r.damage[1]}</td></tr>`).join('')}<tr><td>Health remaining</td><td>${b.hp[0]} HP</td><td>${b.hp[1]} HP</td></tr></tbody></table>${b.rounds.map((r, i) => `<details class="archive-round"><summary>Round ${i + 1}: arguments & judge feedback</summary>${argumentsView(b, r)}${feedbackView(b, r)}</details>`).join('')}</section><section class="panel" style="margin-top:20px"><h3>A win beyond the score.</h3><p class="muted" style="font-size:12px;margin-top:8px">Did either argument give you a new perspective?</p><div class="hero-actions" style="margin-top:15px">${['Yes, I see it differently', 'Something to think about', 'Still on my side'].map((v, i) => `<button class="btn ${b.reflection === i ? 'btn-primary' : 'btn-white'}" data-reflection="${i}" aria-pressed="${b.reflection === i}">${v}</button>`).join('')}</div></section>`;
}

function rules() {
  return `<div class="page-heading"><div><h1>Big opinions. Good sports.</h1><p>The playbook for a friendly rivalry.</p></div></div><div class="rules-page"><section class="panel"><h3>01. Assemble your people ${icon('people')}</h3><p>Bring two participants and one to five judges together around the same device. Choose a topic, write down both positions, and agree on the judging panel. Both players must tap Ready before the battle starts.</p></section><section class="panel"><h3>02. Make your point ${icon('swords')}</h3><p>Each participant gets one turn per round. The starting participant alternates each round. Use up to 2,000 characters and an optional evidence link. A timed turn begins only when its participant taps “I’m ready.” When the timer ends, the saved draft is submitted. An empty turn earns zero points.</p></section><section class="panel"><h3>03. Let the arguments land ${icon('bolt')}</h3><p>Judges take turns scoring both arguments from 0 to 10 and explaining their decision. Consider clarity, evidence, and reasoning; in later rounds, consider how well each side responds. Individual scores stay hidden until every judge submits.</p><p><strong>Average score × 4 = damage to the opponent.</strong> If three judges give 6, 8, and 7, the average is 7 and the attack deals 28 damage. Damage is rounded to the nearest whole number. More judges don’t create more damage.</p></section><section class="panel"><h3>04. Finish with respect ${icon('trophy')}</h3><p>Both participants start with 100 HP, and both attacks land together. After the last round, the player with more health wins. If either player reaches zero, the battle ends after both attacks are resolved. Equal health means a draw—even a double knockout.</p><p>A win means these judges found your case stronger today. It doesn’t prove an opinion is objectively true. Emoji and sticker reactions are just encouragement; they never change scores.</p></section><section class="panel"><h3>What this first edition supports</h3><p>Complete debates on one device, saved in this browser. Pass the device between players and judges. Debate scoring is a trust-based local game with no account roles or live score synchronization. The Voice lounge supports live audio between devices; anyone with the voice code and app access can join. Topic links copy the setup into a separate game; they don’t connect a shared room. GIF uploads and synchronized online debate rooms are planned for a later version.</p></section><button class="btn btn-primary" data-action="create">Got it. Let’s battle. ${icon('arrow')}</button></div>`;
}

function preferences() { return `<div class="page-heading"><div><h1>Make yourself comfortable.</h1><p>A little less motion? A little more focus? Your call.</p></div></div><section class="panel rules-page"><div class="settings-row"><div><label for="motion-setting" class="switch-label">Playful motion</label><p>Life-bar transitions and floating reactions. Your device’s reduced-motion setting is always respected.</p></div><input id="motion-setting" type="checkbox" data-setting="motion" ${settings.motion ? 'checked' : ''}></div><div class="settings-row"><div><label for="reactions-setting" class="switch-label">Audience reactions</label><p>Show emoji bursts and animated text stickers.</p></div><input id="reactions-setting" type="checkbox" data-setting="reactions" ${settings.reactions ? 'checked' : ''}></div><div class="notice">Debates are stored on this browser. Clearing your browser data removes them. Shared topic links contain the topic and positions, never arguments or scores.</div></section>`; }

function render() {
  document.body.classList.toggle('reduced-motion', !settings.motion);
  const b = battle();
  if (page === 'room' && !b) page = 'home';
  const view = page === 'home' ? home() : page === 'battles' ? battleList() : page === 'results' ? battleList(true) : page === 'rules' ? rules() : page === 'settings' ? preferences() : page === 'voice' ? voicePage() : b.status === 'lobby' ? lobby(b) : b.status === 'complete' ? result(b) : arena(b);
  $('#app').innerHTML = layout(view);
  document.title = page === 'room' ? `${b.topic} · Shengo` : 'Shengo — Make your point.';
  refreshVoiceUI();
  tick();
}

function showDialog(content) { const d = $('#dialog'); d.innerHTML = content; d.showModal(); }
const dialogHead = title => `<div class="dialog-head"><h2 id="dialog-title">${title}</h2><button type="button" class="icon-button" data-action="close-dialog" aria-label="Close dialog">${icon('close')}</button></div>`;

function createDialog(template = {}) {
  showDialog(`${dialogHead('Start a little friendly rivalry.')}<p class="dialog-description">One topic. Two sides. Your own judging crew.</p><form id="create-form"><div class="field"><label for="topic">What are we debating?</label><input id="topic" name="topic" maxlength="140" required placeholder="The big question everyone has an opinion on…" value="${escape(template.topic || '')}"></div><div class="form-grid">${[0, 1].map(i => `<div><div class="field"><label for="player-${i}">Player ${i + 1}’s name</label><input id="player-${i}" name="player-${i}" maxlength="30" required placeholder="${i ? 'Your worthy opponent' : 'Your name'}"></div><div class="field"><label for="position-${i}">Their side of the story</label><input id="position-${i}" name="position-${i}" maxlength="140" required placeholder="${i ? 'I disagree because…' : 'I believe…'}" value="${escape(template.positions?.[i] || '')}"></div></div>`).join('')}</div><div class="field"><label for="judges">Who’s judging?</label><input id="judges" name="judges" maxlength="160" required placeholder="Sam, Alex, Jordan"><small>One to five names, separated by commas. Judges sit with you.</small></div><div class="form-grid"><div class="field"><label for="rounds">Number of rounds</label><select id="rounds" name="rounds"><option value="3">3 rounds · A friendly showdown</option><option value="5">5 rounds · The full battle</option></select></div><div class="field"><label for="turn-time">Time per turn</label><select id="turn-time" name="turn-time"><option value="0">No timer · Take your time</option><option value="60">60 seconds</option><option value="90">90 seconds</option><option value="120">2 minutes</option></select></div></div><div class="notice">${icon('people')} Pass-and-play: everyone plays on this device. Each player starts with 100 HP.</div><p id="create-error" class="form-error" role="alert"></p><div class="form-actions"><button class="btn btn-white" type="button" data-action="close-dialog">Not yet</button><button class="btn btn-primary" type="submit">Create my arena ${icon('arrow')}</button></div></form>`);
}

function demo() {
  const b = createBattle({ topic: topics[0].topic, players: [{ name: 'Maya', position: topics[0].positions[0] }, { name: 'Noah', position: topics[0].positions[1] }], judges: ['You'], totalRounds: 3 });
  b.demo = true; b.ready = [true, true]; startRound(b); beginTurn(b); submitArgument(b, 'Sweet and salty belong together. Pineapple adds acidity that cuts through rich cheese, just like tomato does. A pizza can be balanced and a little adventurous.'); beginTurn(b); submitArgument(b, 'Pineapple releases moisture that can make the crust soggy, and its sweetness overwhelms a classic tomato sauce. A great pizza starts with ingredients that complement the texture.');
  battles.push(b); save(); room(b.id); toast('Practice round: the arguments are in. You’re the judge!');
}

function shareDialog(b) {
  const data = { topic: b?.topic || topics[0].topic, positions: b?.players.map(p => p.position) || topics[0].positions };
  const url = new URL(location.href); url.hash = 'topic=' + encodeURIComponent(JSON.stringify(data));
  showDialog(`${dialogHead('Good debates are worth sharing.')}<p class="dialog-description">Share this topic and both positions. The recipient can create their own pass-and-play battle.</p><div class="field"><label for="share-link">Topic setup link</label><input id="share-link" readonly value="${escape(url.href)}"></div><div class="notice">This is a topic link, not a live-room invitation. Arguments, names, and scores aren’t included. The private preview is accessible only to its owner.</div><div class="form-actions"><button class="btn btn-primary" data-action="copy-link">${icon('link')} Copy topic link</button></div>`);
}

function react(value) {
  if (!settings.reactions || Date.now() - lastReaction < 450) return;
  lastReaction = Date.now(); const b = battle(); if (!b) return;
  b.reactions[value] = (b.reactions[value] || 0) + 1; save();
  document.querySelectorAll('[data-reaction]').forEach(el => { if (el.dataset.reaction === value && el.querySelector('small')) el.querySelector('small').textContent = b.reactions[value]; });
  if (!settings.motion || matchMedia('(prefers-reduced-motion: reduce)').matches) { toast(value); return; }
  const el = document.createElement('div'); el.className = 'floating-reaction' + (value.length > 4 ? ' floating-sticker' : ''); el.textContent = value; el.style.left = `${45 + Math.random() * 30}%`; $('#reaction-layer').append(el); setTimeout(() => el.remove(), 1900);
}

document.addEventListener('click', async event => {
  const el = event.target.closest('button'); if (!el || el.disabled) return;
  if (el.dataset.nav) return nav(el.dataset.nav);
  if (el.dataset.room) return room(el.dataset.room);
  if (el.dataset.topic !== undefined) return createDialog(topics[Number(el.dataset.topic)]);
  if (el.dataset.filter) { filter = el.dataset.filter; return render(); }
  const b = battle();
  if (el.dataset.ready !== undefined && b?.status === 'lobby') { const i = Number(el.dataset.ready); b.ready[i] = !b.ready[i]; save(); return render(); }
  if (el.dataset.reaction) return react(el.dataset.reaction);
  if (el.dataset.reflection !== undefined && b) { b.reflection = Number(el.dataset.reflection); save(); render(); return toast('A little perspective. That’s a win, too.'); }
  try {
    switch (el.dataset.action) {
      case 'create': return createDialog();
      case 'demo': return demo();
      case 'close-dialog': return $('#dialog').close();
      case 'share': return shareDialog();
      case 'share-battle': return shareDialog(b);
      case 'copy-link': try { await navigator.clipboard.writeText($('#share-link').value); el.innerHTML = `${icon('check')} Copied!`; } catch { $('#share-link').select(); toast('Select and copy the link above.'); } return;
      case 'start': startRound(b); break;
      case 'begin': beginTurn(b); break;
      case 'next': if (isFinished(b)) b.status = 'complete'; else startRound(b); break;
      case 'mute': settings.reactions = !settings.reactions; save(); render(); return toast(settings.reactions ? 'Reactions are on.' : 'Reactions are muted.');
      case 'rematch': case 'swap': {
        const players = b.players.map((p, i) => ({ ...p, position: el.dataset.action === 'swap' ? b.players[1 - i].position : p.position }));
        const fresh = createBattle({ ...b, players }); battles.push(fresh); save(); return room(fresh.id);
      }
      default: return;
    }
    save(); render();
    if (el.dataset.action === 'next') window.scrollTo({ top: 0 });
  } catch (error) { toast(error.message); }
});

document.addEventListener('submit', event => {
  const form = event.target; if (!['create-form', 'argument-form', 'score-form'].includes(form.id)) return;
  event.preventDefault(); const fd = new FormData(form), b = battle();
  try {
    if (form.id === 'create-form') {
      const fresh = createBattle({ topic: fd.get('topic'), players: [0, 1].map(i => ({ name: fd.get(`player-${i}`), position: fd.get(`position-${i}`) })), judges: fd.get('judges').split(','), totalRounds: fd.get('rounds'), turnSeconds: fd.get('turn-time') });
      battles.push(fresh); save(); $('#dialog').close(); room(fresh.id); return;
    }
    if (form.id === 'argument-form') submitArgument(b, fd.get('argument'), fd.get('evidence').trim());
    if (form.id === 'score-form') submitScore(b, [Number(fd.get('score-0') || 0), Number(fd.get('score-1') || 0)], fd.get('feedback'));
    save(); render();
    if (b.status === 'reveal') {
      const r = b.rounds.at(-1); document.querySelectorAll('.health-fill').forEach((el, i) => {
        el.style.width = `${r.hpBefore[i]}%`;
        requestAnimationFrame(() => requestAnimationFrame(() => { el.style.width = `${b.hp[i]}%`; }));
      });
    }
  } catch (error) { $(`#${form.id.replace('-form', '')}-error`).textContent = error.message; }
});

document.addEventListener('input', event => {
  const el = event.target, b = battle();
  if (el.id === 'argument' && b) { b.draft = el.value; $('#character-count').textContent = `${el.value.length}/2000`; save(); }
  if (el.id === 'evidence' && b) { b.evidence = el.value; save(); }
  if (el.id.startsWith('score-')) { const output = $(`#score-value-${el.id.slice(-1)}`); if (output) output.textContent = el.value; }
});
document.addEventListener('change', event => { const key = event.target.dataset.setting; if (key) { settings[key] = event.target.checked; save(); document.body.classList.toggle('reduced-motion', !settings.motion); } });

function timeLeft(b) { const seconds = Math.max(0, Math.ceil((b.deadline - Date.now()) / 1000)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }
function tick() {
  // Deadlines keep running when navigating elsewhere or refreshing the page.
  for (const b of battles) {
    if (b.status !== 'argument' || !b.deadline) continue;
    if (Date.now() >= b.deadline) {
      let evidence = b.evidence.trim();
      try { if (!['http:', 'https:'].includes(new URL(evidence).protocol)) evidence = ''; } catch { evidence = ''; }
      submitArgument(b, b.draft, evidence, true); save();
      if (page === 'room' && b.id === currentId) { render(); toast('Time’s up! Your draft has been submitted.'); }
    } else if (page === 'room' && b.id === currentId && $('#timer')) { $('#timer').textContent = timeLeft(b); $('#timer').classList.toggle('urgent', b.deadline - Date.now() < 10000); }
  }
}
setInterval(tick, 250);

function readTopicLink() {
  if (!location.hash.startsWith('#topic=')) return;
  try { const data = JSON.parse(decodeURIComponent(location.hash.slice(7))); if (typeof data.topic !== 'string' || !Array.isArray(data.positions) || data.positions.length !== 2 || data.positions.some(p => typeof p !== 'string')) throw new Error(); createDialog({ topic: data.topic.slice(0, 140), positions: data.positions.map(p => p.slice(0, 140)) }); }
  catch { toast('That topic link could not be opened. You can still start a new battle.'); }
}
window.addEventListener('hashchange', readTopicLink);
document.addEventListener('shengo:voice', () => nav('voice'));
window.addEventListener('hashchange', readVoiceLink);
render(); readTopicLink(); readVoiceLink();
