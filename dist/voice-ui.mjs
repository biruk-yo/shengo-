import { VoiceRoom, parseVoiceRoom, MAX_VOICE_MEMBERS } from './voice.mjs';
export const voice = new VoiceRoom();
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mic = '<svg class="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8"/></svg>';
const getDialog = () => { let d = document.querySelector('#voice-dialog'); if (!d) { d = document.createElement('dialog'); d.id = 'voice-dialog'; d.setAttribute('aria-labelledby', 'voice-dialog-title'); document.body.append(d); } return d; };
const head = title => `<div class="dialog-head"><h2 id="voice-dialog-title">${title}</h2><button type="button" class="icon-button" data-voice-action="close" aria-label="Close voice dialog">✕</button></div>`;
function inviteURL() { const url = new URL(location.href); url.hash = new URLSearchParams({ voice: voice.roomId }).toString(); return url.href; }

export function voiceStatus() {
  const s = voice.snapshot();
  return `<span class="voice-status-dot ${s.state === 'connected' ? 'connected' : ''}"></span>${mic}<span>${s.state === 'connected' ? s.muted ? 'Voice · muted' : 'Mic is live' : s.state === 'connecting' ? 'Connecting…' : 'Voice lounge'}</span>`;
}

export function voicePanel(compact = false) {
  const s = voice.snapshot();
  if (s.state === 'idle' || s.state === 'error') return `<section class="panel voice-panel ${compact ? 'voice-compact' : ''}"><div class="voice-intro"><div class="voice-symbol">${mic}</div><div><h3>${compact ? 'Give your argument a voice.' : 'The mic is yours.'}</h3><p>Talk live with your opponent and judges. Up to ${MAX_VOICE_MEMBERS} people, each on their own device.</p></div></div>${s.error ? `<p class="voice-error" role="alert">${escape(s.error)}</p>` : ''}<div class="voice-controls"><button class="btn btn-primary" data-voice-action="host">${mic} Start voice room</button><button class="btn btn-white" data-voice-action="join">Join with a code ↗</button></div>${!compact ? '<p class="voice-note">You join muted. Only unmute when you’re ready. Audio is not recorded by Shengo.</p>' : ''}</section>`;
  if (s.state === 'connecting') return `<section class="panel voice-panel"><div class="voice-intro"><div class="voice-symbol">${mic}</div><div><h3>Getting the room ready…</h3><p role="status">Allow microphone access when your browser asks. You’ll enter muted.</p></div></div><div class="voice-controls"><button class="btn btn-white" data-voice-action="leave">Cancel connection</button></div></section>`;
  return `<section class="panel voice-panel ${compact ? 'voice-compact' : ''}"><div class="voice-room-heading"><div><span class="eyebrow">● VOICE ROOM OPEN</span><h3>${s.members.length === 1 ? 'Your crew’s on the way.' : 'Now we’re talking.'}</h3></div><span class="pill pill-green">${s.members.length} / ${MAX_VOICE_MEMBERS} in the room</span></div><div class="voice-members">${s.members.map((m, i) => `<div class="voice-member ${m.self ? 'is-self' : ''}" data-voice-member="${m.id}"><div class="voice-member-avatar" style="--voice-avatar:${['#e5dafb', '#f9dacc', '#dce8fb', '#e7eed2'][i % 4]}">${escape(m.name[0]?.toUpperCase() || '?')}<span class="voice-speaking-dot"></span></div><div class="voice-member-copy"><strong>${escape(m.name)}${m.self ? ' <small>(you)</small>' : ''}</strong><span>${m.audio === 'connecting' ? 'Connecting audio…' : m.muted ? 'Mic muted' : 'Mic on'}${m.host ? ' · Host' : ''}</span></div><span class="voice-member-mic" aria-label="${m.muted ? 'Muted' : 'Microphone on'}">${m.muted ? '⊘' : mic}</span></div>`).join('')}</div>${s.error ? `<p class="voice-error" role="alert">${escape(s.error)}</p>` : ''}${s.playbackBlocked ? '<button class="btn btn-lime" data-voice-action="play">Tap to hear the room</button>' : ''}<div class="voice-controls"><button class="btn ${s.muted ? 'btn-primary' : 'btn-lime'}" data-voice-action="mute" aria-pressed="${!s.muted}">${mic} ${s.muted ? 'Unmute microphone' : 'Mute microphone'}</button><button class="btn btn-white" data-voice-action="invite">↗ Invite friends</button><button class="btn voice-leave" data-voice-action="leave">${s.isHost ? 'End voice room' : 'Leave voice'}</button></div><p class="voice-note">${s.isHost ? 'Keep this tab open. Ending the room disconnects everyone.' : 'Stay in this tab to keep listening.'} Use headphones to avoid echo.</p></section>`;
}

export function voicePage() {
  return `<div class="page-heading"><div><h1>Good arguments. Real voices.</h1><p>Bring your people into the conversation, wherever they are.</p></div><span class="pill pill-purple">${mic} LIVE AUDIO</span></div><div class="voice-page-grid"><div data-voice-panel>${voicePanel()}</div><aside class="panel voice-guide"><span class="voice-guide-emoji">🎧</span><h3>A little room for big ideas.</h3><ol><li><strong>Open a room.</strong><span>Give your microphone permission. You enter muted.</span></li><li><strong>Bring your crew.</strong><span>Share the invitation or room code with people you trust.</span></li><li><strong>Take the mic.</strong><span>Unmute, make your point, and give the other side a turn.</span></li></ol><div class="notice">Voice works between devices. Debate turns and scores still stay on the host’s device. Anyone with your voice code and access to this app can join.</div></aside></div>`;
}

export function refreshVoiceUI() {
  document.querySelectorAll('[data-voice-panel]').forEach(el => {
    // Updating voice must not replace an argument or judge's unfinished form.
    const focusedAction = el.contains(document.activeElement) ? document.activeElement?.dataset.voiceAction : null;
    el.innerHTML = voicePanel(el.dataset.compact === 'true');
    if (focusedAction) el.querySelector(`[data-voice-action="${focusedAction}"]`)?.focus({ preventScroll: true });
  });
  document.querySelectorAll('[data-voice-status]').forEach(el => { el.innerHTML = voiceStatus(); el.classList.toggle('is-live', voice.state === 'connected'); });
}

function openSetup(join, code = '') {
  const d = getDialog();
  d.innerHTML = `${head(join ? 'Meet your crew in voice.' : 'Start a voice room.')}<p class="dialog-description">Live audio, friendly conversation. Your mic starts muted.</p><form id="voice-form"><div class="field"><label for="voice-name">What should we call you?</label><input id="voice-name" name="name" maxlength="30" autocomplete="nickname" placeholder="Your name" required value="${escape(voice.name || '')}"></div>${join ? `<div class="field"><label for="voice-code">Room code or invitation link</label><input id="voice-code" name="room" required placeholder="Paste the host’s code or link" maxlength="2000" value="${escape(code)}"></div>` : ''}<p class="voice-error" id="voice-form-error" role="alert"></p><div class="notice">Your browser will ask for microphone access. Shengo does not record calls. Use headphones if other people are nearby.</div><div class="form-actions"><button class="btn btn-white" type="button" data-voice-action="close">Not yet</button><button class="btn btn-primary" type="submit">${mic} ${join ? 'Join voice room' : 'Open my room'}</button></div></form>`;
  d.showModal();
}

function openInvite() {
  const d = getDialog();
  d.innerHTML = `${head('Bring your people.')}<p class="dialog-description">Share this voice invitation while the host keeps the room open.</p><div class="field"><label for="voice-invite-link">Voice invitation</label><input id="voice-invite-link" readonly value="${escape(inviteURL())}"></div><div class="field"><label for="voice-room-code">Room code</label><input id="voice-room-code" readonly value="${escape(voice.roomId)}"><small>Or open Shengo on another device, choose Voice lounge → Join with a code.</small></div><div class="notice">Share with people you trust. They need access to this app—the hosted preview is currently private. For a local preview, use the room code on another reachable copy of the app.</div><div class="form-actions"><button class="btn btn-white" data-voice-action="copy-code">Copy code</button><button class="btn btn-primary" data-voice-action="copy-invite">Copy invitation</button></div>`;
  d.showModal();
}

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-voice-action]'); if (!button) return;
  switch (button.dataset.voiceAction) {
    case 'show': document.dispatchEvent(new CustomEvent('shengo:voice')); break;
    case 'host': openSetup(false); break;
    case 'join': openSetup(true); break;
    case 'close': getDialog().close(); break;
    case 'mute': voice.toggleMute(); break;
    case 'play': await voice.enablePlayback(); break;
    case 'leave': voice.leave(); break;
    case 'invite': openInvite(); break;
    case 'copy-code': case 'copy-invite': {
      const input = document.querySelector(button.dataset.voiceAction === 'copy-code' ? '#voice-room-code' : '#voice-invite-link');
      try { await navigator.clipboard.writeText(input.value); button.textContent = 'Copied!'; }
      catch { input.focus(); input.select(); button.textContent = 'Select and copy above'; }
      break;
    }
  }
});
document.addEventListener('submit', event => {
  if (event.target.id !== 'voice-form') return;
  event.preventDefault(); const form = new FormData(event.target);
  const name = String(form.get('name')).trim();
  try {
    if (!name) throw new Error('Add your name to join the conversation.');
    if (!navigator.mediaDevices?.getUserMedia || !globalThis.RTCPeerConnection) throw new Error('Live voice needs microphone support in a browser on HTTPS or localhost.');
    const roomId = form.has('room') ? parseVoiceRoom(form.get('room')) : null;
    getDialog().close();
    voice.start({ name, roomId }).catch(error => { voice.leave(error.message); });
  } catch (error) { document.querySelector('#voice-form-error').textContent = error.message; }
});
voice.addEventListener('change', refreshVoiceUI);
voice.addEventListener('levels', event => {
  document.querySelectorAll('[data-voice-member]').forEach(el => {
    const speaking = !!event.detail[el.dataset.voiceMember];
    el.classList.toggle('is-speaking', speaking);
    el.querySelector('.voice-member-avatar').setAttribute('aria-label', speaking ? 'Speaking' : 'Not speaking');
  });
});
window.addEventListener('pagehide', () => voice.leave());
export function readVoiceLink() {
  const code = new URLSearchParams(location.hash.slice(1)).get('voice'); if (!code) return;
  document.dispatchEvent(new CustomEvent('shengo:voice'));
  if (['connecting', 'connected'].includes(voice.state)) return;
  try { openSetup(true, parseVoiceRoom(code)); }
  catch (error) { voice.leave(error.message); }
}
