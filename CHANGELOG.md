# Changes

## 0.6.0

- Replaced the default workspace launch with a compact desktop conversation panel and tray entry. Settings and history stay available.
- Added continuous voice sessions, local live draft revisions, audio-level waveforms, spoken replies, conversation context, and queued follow-ups.
- Added bounded model-input spelling normalization and an explicit screenshot-ID requirement.
- Added exact-window opt-in for the user-provided Chrome, window-scoped Win32 screenshots, and smooth real-pointer movement.
- Kept final commitments behind approval. The script-aligned demonstration uses separate search/preparation takes, with no bookings, orders, payments or user-file operations.


## 0.5.0

- Added local Whisper speech input with pause detection and automatic task submission.
- The global quick-task shortcut now starts listening immediately; typing and Send are optional.
- Added bounded 30-second PCM capture, microphone error states, local model setup, and recognizer shutdown.
- Added source links to real-task results.

Validation: 22 tests and production build; a prerecorded spoken research request passed through the production microphone capture, pause detection, local transcription and automatic task dispatch, then the real Poe agent opened three arXiv pages and returned summaries with links. The recorded command was synthetic audio provided through Chromium's test microphone, not a physical-microphone recording. Physical microphone acoustics and non-English recognition have not been verified.


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
