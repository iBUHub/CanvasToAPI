> If you want to try the integrated deployment, please use the [integrated branch](https://github.com/iBUHub/CanvasToAPI/tree/integrated). Also, Gemini cookies expire quickly.

# Gemini Canvas to API Adapter

[中文文档](README.md) | English

A tool that exposes a Gemini web session as OpenAI API, Gemini API, and Anthropic API compatible endpoints. The server provides the API layer and request routing, while the actual browser session must now be connected manually by opening a specific Gemini share page.

## ✨ Features

- 🔄 **API Compatibility**: Compatible with OpenAI API, Gemini API, and Anthropic API formats
- 🌐 **Model Support**: Supports Gemini 3 Flash Preview with near-unlimited usage
- 🔁 **Multi-Session Scheduling**: Supports multiple connected browser sessions with round-robin or random selection
- 🔧 **Tool Calls Support**: OpenAI, Gemini, and Anthropic endpoints support Tool Calls (Function Calling)
- 📊 **Visual Console**: Includes status, logs, and runtime switches for easier operations

## 🚀 Quick Start

### 💻 Run Directly (Windows / macOS / Linux)

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/iBUHub/CanvasToAPI.git
   cd CanvasToAPI
   npm install
   ```

2. Configure environment variables:

   ```bash
   cp .env.example .env
   ```

   At minimum, set:

   ```env
   API_KEYS=your-api-key
   ```

3. Start the service:

   ```bash
   npm start
   ```

4. Open the console:

   Visit `http://localhost:7861` and log in with `API_KEYS` or your configured console credentials.

5. Manually connect a browser session:

   Open this page in the browser that should carry the Gemini session:

   [https://gemini.google.com/share/a106ab8dac80](https://gemini.google.com/share/a106ab8dac80)

   The actual page content is also available in the repository at [scripts/client/canvas.html](scripts/client/canvas.html).

   Fill in:
   - `Server WS Endpoint`: for example `ws://127.0.0.1:7861/ws` for local use, or your public server WebSocket address for remote deployments
   - `API Key`: enter the same key you use for API requests
   - `Browser Identifier`: an optional browser tag; if left blank, the page auto-generates a daily identifier

   Then click `Connect`. Once connected, confirm that `Browser Sessions` shows at least one online session in the status page.

6. Start sending API requests:

   The server can only process requests when at least one browser session is online.

> ⚠ **Note:**
> The old `npm run setup-auth`, `auth-N.json`, VNC login, and auth upload flow described in earlier versions no longer applies.

> 💡 **Tip:**
> If the server is deployed remotely, the browser that opens the share page only needs to reach the HTTP port (`PORT`). Browser-session WebSocket traffic now reuses the same port through the `/ws` path.

### 🐋 Docker Deployment

#### 🎮️ Option 1: Docker Command

```bash
docker run -d \
  --name canvas-to-api \
  -p 7861:7861 \
  -e API_KEYS=your-api-key \
  -e TZ=America/New_York \
  --restart unless-stopped \
  ghcr.io/ibuhub/canvas-to-api:latest
```

> 💡 **Tip:** If `ghcr.io` is slow or unavailable, you can use the Docker Hub image: `ibuhub/canvas-to-api:latest`.

Parameters:

- `-p 7861:7861`: HTTP API and web console port
- `-e API_KEYS`: API and console access key
- `-e TZ=America/New_York`: Time zone for logs and UI timestamps (optional)

#### 📦 Option 2: Docker Compose

Create `docker-compose.yml`:

```yaml
name: canvas-to-api

services:
  app:
    image: ghcr.io/ibuhub/canvas-to-api:latest
    container_name: canvas-to-api
    ports:
      - 7861:7861
    restart: unless-stopped
    environment:
      API_KEYS: your-api-key
      TZ: America/New_York
```

#### 🛠️ Option 3: Build from Source

If you prefer to build the Docker image yourself, use the following commands:

1. Build the image:

   ```bash
   docker build -t canvas-to-api .
   ```

2. Run the container:

   ```bash
   docker run -d \
     --name canvas-to-api \
     -p 7861:7861 \
     -e API_KEYS=your-api-key \
     -e TZ=America/New_York \
     --restart unless-stopped \
     canvas-to-api
   ```

#### 🔌 Step 2: Connect a Browser Session

After the container starts, you still need to manually open the following page and connect a browser session:

[https://gemini.google.com/share/a106ab8dac80](https://gemini.google.com/share/a106ab8dac80)

On that page, manually enter the browser tag (`Browser Identifier`), API key, and the server WebSocket address (`Server WS Endpoint`), for example `ws://your-host:7861/ws` or `wss://your-host/ws`. The API key should be the same one you use for API requests. Once the browser session is connected, the status page will show it as online and the API can begin forwarding requests.

#### 🌐 Step 3 (Optional): Nginx Reverse Proxy

If you need to access the service through a domain name or put it behind a reverse proxy, you can use Nginx.

> [!IMPORTANT]
> If you need to connect to a non-local server from the browser, you must enable HTTPS reverse proxying for the server and expose a `wss://` endpoint through Nginx.
> Also make sure your Nginx config forwards WebSocket upgrade headers, including `proxy_http_version 1.1`, `proxy_set_header Upgrade $http_upgrade`, and `proxy_set_header Connection "Upgrade"`.
>
> 📖 For detailed Nginx configuration instructions, see: [Nginx Reverse Proxy Configuration](docs/en/nginx-setup.md)

### 🐾 Claw Cloud Run Deployment

Deploy directly on Claw Cloud Run, a fully managed container platform.

> 📖 For detailed deployment instructions, see: [Deploy on Claw Cloud Run](docs/en/claw-cloud-run.md)

## 📗 API Usage

### 🤖 OpenAI-Compatible API

- `GET /v1/models`: List models.
- `POST /v1/chat/completions`: Chat completion and image generation, supports non-streaming, real streaming, and fake streaming.
- `POST /v1/responses`: OpenAI Responses API compatible endpoint for conversation generation, does not support image generation, and supports non-streaming, real streaming, and fake streaming.
- `POST /v1/responses/input_tokens`: Count input tokens for an OpenAI Responses API request.

### ♊ Gemini Native API Format

- `GET /v1beta/models`: List available Gemini models.
- `POST /v1beta/models/{model_name}:generateContent`: Generate content, images, and speech.
- `POST /v1beta/models/{model_name}:streamGenerateContent`: Stream content, images, and speech, supporting real and fake streaming.

### 🧠 Anthropic-Compatible API

- `GET /v1/models`: List models.
- `POST /v1/messages`: Chat message completions, supports non-streaming, real streaming, and fake streaming.
- `POST /v1/messages/count_tokens`: Count tokens in messages.

> 📖 For detailed API usage examples, see: [API Usage Examples](docs/en/api-examples.md)

## 🧰 Configuration

### 🔧 Environment Variables

#### 📱 Application Configuration

| Variable                    | Description                                                                                                                                             | Default              |
| :-------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------- |
| `API_KEYS`                  | Comma-separated API keys used for API authentication; also used as the default console login secret when no dedicated console credentials are provided. | `123456`             |
| `WEB_CONSOLE_USERNAME`      | Username for web console login (optional). If set together with password, both are required.                                                            | None                 |
| `WEB_CONSOLE_PASSWORD`      | Password for web console login (optional). If only this is set, the console asks for password only. Otherwise it falls back to `API_KEYS`.              | None                 |
| `PORT`                      | HTTP API and web console port.                                                                                                                          | `7861`               |
| `HOST`                      | Listening address for both HTTP and WebSocket services.                                                                                                 | `0.0.0.0`            |
| `ICON_URL`                  | Custom favicon URL for the console. Supports ICO, PNG, SVG, etc.                                                                                        | `/AIStudio_logo.svg` |
| `SECURE_COOKIES`            | Enable secure cookies for HTTPS-only console sessions.                                                                                                  | `false`              |
| `RATE_LIMIT_MAX_ATTEMPTS`   | Maximum failed console login attempts allowed in the rate-limit window. Set `0` to disable.                                                             | `5`                  |
| `RATE_LIMIT_WINDOW_MINUTES` | Time window for failed login attempts, in minutes.                                                                                                      | `15`                 |
| `CHECK_UPDATE`              | Whether the web console should check for a newer release. Set `false` to disable.                                                                       | `true`               |
| `LOG_LEVEL`                 | Log level. Supported values: `INFO`, `DEBUG`.                                                                                                           | `INFO`               |
| `TZ`                        | Time zone used for logs and UI timestamps, for example `America/New_York`.                                                                              | System time zone     |

#### 🌐 Proxy Configuration

| Variable                  | Description                                                                                                                     | Default |
| :------------------------ | :------------------------------------------------------------------------------------------------------------------------------ | :------ |
| `ROUND`                   | Session selection strategy. Supported values: `round` and `random`.                                                             | `round` |
| `SESSION_ERROR_THRESHOLD` | Automatically disable a browser session after this many accumulated browser / WebSocket errors. Set to `0` to never disable it. | `3`     |
| `MAX_RETRIES`             | Maximum number of retries for a failed request.                                                                                 | `3`     |
| `RETRY_DELAY`             | Delay between retries in milliseconds.                                                                                          | `2000`  |

#### 🗒️ Other Configuration

| Variable            | Description                                                                                                                                       | Default |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------ | :------ |
| `STREAMING_MODE`    | Streaming mode. `real` for real streaming, `fake` for buffered/fake streaming. Based on current testing, real streaming may cause request errors. | `fake`  |
| `FORCE_THINKING`    | Force-enable thinking mode for all requests.                                                                                                      | `false` |
| `FORCE_WEB_SEARCH`  | Force-enable web search for all requests. Based on current testing, enabling it may cause request errors.                                         | `false` |
| `FORCE_URL_CONTEXT` | Force-enable URL context for all requests.                                                                                                        | `false` |

### 🔌 Browser Session Connection

The current version no longer uses local `auth` files or a `setup-auth` bootstrap script. The correct flow is:

1. Start the server and make sure `PORT` is reachable from the browser that will carry the session.
2. Open the console and check the browser-session endpoint and connection status.
3. Open [https://gemini.google.com/share/a106ab8dac80](https://gemini.google.com/share/a106ab8dac80) in a browser.
4. Enter the browser identifier (`Browser Identifier`), API key, and the server WebSocket endpoint (`Server WS Endpoint`) on that page.
5. Use the same API key that you use for API requests. For local deployments, `Server WS Endpoint` can be `ws://127.0.0.1:7861/ws`. If the console is accessed through `https://` on a remote server, it should be `wss://your-domain-or-public-address/ws`.
6. Wait until the status page shows at least one online browser session before sending API traffic.

### 🧠 Model List Configuration

Edit `configs/models.json` to customize the available models and their settings.

> 💡 **Tip:** Thinking level can be overridden via the model suffix. Append `-THINKING_LEVEL` or `(THINKING_LEVEL)` to the model name, where `THINKING_LEVEL` can be `high`, `medium`, `low`, or `minimal`. Example: `gemini-3-flash-preview(minimal)` or `gemini-3-flash-preview-minimal`.
>
> Streaming mode can also be overridden by appending `-real` or `-fake` to the end of the model name. This override has higher priority than the system streaming mode, but it only takes effect for streaming requests. For example: `gemini-3-flash-preview-fake`. When used together, the streaming suffix must be last, for example: `gemini-3-flash-preview-minimal-fake` or `gemini-3-flash-preview(minimal)-real`.

## 📄 License

This project is based on [**iBUHub/AIStudioToAPI**](https://github.com/iBUHub/AIStudioToAPI) and uses the CC BY-NC 4.0 license. All usage, distribution, and modification must comply with the license terms. See [LICENSE](LICENSE) for the full text.

## 🤝 Contributors

[![Contributors](https://contrib.rocks/image?repo=iBUHub/CanvasToAPI)](https://github.com/iBUHub/CanvasToAPI/graphs/contributors)

Thanks to everyone who has contributed time, effort, and ideas to this project.

---

If you find CanvasToAPI useful, consider giving it a ⭐️!

[![Star History Chart](https://api.star-history.com/svg?repos=iBUHub/CanvasToAPI&type=date&legend=top-left)](https://www.star-history.com/#iBUHub/CanvasToAPI&type=date&legend=top-left)

## Community Support

Learn AI, go to L Station
[LinuxDO](https://linux.do)
