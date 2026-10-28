# Shengo

A playful, responsive debate arena with **pass-and-play debates and live voice rooms**. Debate scoring stays on one device; voice connects people on separate devices.

## Run locally

Requires Node.js 22 or newer. No package installation is needed.

```sh
npm run dev
```

Open http://127.0.0.1:3000.

```sh
npm test
npm run check
```

## Included

- A responsive lobby, starter topics, custom setup, and player readiness.
- Two participants, one to five judges, and three or five rounds.
- Untimed or 60/90/120-second turns, evidence links, automatically saved drafts.
- Alternating first turns; deadlines persist through navigation and reloads.
- Hidden judge scores, written feedback, average-based simultaneous damage.
- 100 HP, average score × 4 damage, knockout detection, and fair draws.
- Emoji reactions, animated text stickers, reaction muting, and reduced motion.
- Results, per-round argument and score history, rematches, and side swapping.
- Browser-local history and topic links that prefill a separate game's setup.
- Live voice rooms for up to eight people, with invitation links and room codes.
- Muted entry, mute/unmute, speaking indicators, participant presence, and leave/end controls.
- Microphone permission errors, connection timeouts, audio-playback recovery, and cleanup on exit.

## Voice chat

Open **Voice lounge → Start voice room**, enter your name, and grant microphone access. You enter muted. Choose **Invite friends** to copy the voice link or room code. Guests can open the link or choose **Join with a code**. Each person explicitly unmutes when ready. The host must keep the tab open; ending the room disconnects everyone. Navigation inside Shengo keeps the call active; refreshing or closing the page ends your connection.

Voice controls also appear in the debate lobby and arena. Calls are not recorded or persisted, and voice does not submit an argument or modify scores. Debate turns, arguments, and judging still use the local pass-and-play flow.

Microphone capture requires HTTPS or localhost. In the Android emulator, run `adb reverse tcp:3000 tcp:3000` and open `http://localhost:3000`. A localhost invitation is not reachable from another physical device: use the room code in another reachable HTTPS/localhost copy of the app. Hosted preview visitors must have access to the private Site.

The browser uses vendored **PeerJS 1.5.5**, the public PeerJS Cloud signaling service, and Google STUN. Audio travels through WebRTC peer connections. No TURN relay is configured, so restrictive networks or symmetric NAT can prevent connections; the UI reports timeouts and permits retrying. Production deployment should add a self-hosted signaling service, authenticated room membership, and a TURN service with short-lived credentials. Room codes currently act as invitation secrets, not verified account identities.

## Boundaries

This version has no server-backed debate rooms, accounts, role authorization, or cross-device score synchronization. Pass the device between participants and judges for scoring. Topic links do not join a shared game; voice invitations join only live audio. Native GIF upload/search is not implemented; the reaction tray offers emoji and animated text stickers. Google Fonts are optional network resources with local font fallbacks.

The next backend phase needs persistent room storage, authenticated roles, server-authoritative turns/deadlines/scoring, live updates, private judge submissions, invitation acceptance, and host moderation before online multiplayer is enabled. The UI deliberately labels the current local mode.

## Structure

- `dist/`: directly deployable HTML, CSS, and ES modules.
- `dist/engine.mjs`: deterministic debate rules and validation.
- `dist/app.js`: UI rendering, browser persistence, and interaction handlers.
- `dist/voice.mjs`: live audio lifecycle, roster, signaling, mute state, and media cleanup.
- `dist/voice-ui.mjs`: voice lounge, invitation dialogs, and arena controls.
- `dist/vendor/peerjs.min.js`: pinned PeerJS 1.5.5 browser bundle (MIT license alongside).
- `tests/engine.test.mjs`: scoring, fairness, state transitions, and validation checks.
- `tests/voice.test.mjs`: permissions, privacy defaults, membership, capacity, and cleanup checks.
- `server.mjs`: dependency-free local preview server.

Debates are saved under the `shengo-v1` localStorage key. Shared topic URLs include only the topic and positions. The Sites preview is owner-private.
