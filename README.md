# THINGS

**A little hand. A lot off your hands.**

An original desktop-companion hackathon prototype: give a stitched little hand a task, watch it interact with a workspace, and keep the result. Inspired by the idea of a helpful disembodied hand in *Wednesday* and voice-delegated computing in [Hands](https://github.com/lithdew/hands). The interface, character SVG, animations, and implementation here are original; no source or UI assets were copied from either.

## Start

Requires Node.js 22.6+ and npm. Tested on Windows with Node 22.17.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. For the desktop app:

```sh
npm run desktop
```

In the desktop app, open **Make it yours → Desktop companion** to enable a transparent, always-on-top hand following your system cursor. It is click-through and leaves the real pointer visible for precision. Turn it off in the same settings. Closing THINGS also closes the companion.

**Ctrl/Cmd + Shift + Space** brings the desktop app forward and toggles speech input. Browser and OS speech support varies; typing always works. Speech recognition may use your browser's speech service. Voice text is reviewed before submitting and never automatically starts a task.

## What works now

- Original responsive ivory-and-lilac workspace, history, and preferences.
- Original SVG hand with idle, walking, thinking, tapping, and celebration states.
- Three interactive demos: vegetarian dinners under 30 minutes, sample tab grouping, and an afternoon focus schedule.
- Hand movement targets the actual workspace buttons; those buttons update the displayed data.
- Pause, resume, cancel, replay, and manual workspace interaction.
- Local completed-task history (up to 30 entries), persisted preferences, downloadable JSON results.
- Browser speech-input integration with availability and permission error handling.
- Electron shell with isolated preload, click-through desktop hand, and global speech shortcut.
- Reduced-motion support and optional completion sound.

## Prototype boundary

This is an **interactive local demo**, not a connected AI computer-use agent. The three task plans are deterministic and work on bundled sample data. No model/API key is required. Unknown requests show an explanation instead of inventing results. Sample tab grouping does not access your actual browser tabs, and the desktop companion visual does not control the operating system.

Results stay in local storage until you download them. The optional font request goes to Google Fonts; system sans-serif fonts are used offline. Speech recognition can send audio to the browser vendor's service.

## Demo script (about 60 seconds)

1. Say: “Meet THINGS. Your own little helping hand.”
2. Click **Find dinner inspiration**. The hand opens the recipe collection, filters by the actual dietary/time fields, selects three matches, and saves the shortlist.
3. Pause and resume to show that the user remains in control.
4. Download the result or open **Things done**.
5. In Electron, enable the desktop companion and move the pointer to show the hand following it.
6. Be explicit with judges: this build demonstrates the interaction design and local execution loop. Connecting a real reasoning model and computer-control adapter is the next milestone.

## Development

```sh
npm test       # Routing, dietary constraints, and corrupted storage cases
npm run build # Strict TypeScript check and production bundle
npm run preview
```

| File | Responsibility |
| --- | --- |
| `src/App.tsx` | Workspace, task executor, speech input, history and preferences |
| `src/engine.ts` | Explicit demo plans, sample data, persisted-data validation |
| `src/Hand.tsx` | Original stitched-hand vector character |
| `src/styles.css` | Responsive interface and character motion |
| `electron/main.cjs` | Desktop window, global shortcut and cursor companion |
| `electron/preload.cjs` | Narrow companion/shortcut bridge |

## Next milestone

Replace `createPlan()` with a real planner through a server-side agent adapter. Keep credentials out of the renderer and repository. Add a controlled browser/desktop execution adapter with observable actions, cancellation, and confirmation for consequential operations. Connect live task state to the desktop companion's poses. Package signed desktop installers once the agent loop is ready.

THINGS is an independent hackathon project and is not affiliated with Netflix, *Wednesday*, or the original Hands project.
