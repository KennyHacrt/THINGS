# THINGS: security and privacy Q&A

Prepared for the November 2026 hackathon pitch. These answers describe the v0.7.0 prototype, not a security certification. Check implementation and docs/VALIDATION.md before reusing them for a later version. The model-based action gate can misclassify an action. Do not promise complete safety, automatic PII redaction or zero provider retention.

## AI can make mistakes. How do you prevent dangerous actions?

We assume the model can make mistakes. It proposes an action, but our application controls whether that action can execute. We validate the tool arguments, coordinates and screenshot reference, and we have an action gate that can allow, block or request approval. Sensitive actions should pause for confirmation. These controls reduce risk, although we haven’t proved that they catch every dangerous action.

For example, searching for flights can run automatically, while committing to a booking should require approval.

## Does another AI checking the first AI really make it safe?

That’s a fair concern. Our action gate also uses a model, so it can make mistakes too. We combine it with checks in application code, including restricted tools, coordinate bounds and rejection of outdated screenshots. Before a wider release, we’d strengthen the high-risk restrictions with deterministic policies, so those decisions depend less on model judgement.

## How does your architecture help with security?

The model doesn’t receive a general-purpose shell or direct access to our application code. It receives a limited set of tools, and the Electron controller validates requests before passing them to the browser or Windows input adapter. That separation gives us a place to enforce restrictions, request approval and stop execution, even when the model proposes something inappropriate.

Model proposes → controller checks → adapter executes → screenshot shows the result.

## What monitoring do you have?

The agent produces events for proposed actions, approvals, observations and errors. After an action, it captures the resulting screen so it can check what happened. Users can follow the hand and pause or stop the task, including through a global shortcut. However, that observation loop isn’t proof that every result is correct, and we don’t yet have a production security audit dashboard.

Stopping prevents further actions, but it doesn’t automatically undo an action that already happened. That’s why checking before a sensitive action matters.

## Can the AI see my personal information?

Yes, if personal information is visible in the task-window screenshot, it can reach the selected model provider. We limit capture to the task window, and speech transcription happens locally, but task text and screenshots leave the device. We don’t yet have automatic personal-information redaction, so we wouldn’t recommend using the prototype with confidential records.

## Does the provider store the data or use it for training?

That depends on the provider and the model endpoint the user chooses. Bringing your own API key gives you control over that choice, but it doesn’t automatically guarantee privacy. We can’t promise zero retention or no training across every compatible provider. For an organisation, we’d need to verify those terms before enabling sensitive workflows.

## What if a malicious website tells the agent to ignore the user?

That’s a prompt-injection risk. We tell the agent to treat webpage content as untrusted information, and we check proposed input actions before execution. However, instructions and a model-based gate don’t eliminate that risk. Stronger protection would include approved-site restrictions and controls over where the agent can send data.

## How do you protect API keys?

Users enter their own key through local settings. We encrypt the stored key using Electron’s safeStorage, tied to their Windows account, and keep it out of the webpage interface and model messages. That protects the stored credential, although it doesn’t protect against every threat on an already compromised computer.

## Would you trust it to handle banking or medical information today?

No, we wouldn’t recommend those uses for the current prototype. We’re starting with lower-risk tasks such as public research and travel searches. Sensitive deployment would require stronger permission controls, privacy filtering and adversarial testing. We’d want evidence from those tests before asking users to trust it with higher-risk work.

## One answer if time is short

We assume the AI can make mistakes, so we restrict its tools, validate actions in the application and request approval when an action could have a serious consequence. Users can also monitor and stop the task. For privacy, speech recognition runs locally, but task screenshots go to the chosen model provider, so visible personal information remains a risk. This is a prototype, and stronger policy enforcement and privacy filtering are important next steps.

## Supporting references

- [OWASP AI Agent Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html)
- ../../electron/agent.cjs
- ../../electron/vision-policy.cjs
- ../../electron/vision-tools.cjs
- ../../electron/key-store.cjs
- ../VALIDATION.md
