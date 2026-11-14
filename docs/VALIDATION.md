# Validation status — v0.7.0

## What was verified

- Real Poe requests using Claude-Sonnet-4.6 during development, including tool calls and actual public arXiv page navigation/abstract reading. This was not just a prerecorded chat response.
- Prerecorded spoken test commands passed through the production local speech-recognition and desktop-assistant submission flow. Live drafts and automatic submission were observed.
- An isolated production voice-UI regression test discarded simulated playback audio without sending a new user message, then accepted the next user utterance.
- An isolated browser test clicked a small target located from screenshot pixels, typed into a field, and confirmed the Windows mouse position stayed unchanged. This validates the browser input path, not arbitrary websites.
- Native desktop conflict-guard cases were tested with controlled Win32 state; full simultaneous-human native-app operation is not certified.
- 35 offline tests and the production build passed at handoff. Tests do not spend Poe credits.

## Not yet validated or guaranteed

The saved/default bot was changed to **gpt-4.1-mini** after expensive live testing was stopped. No paid end-to-end run was performed on this default afterward. Its successful completion rate, latency, and coordinate accuracy are **unverified**. The latest browser-local hand rendering change also needs a full live visual check.

Flight and food-site tests showed real clicks and field entry, but encountered retries/errors. An end-to-end correct flight comparison, booking, food order or X summary is not certified. No real booking, order, payment or publication was completed. Sites may demand login or block automation; models can misidentify controls. The app should report blockers rather than claim completion.

The app runs one task at a time and queues follow-ups. It has no macOS/Linux desktop adapter, parallel background agents, measured 14–40x speed claim, or integration with Jev/Pi. These claims must not be inferred from the inspiration video's pitch or an edited demo.

## Recording disclosure

Existing demo footage consists of separate task takes and time compression. Some earlier exports re-synchronized the hand layer from actual action logs. A video is not evidence of uninterrupted real-time task reliability or independent parallel workers. A requested new 2:30 video is **not completed in this source handoff**.

## Reviewer check

Use your own key, a compatible image-and-tool-capable Poe bot, and a small public-page task. Observe actual page changes, inspect the result and stop on errors. The tool-call connection check uses credits and only checks tool calling. Request caps protect against endless loops but are not a monetary billing guarantee.
