# THINGS

**A little hand. A lot off your hands.**

THINGS is an original Windows desktop companion with a real Poe-powered visual agent, a task browser, screenshot-based Windows control, and an animated stitched hand. The interface, vector character, animations, and implementation are original. The concept is inspired by the helping hand in *Wednesday* and the voice-delegation idea in [Hands](https://github.com/lithdew/hands).

## Run

Requires Node.js 22.6+ and npm. Windows desktop tools also require Python 3.11+.

```sh
npm ci
npm run desktop:setup
npm run desktop
```

`desktop:setup` installs pywin32 and faster-whisper into the ignored project-local `.desktop-env`, then downloads the multilingual Whisper base speech model into `.things-local/models` (internet required once). Browser tasks work without Python; local voice recognition and Windows desktop control require this setup. Windows desktop support is not available on macOS/Linux.

For the sample-only browser preview, use `npm run dev` and open http://127.0.0.1:5173. Real AI tools and credential settings run in Electron's main process and are unavailable in an ordinary browser.

## Connect Poe

Open **Make it yours → A little intelligence**. Enter your Poe API key and a tool-capable Poe bot name (default: `Claude-Sonnet-4.6`), then **Save connection** and **Test connection**. The test verifies an actual function call, not merely an HTTP success.

Credentials are encrypted with Electron `safeStorage` using the current OS user, stored in the application's user-data directory, and never returned to the renderer. The API endpoint is fixed to `https://api.poe.com/v1/chat/completions`. No API key belongs in `.env`, source, GitHub, or a screenshot.

## Desktop conversation

THINGS starts as a small, always-on-top assistant at the bottom right of the Windows desktop. The workspace is available through Settings/history and the tray; it does not need to stay open.

Press **Ctrl + Shift + Space** or choose **Start conversation** once. The microphone stays active until you mute it. A live waveform follows microphone level. Local partial transcription revises a visible draft while you speak; a short pause submits the final text automatically. The assistant replies in the conversation, speaks a short response, and continues working. You can speak again while a task runs; additional requests are queued. Say **stop**, **pause**, or **resume**, or use the visible controls. This build runs one computer task at a time; separate video takes must not be presented as a parallel-task benchmark.

The original stitched hand follows the real Windows pointer and changes pose during input. Browser coordinate actions also move the real pointer before clicking. Existing personal browsers are not attached automatically. For an explicitly supplied demo Chrome window, the Windows build accepts `--things-browser-hwnd=<HWND>`; this authorizes only that exact Chrome window. The optional `--listen` flag starts a requested voice session immediately. Keep unrelated tabs out of that window. Screenshots use a window-scoped Win32 capture; they do not capture the whole monitor or depend on accessibility trees.

## Real tasks

1. Choose **Real tasks** and select **Browser**, **Desktop**, or **Both**.
2. For desktop work, use a task-specific fresh Notepad/Calculator, or explicitly choose an existing supported window.
3. Allow screenshot sharing with Poe for tasks in this session. Only the task browser or selected desktop window is captured while executing a task; turn sharing off any time between tasks.
4. Speak a task with the microphone button, or press **Ctrl/Cmd + Shift + Space** to open a shortcut window that listens immediately. A short silence ends recording; local speech recognition transcribes it and automatically starts the task. No typing or Send click is required. Text input remains an optional fallback. Recording ends after 30 seconds, or after 9 seconds without speech.
5. THINGS captures the current window, sends the screenshot to the visual model, executes the returned coordinate action, captures the result, and repeats for up to 36 decisions. The latest screenshot is visible under **Thing’s view**.
6. Routine searching, navigation, clicking, filters, dates, form fields, note writing and scrolling run automatically. A separate visual action gate checks proposed inputs. Final purchases/bookings, sending/publishing, deletion, private uploads and access changes require confirmation. Uncertain actions also pause for confirmation.
7. Pause/resume or stop from the task controls. Save the final result as Markdown. Completed real-task summaries have a separate local history.

Examples:

- “Open https://example.com and explain its purpose using the page contents.”
- “Search the web for the official Python documentation and summarize what it covers.”
- “Open a fresh Notepad, write a short hackathon introduction, then inspect the editor to verify it. Leave it open.”
- “Inspect the selected Calculator window and help me calculate 137 times 24.”

The task browser has an isolated session and does not attach to your existing Chrome or Edge tabs. The visual model reads screenshots and chooses pixel coordinates; Chromium input events perform the actions. Every screenshot has a frame ID and dimensions. Out-of-bounds coordinates, stale frames and changed page/window geometry are rejected. There is no model-provided JavaScript execution tool. Password input, file downloads, popup windows and browser permissions are unavailable to the agent. Local/private URL literals and credential-bearing URLs are rejected. A software rendering path and Chromium capture fallback keep browser screenshots working on Windows GPU drivers.

Desktop tools capture the selected application's window with a window-scoped Win32 renderer, then map screenshot coordinates to its visible physical bounds for Win32 input. They do not rely on an accessibility element tree. A fresh Notepad task opens a uniquely named file under the ignored `.things-local/notes` directory. If you switch away from that note, the task refuses to continue on another note. Existing windows require explicit selection. Screenshots can include any other visible tabs or content within the selected app; choose the intended window before sharing. Terminal, password-manager and security apps remain outside the desktop adapter's scope. External Chrome requires explicit selection as described above.

## Your little hand

- **Make it yours → Desktop companion** enables the transparent, click-through hand following your cursor. It reflects live thinking, input, approval, paused, stopped, and finished states.
- **Hand cursor** replaces the pointer inside THINGS with an original pointing/tapping character.
- **Ctrl/Cmd + Shift + Space** opens a compact quick-task window. Its requests route to the real agent in the main workspace. It listens immediately and submits recognized speech automatically. A running task cannot be replaced by a quick task.
- **Ctrl/Cmd + Alt + Space** stops the running agent from any application.
- Character motion respects reduced-motion settings; completion sound is optional.
- Closing the settings workspace hides it. Use **Quit THINGS** from the tray to stop tasks and exit; other desktop apps are left open.

## Sample demo mode

**Sample demo** preserves the three deterministic local demos (vegetarian dinners, sample tab grouping, and an afternoon schedule). Sample actions update real local UI state, but do not access your actual tabs or calendar. Export sample results as JSON/Markdown, or import an afternoon `.ics` file into your calendar manually. Sample mode needs no API key.

## Limits

This is a hackathon prototype, not an unrestricted OS agent. It cannot operate elevated windows, authentication dialogs, arbitrary installed programs, shell commands, payments, account changes, software installation, security settings, or destructive actions. AI decisions can still be wrong; action approval and observation are part of the interaction. Some websites block automation or require manual login. Voice requires an available microphone and permission to capture audio. Audio is transcribed locally by faster-whisper and is not uploaded; recognized task text and selected-window screenshots go to Poe. The base model can mishear names and accents; inspect the visible transcript and stop if needed. The microphone runs only after the user opens the shortcut or presses its button. The optional font request goes to Google Fonts.

## Development

```sh
npm test
npm run build
```

`electron/agent.cjs` owns the screenshot/model/action loop. `vision-tools.cjs` captures browser/desktop frames and maps coordinate actions. `vision-policy.cjs` checks input risk. `poe.cjs` handles the fixed-endpoint provider connection; `key-store.cjs` owns encrypted credential storage. `browser.cjs` creates the isolated task browser. `desktop-tools.cjs` manages the bounded JSON-lines Win32 worker in `screen_worker.py`. `src/LiveAgent.tsx` renders task scope, live screenshots, approvals, observations, results, and history. `voice.cjs` and `voice_worker.py` run local, in-memory speech transcription; `src/voice.ts` captures PCM, detects a pause, and automatically hands the transcript to the real task flow. Original sample mode lives in `src/engine.ts` and `src/App.tsx`.

THINGS is independent and is not affiliated with Poe, Netflix, *Wednesday*, or the original Hands project.
