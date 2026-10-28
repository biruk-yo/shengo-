import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { VoiceRoom, parseVoiceRoom, MAX_VOICE_MEMBERS } from '../dist/voice.mjs';

const roomId = 'shengo-00000000-0000-4000-8000-000000000001';
class Connection extends EventEmitter {
  constructor(id, metadata = {}) { super(); this.peer = id; this.metadata = metadata; this.open = false; this.sent = []; }
  send(data) { this.sent.push(data); }
  close() { this.closed = true; this.open = false; this.emit('close'); }
  ready() { this.open = true; this.emit('open'); }
}
class Call extends Connection { answer(stream) { this.answered = stream; } }
function harness(overrides = {}) {
  const track = { enabled: true, stopped: false, stop() { this.stopped = true; } };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
  let peer;
  class Peer extends EventEmitter {
    constructor(id) { super(); this.id = id; this.calls = []; peer = this; }
    connect(id, options) { return this.link = new Connection(id, options.metadata); }
    call(id, stream, options) { const call = new Call(id, options.metadata); this.calls.push(call); return call; }
    destroy() { this.destroyed = true; }
  }
  const room = new VoiceRoom({ loadPeer: async () => Peer, getUserMedia: async () => stream, AudioContext: null, createAudio: () => ({ play: async () => {}, pause() { this.paused = true; } }), ...overrides });
  return { room, track, stream, get peer() { return peer; } };
}

test('room links accept only valid room IDs', () => {
  assert.equal(parseVoiceRoom(roomId), roomId);
  assert.equal(parseVoiceRoom(`https://example.com/#voice=${roomId}`), roomId);
  for (const value of ['', 'hello', 'javascript:alert(1)', 'https://example.com/#topic=hi']) assert.throws(() => parseVoiceRoom(value), /voice|room/);
});
test('host starts muted, explicitly unmutes, and releases media on leave', async () => {
  const h = harness(); await h.room.start({ name: 'Maya' }); assert.equal(h.track.enabled, false);
  h.peer.emit('open'); assert.equal(h.room.state, 'connected'); assert.equal(h.room.members.size, 1);
  h.room.toggleMute(); assert.equal(h.track.enabled, true); assert.equal(h.room.muted, false);
  h.room.toggleMute(); assert.equal(h.track.enabled, false);
  h.room.leave(); assert.equal(h.track.stopped, true); assert.equal(h.peer.destroyed, true); assert.equal(h.room.state, 'idle');
});
test('late microphone permissions are cancelled safely when the user leaves', async () => {
  let resolve; const h = harness({ getUserMedia: () => new Promise(r => { resolve = r; }) });
  const start = h.room.start({ name: 'Maya' }); h.room.leave(); resolve(h.stream); await start;
  assert.equal(h.track.stopped, true); assert.equal(h.room.state, 'idle'); assert.equal(h.peer, undefined);
});
test('denied permissions do not open a peer or claim a connection', async () => {
  const h = harness({ getUserMedia: async () => { throw Object.assign(new Error(), { name: 'NotAllowedError' }); } });
  await h.room.start({ name: 'Maya' }); assert.equal(h.room.state, 'error'); assert.match(h.room.error, /denied/); assert.equal(h.peer, undefined);
});
test('guest must receive the host roster before becoming connected', async () => {
  const h = harness(); await h.room.start({ name: 'Noah', roomId }); h.peer.emit('open'); h.peer.link.ready();
  assert.equal(h.room.state, 'connecting');
  h.peer.link.emit('data', { type: 'roster', members: [{ id: roomId, name: 'Maya', muted: true }, { id: h.room.id, name: 'Noah', muted: true }] });
  assert.equal(h.room.state, 'connected'); h.room.toggleMute(); assert.deepEqual(h.peer.link.sent.at(-1), { type: 'mute', muted: false });
  h.peer.link.close(); assert.equal(h.track.stopped, true); assert.match(h.room.error, /host left/); h.room.leave();
});
test('incoming callers outside the host roster cannot receive microphone audio', async () => {
  const h = harness(); await h.room.start({ name: 'Maya' }); h.peer.emit('open');
  const wrong = new Call(roomId, { room: 'somewhere-else' }); h.peer.emit('call', wrong); assert.equal(wrong.closed, true);
  const unknown = new Call(roomId, { room: h.room.roomId }); h.peer.emit('call', unknown); assert.equal(unknown.answered, undefined);
  h.room.leave(); assert.equal(unknown.closed, true);
});
test('room capacity includes pending joins and mute state is shared by the host', async () => {
  const h = harness(); await h.room.start({ name: 'Maya' }); h.peer.emit('open');
  const connections = Array.from({ length: MAX_VOICE_MEMBERS }, (_, i) => new Connection(`shengo-00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, { room: h.room.roomId, name: `Guest ${i}` }));
  connections.forEach(c => h.peer.emit('connection', c)); connections.forEach(c => c.ready());
  assert.equal(h.room.members.size, MAX_VOICE_MEMBERS); assert.equal(connections.at(-1).sent[0].type, 'reject');
  connections[0].emit('data', { type: 'mute', muted: false }); assert.equal(h.room.members.get(connections[0].peer).muted, false);
  connections[0].close(); assert.equal(h.room.members.size, MAX_VOICE_MEMBERS - 1); h.room.leave();
});
test('signaling loss stops the microphone and reports an actionable error', async () => {
  const h = harness(); await h.room.start({ name: 'Maya' }); h.peer.emit('open'); h.room.toggleMute(); h.peer.emit('disconnected');
  assert.equal(h.track.stopped, true); assert.equal(h.room.state, 'error'); assert.match(h.room.error, /Rejoin/);
});
