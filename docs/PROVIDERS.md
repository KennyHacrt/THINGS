# Bring your own AI provider

THINGS supports Poe and HTTPS APIs that implement the OpenAI Chat Completions request/response format. This adapter is not proof that every service offering an API key is compatible.

## First launch

The desktop home screen opens an **AI connection** form when no key is configured. Choose Poe or **Custom — OpenAI-compatible API**, enter your key and exact model ID, and save. For custom providers, enter their documented base URL, such as `https://your-provider.example/v1`. THINGS sends requests to `/chat/completions` beneath that URL using Bearer authorization. A full URL ending in `/chat/completions` is also normalized correctly.

Saving is local and makes no API call. **Test (uses credits)** is optional. It checks function calling; a small visual task is still required to validate image input and coordinate accuracy. There is no premium fallback.

The form shows the destination receiving task text and screenshots. Keys are encrypted for the Windows account, are never returned to the renderer, and are bound to the chosen endpoint. Changing the endpoint requires its own key. Redirects are not followed. Do not enter another service's key hoping it will work.

## Required protocol

The endpoint must accept `model`, `messages` including image data URLs, `tools`, `tool_choice`, `max_tokens` and `stream: false`, and return `choices[0].message` with content or standard structured `tool_calls`. A useful model must support both images and tool use. Model IDs may include a provider prefix such as `team/model-id`.

Data-only REST APIs, MCP servers, coding-session APIs, cloud sandbox APIs and ordinary web-chat login tokens are not substitutes for this model endpoint. A service with a different protocol needs a dedicated adapter; do not guess an endpoint.

## omg.dev

The [official site](https://omg.dev/) and [official repository](https://github.com/BennyKok/omg.dev) describe coding-agent orchestration and cloud computers. Its [hosted MCP documentation](https://omg.dev/blog/claude-code-omg-mcp) describes a separate OAuth/MCP service. We did not find a documented image-and-tool-capable Chat Completions endpoint that can power THINGS directly.

**Status: no direct omg.dev integration is claimed.** If the organiser provides an OpenAI-compatible model gateway, use its documented URL, model ID and matching key in Custom API. An omg.dev account or sandbox key alone does not establish compatibility. Do not paste it into Poe settings.

## Habitect.ai

The [official website](https://habitect.ai/) redirected to its sign-in page during review. We did not find public inference API documentation, a model catalog or a verified Chat Completions endpoint. No account was created or signed into for this investigation.

**Status: not verified.** Ask its team for the authentication method, model ID, image/tool-call support and API specification. If they provide the compatible protocol above, Custom API can be used. Otherwise a dedicated integration is required. No made-up default Habitect URL or model is included.

## Review and billing

Mocked-provider tests verify endpoint routing, tool/image payloads and credential separation. No paid request to omg.dev, Habitect.ai or a new provider was made. The default `gpt-4.1-mini` has not had a full paid live rerun. Existing task/session call caps apply to all providers and are not a guaranteed dollar budget.
