# Shengo

A playful, responsive debate arena. This first implementation is a complete **pass-and-play UI prototype** for people together at one device.

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

## Boundaries

This version has no server-backed rooms, accounts, role authorization, or cross-device synchronization. Pass the device between participants and judges. Topic links do not join a shared game. Native GIF upload/search is not implemented; the reaction tray offers emoji and animated text stickers. Google Fonts are optional network resources with local font fallbacks.

The next backend phase needs persistent room storage, authenticated roles, server-authoritative turns/deadlines/scoring, live updates, private judge submissions, invitation acceptance, and host moderation before online multiplayer is enabled. The UI deliberately labels the current local mode.

## Structure

- `dist/`: directly deployable HTML, CSS, and ES modules.
- `dist/engine.mjs`: deterministic debate rules and validation.
- `dist/app.js`: UI rendering, browser persistence, and interaction handlers.
- `tests/engine.test.mjs`: scoring, fairness, state transitions, and validation checks.
- `server.mjs`: dependency-free local preview server.

Debates are saved under the `shengo-v1` localStorage key. Shared topic URLs include only the topic and positions. The Sites preview is owner-private.
