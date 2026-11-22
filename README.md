# heist-game

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/barubinan123-boop/heist-game/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/barubinan123-boop/heist-game/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

**Midnight at the Meridian Vault** — a top-down heist game for make.fun's "Make the best heist game" bounty. You are the thief. Three rooms stand between you and the Meridian diamond: a gallery of paintings, a vault hall behind laser curtains, and the diamond's own walled vault. Guards walk patrols with sweeping vision cones, cameras sweep the open floor, and one alarm meter decides whether you walk out rich or get carried out.

## How to play

- **WASD / arrows** — move
- **Shift** — sneak (slower, much harder to spot)
- **E** — grab loot when standing next to it
- **Click** — throw a coin to distract nearby guards (3 coins per room)
- **P** — pause · **R** — restart · **M** — mute

Lift every loot in a room and the exit opens. If a guard or a camera catches you in its cone the alarm climbs; cross a live laser and it climbs faster. At 100% the vault seals and the job is over. A guard that reaches you catches you on the spot.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network: the game is static files under `game/`.

## Layout

- `main.ts` — the make.fun entry program: copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored library.
- `game/index.html` + `game/style.css` — the page and its styling.
- `game/src/config.js` — every tuning number in one place.
- `game/src/levels.js` — the three room maps, patrols and cameras.
- `game/src/world.js` — map parsing, collision, line of sight, laser beams.
- `game/src/guards.js` — patrol, chase and coin-investigation AI, vision cones.
- `game/src/cameras.js` — sweeping camera heads and their cones.
- `game/src/player.js` — the thief: movement, sneaking, coin throws, looting.
- `game/src/audio.js` — sound effects synthesized live with WebAudio.
- `game/src/render.js` — all canvas drawing, including raycast vision cones.
- `game/src/game.js` — the heist rules: alarm, bust, level clear, the getaway.
- `game/src/main.js` — input, the fixed-step loop, and the staged demo states.
- `screenshots/` — four renders of the game taken in headless Chromium.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

## Screenshots

The cover (`1-gallery-heist.jpg`) shows Room 1 mid-heist: the thief between two patrol cones with the alarm meter, loot and a camera cone in the same frame. The others show the alarm climbing in Room 2, the diamond vault in Room 3, and the clean-getaway screen.

---

<sub>Entered on [make.fun](https://make.fun/?ref=s0awek38&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
