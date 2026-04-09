> 如果想尝试一体化部署，请使用 [integrated 分支](https://github.com/iBUHub/CanvasToAPI/tree/integrated)；另外 Gemini cookie 过期很快。

# Gemini Canvas to API Adapter

中文文档 | [English](README_EN.md)

一个将 Gemini 网页会话封装为兼容 OpenAI API、Gemini API 和 Anthropic API 的工具。服务端负责提供 API 接口和请求调度，实际浏览器会话需要由用户手动打开指定 Gemini 分享页，与服务端建立连接后才能处理请求。

## ✨ 功能特性

- 🔄 **API 兼容性**：同时兼容 OpenAI API、Gemini API 和 Anthropic API 格式
- 🌐 **模型支持**：支持 Gemini 3 Flash Preview，几乎无上限调用
- 🔁 **多会话调度**：支持多个浏览器会话同时连接，按轮询或随机策略分配请求
- 🔧 **支持工具调用**：OpenAI、Gemini 和 Anthropic 接口均支持 Tool Calls (Function Calling)
- 📊 **可视化控制台**：提供状态页、日志页和在线配置开关，方便观察服务运行状态

## 🚀 快速开始

### 💻 直接运行（Windows / macOS / Linux）

1. 克隆仓库并安装依赖：

   ```bash
   git clone https://github.com/iBUHub/CanvasToAPI.git
   cd CanvasToAPI
   npm install
   ```

2. 配置环境变量：

   ```bash
   cp .env.example .env
   ```

   至少建议设置：

   ```env
   API_KEYS=your-api-key
   ```

3. 启动服务：

   ```bash
   npm start
   ```

4. 打开控制台：

   访问 `http://localhost:7861`，使用 `API_KEYS`（或你配置的控制台账号密码）登录。

5. 手动建立浏览器会话：

   在需要承载 Gemini 会话的浏览器中打开：

   [https://gemini.google.com/share/a106ab8dac80](https://gemini.google.com/share/a106ab8dac80)

   该页面的实际内容可参考仓库中的 [scripts/client/canvas.html](scripts/client/canvas.html)。

   打开后请手动填写：
   - `Server WS Endpoint`：例如本地部署填写 `ws://127.0.0.1:7861/ws`，远程部署填写你的服务端 WebSocket 地址
   - `API Key`：填写与请求时相同的 `API_KEYS` 中任意一个 key
   - `Browser Identifier`：浏览器标志，可自定义；留空时页面会自动生成每日标志

   填写完成后点击 `Connect`。连接成功后，回到状态页确认 `Browser Sessions` 中已有在线会话。

6. 开始调用 API：

   至少有一个浏览器会话在线时，服务端才会真正转发并处理请求。

> ⚠ **注意：**
> 旧版 README 中的 `npm run setup-auth`、`auth-N.json`、VNC 登录和上传 Auth 文件等流程，已不适用于当前版本。

> 💡 **提示：**
> 如果服务部署在远程机器上，建立会话的浏览器只需要能够访问服务端的 HTTP 端口 `PORT`。浏览器会话 WebSocket 现已复用同一端口，通过 `/ws` 路径连接。

### 🐋 Docker 部署

#### 🎮️ 方式 1：Docker 命令

```bash
docker run -d \
  --name canvas-to-api \
  -p 7861:7861 \
  -e API_KEYS=your-api-key \
  -e TZ=Asia/Shanghai \
  --restart unless-stopped \
  ghcr.io/ibuhub/canvas-to-api:latest
```

> 💡 **提示：** 如果 `ghcr.io` 访问较慢，可以使用 Docker Hub 镜像：`ibuhub/canvas-to-api:latest`。

参数说明：

- `-p 7861:7861`：HTTP API 与控制台端口
- `-e API_KEYS`：客户端访问 API 和控制台时使用的密钥
- `-e TZ=Asia/Shanghai`：日志和页面显示时间的时区（可选）

#### 📦 方式 2：Docker Compose

创建 `docker-compose.yml`：

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
      TZ: Asia/Shanghai
```

#### 🛠️ 方式 3：从源码构建

如果你希望自己构建 Docker 镜像，可以使用以下命令：

1. 构建镜像：

   ```bash
   docker build -t canvas-to-api .
   ```

2. 运行容器：

   ```bash
   docker run -d \
     --name canvas-to-api \
     -p 7861:7861 \
     -e API_KEYS=your-api-key \
     -e TZ=Asia/Shanghai \
     --restart unless-stopped \
     canvas-to-api
   ```

#### 🔌 步骤 2：连接浏览器会话

容器启动后，仍然需要手动打开以下页面建立浏览器会话：

[https://gemini.google.com/share/a106ab8dac80](https://gemini.google.com/share/a106ab8dac80)

页面中需要手动填写浏览器标志（`Browser Identifier`）、API Key，以及服务端 WebSocket 地址（`Server WS Endpoint`，例如 `ws://your-host:7861/ws` 或 `wss://your-host/ws`）。其中 API Key 请填写与请求时相同的 key。连接建立成功后，状态页会显示在线浏览器会话，之后 API 请求才会被转发。

#### 🌐 步骤 3（可选）：使用 Nginx 反向代理

如果需要通过域名访问服务，或希望放在反向代理之后统一管理，可以使用 Nginx。

> [!IMPORTANT]
> 如果需要在浏览器端连接非本地服务端，必须为服务器开启 HTTPS 反向代理，并通过 Nginx 提供 `wss://` 入口。
> 同时请确保 Nginx 正确转发 WebSocket 升级请求，至少包含 `proxy_http_version 1.1`、`proxy_set_header Upgrade $http_upgrade` 和 `proxy_set_header Connection "Upgrade"`。
>
> 📖 详细的 Nginx 配置说明请参阅：[Nginx 反向代理配置文档](docs/zh/nginx-setup.md)

### 🐾 Claw Cloud Run 部署

支持直接部署到 Claw Cloud Run，全托管的容器平台。

> 📖 详细部署说明请参阅：[部署到 Claw Cloud Run](docs/zh/claw-cloud-run.md)

## 📗 使用 API

### 🤖 OpenAI 兼容 API

- `GET /v1/models`：列出模型。
- `POST /v1/chat/completions`：聊天补全和图片生成，支持非流式、真流式和假流式。
- `POST /v1/responses`：OpenAI Responses API 兼容接口，用于对话生成，不支持图像生成，支持非流式、真流式和假流式。
- `POST /v1/responses/input_tokens`：计算 OpenAI Responses API 请求的输入 token 数量。

### ♊ Gemini 原生 API 格式

- `GET /v1beta/models`：列出可用的 Gemini 模型。
- `POST /v1beta/models/{model_name}:generateContent`：生成内容、图片和语音。
- `POST /v1beta/models/{model_name}:streamGenerateContent`：流式生成内容、图片和语音，支持真流式和假流式。

### 🧠 Anthropic 兼容 API

- `GET /v1/models`：列出模型。
- `POST /v1/messages`：聊天消息补全，支持非流式、真流式和假流式。
- `POST /v1/messages/count_tokens`：计算消息中的 token 数量。

> 📖 详细的 API 使用示例请参阅：[API 使用示例文档](docs/zh/api-examples.md)

## 🧰 相关配置

### 🔧 环境变量

#### 📱 应用配置

| 变量名                      | 描述                                                                                                             | 默认值               |
| :-------------------------- | :--------------------------------------------------------------------------------------------------------------- | :------------------- |
| `API_KEYS`                  | 用于 API 鉴权的密钥列表，多个值使用逗号分隔；同时也是默认的控制台登录密码来源。                                  | `123456`             |
| `WEB_CONSOLE_USERNAME`      | 网页控制台登录用户名（可选）。如果与密码同时设置，则登录时需要输入两者。                                         | 无                   |
| `WEB_CONSOLE_PASSWORD`      | 网页控制台登录密码（可选）。如果只设置密码，则控制台只要求输入密码；如果两者都不设置，则回退到 `API_KEYS` 登录。 | 无                   |
| `PORT`                      | HTTP API 与控制台端口。                                                                                          | `7861`               |
| `HOST`                      | HTTP 服务和 WebSocket 服务监听地址。                                                                             | `0.0.0.0`            |
| `ICON_URL`                  | 控制台 favicon 地址，支持 ICO、PNG、SVG 等格式。                                                                 | `/AIStudio_logo.svg` |
| `SECURE_COOKIES`            | 是否启用仅 HTTPS 可用的安全 Cookie。                                                                             | `false`              |
| `RATE_LIMIT_MAX_ATTEMPTS`   | 控制台登录失败次数限制，设为 `0` 可关闭。                                                                        | `5`                  |
| `RATE_LIMIT_WINDOW_MINUTES` | 控制台登录失败次数统计窗口，单位分钟。                                                                           | `15`                 |
| `CHECK_UPDATE`              | 是否在控制台页面检查新版本。设为 `false` 可关闭。                                                                | `true`               |
| `LOG_LEVEL`                 | 日志级别，支持 `INFO` 和 `DEBUG`。                                                                               | `INFO`               |
| `TZ`                        | 日志和页面显示时间使用的时区，例如 `Asia/Shanghai`。留空时默认使用系统时区。                                     | 系统时区             |

#### 🌐 代理配置

| 变量名                    | 描述                                                                                         | 默认值  |
| :------------------------ | :------------------------------------------------------------------------------------------- | :------ |
| `ROUND`                   | 会话选择策略，支持 `round`（轮询）和 `random`（随机）。                                      | `round` |
| `SESSION_ERROR_THRESHOLD` | 单个浏览器会话累计 WebSocket / 浏览器错误达到该阈值后会被自动禁用，设为 `0` 表示永远不禁用。 | `3`     |
| `MAX_RETRIES`             | 单次请求失败后的最大重试次数。                                                               | `3`     |
| `RETRY_DELAY`             | 两次重试之间的间隔，单位毫秒。                                                               | `2000`  |

#### 🗒️ 其他配置

| 变量名              | 描述                                                                                     | 默认值  |
| :------------------ | :--------------------------------------------------------------------------------------- | :------ |
| `STREAMING_MODE`    | 流式传输模式。`real` 为真流式，`fake` 为假流式。根据目前的测试，使用真流式可能导致报错。 | `fake`  |
| `FORCE_THINKING`    | 强制为所有请求启用思考模式。                                                             | `false` |
| `FORCE_WEB_SEARCH`  | 强制为所有请求启用联网搜索。根据目前的测试，启用后可能导致请求报错。                     | `false` |
| `FORCE_URL_CONTEXT` | 强制为所有请求启用 URL 上下文。                                                          | `false` |

### 🔌 浏览器会话连接

当前版本不再读取本地 `auth` 文件，也不包含 `setup-auth` 初始化脚本。正确的使用方式是：

1. 启动服务端，并确保 `PORT` 能被建立会话的浏览器访问到。
2. 打开控制台查看当前浏览器会话连接地址和连接状态。
3. 在浏览器中打开 [https://gemini.google.com/share/a106ab8dac80](https://gemini.google.com/share/a106ab8dac80)。
4. 在页面中填写浏览器标志（`Browser Identifier`）、API Key，以及服务端 WebSocket 地址（`Server WS Endpoint`）。
5. `API Key` 请填写与你请求 API 时相同的 key；`Server WS Endpoint` 本地可填写 `ws://127.0.0.1:7861/ws`，如果控制台是通过 `https://` 访问的远程服务，则应填写 `wss://你的域名或公网地址/ws`。
6. 等待状态页出现在线会话后，再开始调用 API。

### 🧠 模型列表配置

编辑 `configs/models.json` 以自定义可用模型及其设置。

> 💡 **提示：** 思考参数支持通过模型名后缀设置，可以在模型名后追加 `-THINKING_LEVEL` 或 `(THINKING_LEVEL)`，其中 `THINKING_LEVEL` 支持 `high`、`medium`、`low`、`minimal`，不区分大小写。例如：`gemini-3-flash-preview(minimal)` 或 `gemini-3-flash-preview-minimal`。
>
> 流式模式也支持通过模型名后缀覆盖，可在模型名最后追加 `-real` 或 `-fake`。该后缀优先级高于系统 `STREAMING_MODE`，但只在流式请求中生效。例如：`gemini-3-flash-preview-fake`。若和思考后缀同时使用，真假流后缀必须放在最后，例如：`gemini-3-flash-preview-minimal-fake` 或 `gemini-3-flash-preview(minimal)-real`。

## 📄 许可证

本项目基于 [**iBUHub/AIStudioToAPI**](https://github.com/iBUHub/AIStudioToAPI) 开发，并采用 CC BY-NC 4.0 许可证，其使用、分发与修改行为均需遵守许可证的全部条款，完整许可的内容请参见 [LICENSE](LICENSE) 文件。

## 🤝 贡献者

[![Contributors](https://contrib.rocks/image?repo=iBUHub/CanvasToAPI)](https://github.com/iBUHub/CanvasToAPI/graphs/contributors)

感谢所有为本项目付出汗水与智慧的开发者。

---

如果你觉得 CanvasToAPI 对你有帮助，欢迎给项目点一个 ⭐️！

[![Star History Chart](https://api.star-history.com/svg?repos=iBUHub/CanvasToAPI&type=date&legend=top-left)](https://www.star-history.com/#iBUHub/CanvasToAPI&type=date&legend=top-left)

## 社区支持

学 AI , 上 L 站
[LinuxDO](https://linux.do)
