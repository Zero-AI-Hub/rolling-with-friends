# 🎲 Dice Online — Static P2P Dice Roller

A fully static, peer-to-peer dice roller for tabletop RPGs. No server required — just host on GitHub Pages and play!

## Features

- **Multiplayer**: Real-time dice rolling over WebRTC (PeerJS)
- **Star topology**: DM hosts the room; players connect directly
- **Anti-cheat**: All dice rolls computed on the DM side
- **Any dice**: d2, d4, d6, d8, d10, d12, d20, d100, and custom dice
- **Multi-dice rolls**: Roll combinations like 3d20 + 2d4 in one throw
- **Visibility control**: Public, private (DM-only), or targeted rolls
- **Critical highlights**: Green glow for max rolls, red for natural 1s
- **Roll history**: Toggleable log; DM can clear
- **Table management**: Autoclear, per-player clear, DM clears all
- **Session recovery**: DM reconnects and restores previous game state
- **Player reconnection**: Same nick = automatic re-identification
- **Avatars**: Built-in fantasy icons or upload your own
- **Sound effects**: Dice rolling sounds
- **Responsive**: Works on desktop, tablet, and phone
- **Fully static**: Deploy anywhere — GitHub Pages, Netlify, a USB stick

## Architecture

```
┌─────────────────────────────────────┐
│        Static Hosting (GitHub Pages) │
│  index.html  dm.html  player.html   │
│  css/  js/  img/  sfx/  tests/      │
└─────────────────────────────────────┘

          PeerJS Cloud (signalling)
                 │
    ┌────────────┼────────────┐
    │            │            │
 Player A    DM (Hub)    Player B
    │            │            │
    └────WebRTC──┴──WebRTC────┘
```

**Star topology**: The DM creates a room and becomes the PeerJS host. Players connect using the room name. All communication flows through the DM.

**Anti-cheat**: Players send roll *requests*. The DM generates random results and distributes them only to authorized viewers.

**Session recovery**: Game state is persisted to `localStorage` on the DM's browser. If the DM reloads, state is restored. Players reconnecting with the same nick are re-identified.

## Pages

| Page | URL | Role |
|------|-----|------|
| Lobby | `index.html` | Create or join a room |
| DM Screen | `dm.html` | Host view — sees all, manages room |
| Player Screen | `player.html` | Player view — rolls dice, sees allowed results |

## Quick Start

1. **Deploy** the files to any static hosting (GitHub Pages, Netlify, `npx serve .`)
2. **DM** opens the page, enters a room name and nick, clicks "Create Room"
3. **Players** enter the same room name, their nick, and click "Join Room"
4. **Roll dice!**

## Development

### Run locally

```bash
# Any static file server works
npx serve .
# or
python3 -m http.server 8000
```

### Run tests

Open `tests/runner.html` in a browser. All tests run automatically.

## Project Structure

```
dice-online-static/
├── index.html              # Lobby page
├── dm.html                 # DM screen
├── player.html             # Player screen
├── css/
│   └── style.css           # All styles (responsive, dark theme)
├── js/
│   ├── protocol.js         # Message types & factories
│   ├── dice.js             # Dice rolling engine
│   ├── connection.js       # PeerJS connection manager
│   ├── storage.js          # localStorage persistence
│   ├── state.js            # Game state management
│   ├── sound.js            # Sound effects
│   └── ui/
│       ├── avatarPicker.js # Avatar selection + upload
│       ├── diceRoller.js   # Dice selection & rolling UI
│       ├── playerPool.js   # Player cards with results
│       ├── historyPanel.js # Roll history sidebar
│       └── dmPanel.js      # DM management panel
├── img/
│   ├── avatars/            # Built-in avatar icons (WebP)
│   └── dice/               # Dice button icons
├── sfx/
│   └── dice-roll.mp3       # Dice sound effect
├── tests/
│   ├── runner.html         # Browser test runner
│   ├── test-harness.js     # Minimal test framework
│   ├── dice.test.js        # Dice engine tests
│   ├── protocol.test.js    # Protocol tests
│   └── state.test.js       # State management tests
├── .gitignore
├── LICENSE                 # MIT
└── README.md               # This file
```

## License

MIT — see [LICENSE](LICENSE).
