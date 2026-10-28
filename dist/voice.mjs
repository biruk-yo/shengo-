// PeerJS handles WebRTC signaling; audio is never recorded or stored by Shengo.
export const MAX_VOICE_MEMBERS = 8;
const ID = /^shengo-[a-f0-9-]{36}$/;
export function parseVoiceRoom(value) {
  let code = String(value || '').trim();
  if (code.includes('://')) {
    try { code = new URLSearchParams(new URL(code).hash.slice(1)).get('voice') || ''; }
    catch { throw new Error('Paste a valid voice invitation link or room code.'); }
  }
  if (!ID.test(code)) throw new Error('Paste the full voice room code or invitation link.');
  return code;
}

export function microphoneMessage(error) {
  return ({ NotAllowedError: 'Microphone access was denied. Allow it in your browser’s site settings, then try again.', NotFoundError: 'No microphone was found. Connect one and try again.', NotReadableError: 'Your microphone is busy or unavailable. Close other audio apps and try again.', SecurityError: 'Voice needs HTTPS or localhost. Open the secure Shengo link.' })[error?.name] || 'Could not start your microphone. Check your device and try again.';
}

async function loadPeer() { await import('./vendor/peerjs.min.js'); return globalThis.Peer; }

export class VoiceRoom extends EventTarget {
  constructor(dependencies = {}) {
    super();
    this.deps = { loadPeer, getUserMedia: constraints => navigator.mediaDevices.getUserMedia(constraints), createAudio: () => { const a = document.createElement('audio'); a.autoplay = true; a.setAttribute('playsinline', ''); return a; }, AudioContext: globalThis.AudioContext || globalThis.webkitAudioContext, timeout: 25000, ...dependencies };
    this.generation = 0; this.state = 'idle'; this.error = ''; this.muted = true;
    this.members = new Map(); this.links = new Map(); this.calls = new Map(); this.audios = new Map(); this.pendingCalls = new Map(); this.meters = new Map(); this.timers = new Set();
  }
  snapshot() {
    return { state: this.state, error: this.error, muted: this.muted, id: this.id, roomId: this.roomId, isHost: this.isHost, name: this.name, playbackBlocked: !!this.playbackBlocked, members: [...this.members.values()].map(m => ({ ...m, self: m.id === this.id, audio: m.id === this.id ? 'connected' : this.audios.has(m.id) ? 'connected' : 'connecting' })) };
  }
  emit() { this.dispatchEvent(new Event('change')); }
  later(fn, delay) { const t = setTimeout(() => { this.timers.delete(t); fn(); }, delay); this.timers.add(t); return t; }
  cancel(t) { clearTimeout(t); this.timers.delete(t); }
  active(generation) { return generation === this.generation && !['idle', 'error'].includes(this.state); }

  async start({ name, roomId = null }) {
    if (['connecting', 'connected'].includes(this.state)) throw new Error('Leave your current voice room first.');
    name = String(name || '').trim().slice(0, 30);
    if (!name) throw new Error('Add your name so the room knows who’s speaking.');
    if (roomId) roomId = parseVoiceRoom(roomId);
    this.leave();
    this.name = name; this.isHost = !roomId; this.id = `shengo-${crypto.randomUUID()}`; this.roomId = roomId || this.id;
    this.state = 'connecting'; this.error = ''; this.muted = true; const generation = this.generation; this.emit();
    try {
      // Request the microphone only after an explicit Start/Join action.
      const stream = await this.deps.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
      if (!this.active(generation)) { stream.getTracks().forEach(t => t.stop()); return; }
      this.stream = stream;
      stream.getAudioTracks().forEach(track => { track.enabled = false; track.onended = () => { if (this.active(generation)) this.leave('Your microphone disconnected. Connect it and rejoin.'); }; });
      const Peer = await this.deps.loadPeer();
      if (!this.active(generation)) return;
      this.peer = new Peer(this.id, { secure: true, debug: 0, config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] } });
      this.connectionTimer = this.later(() => this.leave('The voice room could not connect. Check your network and try again.'), this.deps.timeout);
      this.peer.on('open', () => {
        if (!this.active(generation)) return;
        this.startMeters();
        if (this.isHost) {
          this.members.set(this.id, { id: this.id, name: this.name, muted: true, host: true });
          this.state = 'connected'; this.cancel(this.connectionTimer); this.emit();
        } else this.connectHost(generation);
      });
      this.peer.on('connection', conn => {
        if (!this.active(generation) || !this.isHost) { conn.close(); return; }
        this.acceptGuest(conn, generation);
      });
      this.peer.on('call', call => {
        if (!this.active(generation) || call.metadata?.room !== this.roomId || this.calls.has(call.peer)) { call.close(); return; }
        if (this.members.has(call.peer)) this.answer(call);
        else {
          // Signaling can arrive ahead of the host's roster. Never answer an unlisted peer.
          if (this.pendingCalls.has(call.peer) || this.pendingCalls.size >= MAX_VOICE_MEMBERS) { call.close(); return; }
          this.pendingCalls.set(call.peer, call);
          this.later(() => { if (this.pendingCalls.get(call.peer) === call) { this.pendingCalls.delete(call.peer); call.close(); } }, 5000);
        }
      });
      this.peer.on('error', error => {
        if (!this.active(generation)) return;
        const message = error.type === 'peer-unavailable' ? 'That room is unavailable. Ask the host to start voice and share a new invitation.' : 'Voice connection failed. Try another network, then rejoin.';
        this.leave(message);
      });
      this.peer.on('disconnected', () => { if (this.active(generation)) this.leave('Voice lost its connection. Rejoin when your network is back.'); });
      this.peer.on('close', () => { if (this.active(generation)) this.leave('The voice connection closed. You can start or join again.'); });
    } catch (error) {
      if (this.active(generation)) this.leave(this.stream ? 'Voice could not load. Check your connection and try again.' : microphoneMessage(error));
    }
  }

  connectHost(generation) {
    const conn = this.peer.connect(this.roomId, { reliable: true, serialization: 'json', metadata: { room: this.roomId, name: this.name } });
    this.links.set(this.roomId, conn);
    conn.on('data', data => {
      if (!this.active(generation) || !data || typeof data !== 'object') return;
      if (data.type === 'reject') { this.leave(typeof data.message === 'string' ? data.message.slice(0, 160) : 'The host could not admit you.'); return; }
      if (data.type !== 'roster' || !Array.isArray(data.members) || data.members.length > MAX_VOICE_MEMBERS) return;
      const valid = data.members.filter(m => ID.test(m?.id) && typeof m.name === 'string').map(m => ({ id: m.id, name: m.name.slice(0, 30), muted: !!m.muted, host: m.id === this.roomId }));
      if (!valid.some(m => m.id === this.id) || !valid.some(m => m.id === this.roomId)) return;
      this.members = new Map(valid.map(m => [m.id, m]));
      this.state = 'connected'; this.cancel(this.connectionTimer); this.syncCalls(); this.emit();
    });
    const closed = () => { if (this.active(generation)) this.leave('The host left or lost connection. Ask them for a new voice invitation.'); };
    conn.on('close', closed); conn.on('error', closed);
  }

  acceptGuest(conn, generation) {
    if (conn.metadata?.room !== this.roomId || !ID.test(conn.peer) || !String(conn.metadata?.name || '').trim() || this.links.has(conn.peer)) { conn.close(); return; }
    // Reserve a place immediately, including handshakes, to enforce capacity.
    if (this.links.size >= MAX_VOICE_MEMBERS - 1) {
      conn.on('open', () => { conn.send({ type: 'reject', message: 'This voice room is full (8 people). Try again when someone leaves.' }); this.later(() => conn.close(), 250); });
      return;
    }
    this.links.set(conn.peer, conn);
    const reservation = this.later(() => { if (!conn.open) { this.links.delete(conn.peer); conn.close(); } }, this.deps.timeout);
    conn.on('open', () => {
      if (!this.active(generation)) { conn.close(); return; }
      this.cancel(reservation);
      this.members.set(conn.peer, { id: conn.peer, name: String(conn.metadata.name).trim().slice(0, 30), muted: true, host: false });
      this.broadcast();
    });
    conn.on('data', data => {
      if (this.active(generation) && data?.type === 'mute' && this.members.has(conn.peer)) {
        this.members.get(conn.peer).muted = !!data.muted; this.broadcast();
      }
    });
    const closed = () => {
      if (!this.active(generation) || this.links.get(conn.peer) !== conn) return;
      this.cancel(reservation); this.links.delete(conn.peer); this.members.delete(conn.peer); this.removeCall(conn.peer); this.broadcast();
    };
    conn.on('close', closed); conn.on('error', closed);
  }

  broadcast() {
    const payload = { type: 'roster', members: [...this.members.values()] };
    this.links.forEach(conn => { if (conn.open) conn.send(payload); });
    this.syncCalls(); this.emit();
  }
  syncCalls() {
    this.calls.forEach((_, id) => { if (!this.members.has(id)) this.removeCall(id); });
    this.members.forEach((_, id) => {
      if (id === this.id || this.calls.has(id)) return;
      const pending = this.pendingCalls.get(id);
      if (pending) { this.pendingCalls.delete(id); this.answer(pending); }
      // A stable ordering gives exactly one caller per pair.
      else if (this.id < id) {
        const call = this.peer.call(id, this.stream, { metadata: { room: this.roomId } });
        if (call) this.watchCall(call);
      }
    });
  }
  answer(call) { this.watchCall(call); call.answer(this.stream); }
  watchCall(call) {
    const generation = this.generation;
    this.calls.set(call.peer, call);
    const timeout = this.later(() => {
      if (this.calls.get(call.peer) === call && !this.audios.has(call.peer)) {
        this.leave('Audio could not connect through this network. Try another network and rejoin.');
      }
    }, this.deps.timeout);
    call.on('stream', stream => {
      if (!this.active(generation) || this.calls.get(call.peer) !== call || !this.members.has(call.peer)) return;
      this.cancel(timeout);
      let audio = this.audios.get(call.peer);
      if (!audio) { audio = this.deps.createAudio(); this.audios.set(call.peer, audio); }
      audio.srcObject = stream;
      Promise.resolve(audio.play()).catch(() => { if (this.active(generation)) { this.playbackBlocked = true; this.emit(); } });
      this.addMeter(call.peer, stream); this.emit();
    });
    const closed = () => {
      this.cancel(timeout);
      if (this.active(generation) && this.calls.get(call.peer) === call) {
        this.removeCall(call.peer); this.error = 'A participant’s audio disconnected. They may need to rejoin.'; this.emit();
      }
    };
    call.on('close', closed); call.on('error', closed);
  }
  removeCall(id) {
    const call = this.calls.get(id); this.calls.delete(id); call?.close();
    const audio = this.audios.get(id); if (audio) { audio.pause(); audio.srcObject = null; audio.remove?.(); this.audios.delete(id); }
    const meter = this.meters.get(id); meter?.source.disconnect(); this.meters.delete(id);
  }
  toggleMute() {
    if (this.state !== 'connected' || !this.stream) return;
    this.muted = !this.muted;
    this.stream.getAudioTracks().forEach(t => { t.enabled = !this.muted; });
    if (this.members.has(this.id)) this.members.get(this.id).muted = this.muted;
    if (this.isHost) this.broadcast();
    else { const host = this.links.get(this.roomId); if (host?.open) host.send({ type: 'mute', muted: this.muted }); this.emit(); }
    this.audioContext?.resume().catch(() => {});
  }
  async enablePlayback() {
    try { await this.audioContext?.resume(); await Promise.all([...this.audios.values()].map(a => a.play())); this.playbackBlocked = false; }
    catch { this.playbackBlocked = true; }
    this.emit();
  }
  startMeters() {
    if (!this.deps.AudioContext) return;
    try {
      this.audioContext = new this.deps.AudioContext(); this.audioContext.resume().catch(() => {});
      this.addMeter(this.id, this.stream);
      this.meterInterval = setInterval(() => {
        const levels = {};
        this.meters.forEach((meter, id) => {
          meter.analyser.getByteTimeDomainData(meter.samples);
          const rms = Math.sqrt(meter.samples.reduce((n, v) => n + ((v - 128) / 128) ** 2, 0) / meter.samples.length);
          levels[id] = !this.members.get(id)?.muted && rms > 0.025;
        });
        this.dispatchEvent(new CustomEvent('levels', { detail: levels }));
      }, 120);
    } catch { /* Voice still works if the browser cannot provide a level meter. */ }
  }
  addMeter(id, stream) {
    if (!this.audioContext || this.meters.has(id)) return;
    try { const source = this.audioContext.createMediaStreamSource(stream), analyser = this.audioContext.createAnalyser(); analyser.fftSize = 256; source.connect(analyser); this.meters.set(id, { source, analyser, samples: new Uint8Array(256) }); } catch { /* Metering is optional. */ }
  }
  leave(error = '') {
    this.generation++;
    this.state = error ? 'error' : 'idle'; this.error = error; this.muted = true;
    this.timers.forEach(clearTimeout); this.timers.clear(); clearInterval(this.meterInterval);
    this.stream?.getTracks().forEach(track => { track.onended = null; track.stop(); }); this.stream = null;
    this.calls.forEach((_, id) => this.removeCall(id));
    this.pendingCalls.forEach(call => call.close()); this.pendingCalls.clear();
    this.links.forEach(conn => conn.close()); this.links.clear();
    const peer = this.peer; this.peer = null; peer?.destroy();
    this.meters.forEach(m => m.source.disconnect()); this.meters.clear();
    this.audioContext?.close().catch(() => {}); this.audioContext = null;
    this.members.clear(); this.playbackBlocked = false; this.emit();
  }
}
