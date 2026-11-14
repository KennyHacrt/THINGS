# Changes

## 0.4.0

- Added a real Poe visual agent: screenshots, model-selected coordinates, input, and fresh screenshot verification.
- Added scoped browser and Windows control, encrypted local credentials, live task screenshots, pause/resume/stop, and result history.
- Routine actions run automatically; final commitments require approval through a separate visual action check.
- Added stale-frame and geometry checks, reliable Windows focus, and software-rendered browser capture.
- Added the Ctrl/Cmd + Alt + Space emergency stop shortcut.

Validation: 20 automated tests and production build; live Poe research opened three actual arXiv paper pages; screenshot-coordinate Calculator clicks produced 7 + 5 = 12. No ticket purchase or payment flow has been tested.


## 0.2.0

- Added a compact desktop quick-task window, summoned with Ctrl/Cmd + Shift + Space.
- Added an optional pointing-hand cursor inside THINGS with a distinct tap gesture.
- Connected desktop-companion poses and status labels to the live task state, and added pointer-motion walking.
- Added Markdown notes and dated calendar exports with five local-time events.
- Added single-instance desktop handling and narrowed IPC validation.
- Added calendar validity and note-content tests (7 tests in total).
- Completed the repository source upload, including Electron, favicon, tests, and CI.

This build still uses bundled sample data and deterministic task plans. An AI planner and external computer-control adapter are not connected.

Verification: production build, 7 automated tests, Electron source syntax checks, browser hand-cursor preference, completed afternoon workflow, and actual `.ics` download. The desktop main and quick-task windows were visually inspected. End-to-end quick-task dispatch and live companion synchronization require a further desktop check; that UI verification was interrupted by the automation timeout.
