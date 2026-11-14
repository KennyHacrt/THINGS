# Reviewer setup (Windows)

## 1. Prerequisites

Install Node.js 22.6 or newer, npm, and Python 3.11. In a new PowerShell window check:

```powershell
node --version
npm --version
python --version
```

If Windows opens the Microsoft Store instead of Python, install Python and make sure `python` resolves to it. Python 3.11 is the development baseline; other versions may need different native wheels.

## 2. Install and launch

```powershell
git clone https://github.com/KennyHacrt/THINGS.git
cd THINGS
npm ci
npm run desktop:setup
npm run desktop
```

Keep this terminal open while using the app. The Python virtual environment is created in `.desktop-env`; local Whisper model data is stored under `.things-local/models`. The first setup needs internet and can take several minutes. Browser-only operation can run without the Python setup, but microphone transcription and native Windows tools cannot.

No local project files, caches, recordings, model files or credentials from the developer's laptop are needed. Do not copy someone else's app-data folder.

## 3. Use your own Poe account and bot

1. Open [Poe API keys](https://poe.com/api/keys) and generate your own API key. Review your account's available API balance.
2. In THINGS, click the small **sliders/settings icon** at the top right of the desktop assistant. In the settings workspace find **A little intelligence**.
3. Set **Poe model / bot name** to `gpt-4.1-mini`, or another exact compatible bot ID.
4. Paste **your own** Poe API key into the password field and click **Save connection**. The field is cleared after saving.
5. Optionally press **Test connection (uses credits)**. This checks whether the bot returns a function call. It does not verify screenshot accuracy or task success.
6. Close the settings workspace to return to the assistant. Its tray menu can reopen settings/history.

### Can I use my own custom bot?

Yes, if your bot is available through Poe's API, accepts image input, and returns the requested structured function/tool calls. Enter its exact bot ID in the same model field and use your own Poe key. Ordinary chat-only or text-only bots cannot control THINGS. If the tool check fails, select a bot that supports these capabilities; do not assume a chat reply means tools are working. No automatic premium-model fallback is used.

The provider is Poe only in this release. A direct key from another AI provider is not interchangeable with a Poe key. The repo owner does not receive your key or pay for your requests.

## 4. First task

Click **Start conversation** or press **Ctrl + Shift + Space** and allow microphone access. Speak clearly:

> Open arxiv.org. Use its search box to search for retrieval augmented generation. Open one relevant abstract and give me its title and link. Do not download anything.

The draft changes as you speak, then a pause submits it automatically. Look for an actual task-browser window and visible page changes. A text answer alone is not proof that the computer task succeeded. Verify the page and final source URL.

For a smaller initial check, say:

> Open example.com and tell me the heading on that page.

The latest economical default has not had a full paid live workflow rerun; see [validation status](VALIDATION.md). If the model misses a control, stop and retry a smaller task. A fresh screenshot is needed after window/page changes.

## 5. Controls and limits

- **Mute conversation** stops listening. Recognition is suspended automatically while THINGS speaks.
- Say **stop**, **pause**, or **resume**, or use the visible controls.
- **Ctrl + Alt + Space** stops the agent globally.
- Use **Quit THINGS** from the tray to exit. Closing the settings workspace hides it.
- Additional requests queue behind the current task; there are no simultaneous independent agents.
- Browser actions use separate input. Native desktop actions pause if the user is active or another window has focus; focus the task window and resume when ready.
- A task can use at most 20 provider calls, and one app process at most 30, including visual safety checks and connection tests. Reaching the cap stops requests. These are not dollar limits. Do not repeatedly restart to work around them unintentionally.

## Troubleshooting

- **No microphone/transcript:** check the selected recording device, Windows microphone permission and `npm run desktop:setup` completion. Whisper base can mishear names/accents; inspect the draft.
- **No key/configured connection:** enter a Poe key locally and save it. The app does not include a shared developer key.
- **401:** Poe rejected the key. **402:** API balance is insufficient. **404:** check the exact bot ID. **429:** rate limited; wait rather than repeatedly retrying.
- **Tool check fails:** this bot is not returning function calls. Select a compatible image-and-tool-capable bot.
- **Login/CAPTCHA/site block:** handle manually or use another public source. THINGS must not bypass security controls.
- **AI call limit reached:** the task stopped to protect credits. Review progress before starting another session.
- **Only a website preview appears:** run `npm run desktop`, not just `npm run dev`.

## Key storage

The encrypted key is stored in the current Windows user's Electron app-data folder, normally `%APPDATA%\things-companion\poe-settings.json`. It is outside the repo and is protected by OS-account encryption. Replacing the key in Settings updates it locally. Do not publish that file, screenshots of keys, `.env` files or private task captures. You can revoke a key in Poe's API-key page.
