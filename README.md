# THINGS

**A little hand. A lot off your hands.**

A Windows hackathon prototype: speak a task, watch an original stitched-hand cursor operate a task browser, and receive a spoken response beside your desktop. Inspired by *Wednesday* and the voice-delegation concept in [Hands](https://github.com/lithdew/hands); the interface and character are original.

The [Hands reference demo and script](docs/references/hands/Hands-demo-script.md) include the original video link and timestamped captions.

## For hackathon reviewers

**Bring your own API key and image/tool-capable model. No developer credentials are included.**

For the Windows download, see [Releases](https://github.com/KennyHacrt/THINGS/releases). The portable build includes Python and the local speech model. Open the `.exe` and fill the first-launch connection form; no Node.js or Python installation is needed for that build.

Read the [Windows setup and first-task guide](docs/SETUP.md), then the [validation status and limitations](docs/VALIDATION.md).

```powershell
git clone https://github.com/KennyHacrt/THINGS.git
cd THINGS
npm ci
npm run desktop:setup
npm run desktop
```

Requires Windows 10/11, Node.js 22.6+ with npm, Python 3.11, a microphone, and internet access. Initial setup downloads dependencies and a local Whisper speech model. These prerequisites are for building from source. The Windows portable release bundles its runtime.

## Connect your own AI

1. On first launch, use the **Connect your AI** form on the desktop home screen. Later, select **AI connection**.
2. Generate your own key at [Poe API keys](https://poe.com/api/keys).
3. Choose Poe and enter that key and a Poe model/bot ID. The economical default is `gpt-4.1-mini`.
4. Click **Save connection**. **Test connection** is optional and makes a paid request to verify function calling.
5. Return to the desktop assistant and click **Start conversation**, or press **Ctrl + Shift + Space**.

A custom Poe bot can power THINGS only if it accepts screenshots and supports API function/tool calls. A text-only chatbot is insufficient. The connection test verifies tool calling, not end-to-end visual accuracy. Exact bot IDs are listed in [Poe's public model catalog](https://api.poe.com/v1/models).

Alternatively, choose **Custom — OpenAI-compatible API** and enter your provider’s HTTPS Base URL, model ID and matching key. See [provider compatibility](docs/PROVIDERS.md), including the unverified status of omg.dev and Habitect.ai. Data/MCP/sandbox APIs do not automatically work as model providers. Access to models is billed to the reviewer’s selected provider account; a chat subscription does not imply unlimited API usage.

## How it works

Local Whisper transcription produces a live draft. A pause submits your speech. The visual model receives task-window screenshots, chooses coordinate actions, and observes the result. The browser uses Chromium input rather than your Windows pointer. The hand visualizes the agent's own targets. Native desktop tools share Windows input, so detected focus/input conflicts pause the task and notify you.

THINGS suspends recognition while speaking, discards in-flight transcripts, waits for a short echo tail, then resumes listening. Additional spoken requests are queued: **one computer task runs at a time**. Say **stop**, **pause**, or **resume**. **Ctrl + Alt + Space** stops work globally.

## Cost and privacy

- You supply your own key through the local settings UI. Do not commit it or send it to the project author.
- Electron `safeStorage` encrypts the key for your OS account in the app's user-data folder. It is never returned to the renderer. No `.env` key is required.
- Voice audio is transcribed locally. Recognized text, conversation context and task-window screenshots are sent to the selected model provider.
- Each task is limited to **20 AI requests**, including action checks. Each app process is limited to **30 total requests**. Requests stop before exceeding either cap; restarting the app resets the process cap.
- Planning output is limited to 700 tokens, action-check output to 80. Only the latest screenshot is retained in context. There is no automatic switch to a premium model.
- These are request limits, **not a guaranteed monetary spending cap**. Actual cost depends on Poe's token billing and chosen bot. Model quality and latency vary.

## Current status

This is a functioning prototype with verified real AI calls, local speech transcription and computer input, but **not a fully reliable general desktop employee**. Full booking/ordering workflows are not certified. Sites can block automation, require login, or produce incorrect coordinate choices. Review the [validation notes](docs/VALIDATION.md) before presenting it as a live system.

Final purchases/bookings/orders, sending/publishing, deletion, private uploads and access changes require confirmation. Passwords, payment details, terminals, elevated/security windows, CAPTCHA bypass and arbitrary shell execution are outside the tool scope. Existing personal browser windows are not attached automatically. macOS/Linux desktop support and parallel agents are not implemented. Demo recordings may contain separate takes, time compression and cursor-layer synchronization; they are not real-time speed benchmarks.

## Development

```powershell
npm test
npm run build
```

`npm run dev` is a sample-only web preview. It cannot run the Electron AI/voice/desktop bridge. The sample tasks use local example data and need no API key.

THINGS is independent and is not affiliated with Poe, Netflix, *Wednesday*, or the original Hands project.
