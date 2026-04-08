/**
 * File: src/core/ProxyServerSystem.js
 * Description: Main server system for protocol adaptation and browser WebSocket forwarding
 *
 * Author: iBUHUB
 */

const { EventEmitter } = require("events");
const express = require("express");
const WebSocket = require("ws");
const http = require("http");
const https = require("https");
const fs = require("fs");

const LoggingService = require("../utils/LoggingService");
const RequestHandler = require("./RequestHandler");
const SessionRegistry = require("./SessionRegistry");
const ConfigLoader = require("../utils/ConfigLoader");
const WebRoutes = require("../routes/WebRoutes");

class ProxyServerSystem extends EventEmitter {
    constructor() {
        super();
        this.logger = new LoggingService("CanvasToAPI");

        const configLoader = new ConfigLoader(this.logger);
        this.config = configLoader.loadConfiguration();
        this.streamingMode = this.config.streamingMode;
        this.forceThinking = this.config.forceThinking;
        this.forceWebSearch = this.config.forceWebSearch;
        this.forceUrlContext = this.config.forceUrlContext;

        this.sessionRegistry = new SessionRegistry(this.logger, this.config);
        this.requestHandler = new RequestHandler(this, this.sessionRegistry, this.logger, this.config);

        this.httpServer = null;
        this.wsServer = new WebSocket.Server({ noServer: true });
        this.webRoutes = new WebRoutes(this);

        this.wsServer.on("connection", (ws, req) => {
            this.sessionRegistry.addConnection(ws, this._buildBrowserSessionMeta(req));
        });

        this.wsServer.on("error", error => {
            this.logger.error(`[System] WebSocket server runtime error: ${error.message}`);
        });
    }

    async start() {
        this.logger.info("[System] Starting protocol adapter server...");
        await this._startHttpServer();

        this.staleQueueCleanupInterval = setInterval(() => {
            try {
                this.sessionRegistry.cleanupStaleQueues(600000);
            } catch (error) {
                this.logger.error(`[System] Error during stale queue cleanup: ${error.message}`);
            }
        }, 300000);

        this.logger.info("[System] Server startup complete.");
        this.emit("started");
    }

    _createAuthMiddleware() {
        return (req, res, next) => {
            if (!this._hasConfiguredApiKeys()) {
                return next();
            }

            const clientKey = this._extractClientKey(req);
            if (this._isValidApiKey(clientKey)) {
                this.logger.info(
                    `[Auth] API key verification passed (from: ${this.webRoutes.authRoutes.getClientIP(req)})`
                );
                if (req.query.key) {
                    delete req.query.key;
                }
                return next();
            }

            if (req.path !== "/favicon.ico") {
                const clientIp = this.webRoutes.authRoutes.getClientIP(req);
                this.logger.warn(`[Auth] Access password incorrect or missing. IP: ${clientIp}, Path: ${req.path}`);
            }

            return res.status(401).json({
                error: {
                    message: "Access denied. A valid API key was not found or is incorrect.",
                },
            });
        };
    }

    async _startHttpServer() {
        const app = this._createExpressApp();

        if (this.config.sslKeyPath && this.config.sslCertPath) {
            try {
                if (fs.existsSync(this.config.sslKeyPath) && fs.existsSync(this.config.sslCertPath)) {
                    const options = {
                        cert: fs.readFileSync(this.config.sslCertPath),
                        key: fs.readFileSync(this.config.sslKeyPath),
                    };
                    this.httpServer = https.createServer(options, app);
                    this.logger.info("[System] Starting in HTTPS mode...");
                } else {
                    this.logger.warn("[System] SSL files not found, falling back to HTTP.");
                    this.httpServer = http.createServer(app);
                }
            } catch (error) {
                this.logger.error(`[System] Failed to load SSL files: ${error.message}. Falling back to HTTP.`);
                this.httpServer = http.createServer(app);
            }
        } else {
            this.httpServer = http.createServer(app);
        }

        this.httpServer.on("upgrade", (req, socket, head) => {
            this._handleUpgradeRequest(req, socket, head);
        });

        this.httpServer.keepAliveTimeout = 120000;
        this.httpServer.headersTimeout = 125000;
        this.httpServer.requestTimeout = 120000;

        return new Promise(resolve => {
            this.httpServer.listen(this.config.httpPort, this.config.host, () => {
                this.logger.info(
                    `[System] HTTP server is listening on http://${this.config.host}:${this.config.httpPort}`
                );
                resolve();
            });
        });
    }

    _createExpressApp() {
        const app = express();

        app.use((req, res, next) => {
            if (
                req.path !== "/api/status" &&
                req.path !== "/" &&
                req.path !== "/favicon.ico" &&
                req.path !== "/login" &&
                req.path !== "/health" &&
                !req.path.startsWith("/locales/") &&
                !req.path.startsWith("/assets/") &&
                req.path !== "/AIStudio_logo.svg" &&
                req.path !== "/AIStudio_icon.svg" &&
                req.path !== "/AIStudio_logo_dark.svg"
            ) {
                this.logger.info(`[Entrypoint] Received request: ${req.method} ${req.path}`);
            }
            next();
        });

        app.use((req, res, next) => {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
            res.header("Access-Control-Allow-Private-Network", "true");
            res.header(
                "Access-Control-Allow-Headers",
                "Content-Type, Authorization, x-requested-with, x-api-key, x-goog-api-key, x-goog-api-client, x-user-agent," +
                    " origin, accept, baggage, sentry-trace, openai-organization, openai-project, openai-beta, x-stainless-lang, " +
                    "x-stainless-package-version, x-stainless-os, x-stainless-arch, x-stainless-runtime, x-stainless-runtime-version, " +
                    "x-stainless-retry-count, x-stainless-timeout, sec-ch-ua, sec-ch-ua-mobile, sec-ch-ua-platform, " +
                    "anthropic-version, anthropic-beta, anthropic-dangerous-direct-browser-access, " +
                    "x-goog-upload-protocol, x-goog-upload-command, x-goog-upload-header-content-length, " +
                    "x-goog-upload-header-content-type, x-goog-upload-url, x-goog-upload-offset, x-goog-upload-status"
            );
            res.header("Access-Control-Expose-Headers", "*");

            if (req.method === "OPTIONS") {
                return res.sendStatus(204);
            }

            next();
        });

        app.use((req, res, next) => {
            if (req.method === "GET" || req.method === "OPTIONS" || req.method === "HEAD") {
                return next();
            }

            const chunks = [];
            req.on("data", chunk => chunks.push(chunk));
            req.on("end", () => {
                req.rawBody = Buffer.concat(chunks);

                if (req.headers["content-type"]?.includes("application/json")) {
                    try {
                        req.body = JSON.parse(req.rawBody.toString());
                    } catch {
                        req.body = {};
                    }
                } else if (req.headers["content-type"]?.includes("application/x-www-form-urlencoded")) {
                    try {
                        const qs = require("querystring");
                        req.body = qs.parse(req.rawBody.toString());
                    } catch {
                        req.body = {};
                    }
                } else {
                    req.body = {};
                }

                next();
            });

            req.on("error", err => {
                this.logger.error(`[System] Request stream error: ${err.message}`);
                next(err);
            });
        });

        const path = require("path");
        app.use(express.static(path.join(__dirname, "..", "..", "ui", "dist")));
        app.use(express.static(path.join(__dirname, "..", "..", "ui", "public")));
        app.use("/locales", express.static(path.join(__dirname, "..", "..", "ui", "locales")));

        this.webRoutes.setupSession(app);
        app.use(this._createAuthMiddleware());

        app.get("/v1/models", (req, res) => {
            const models = this.config.modelList.map(model => ({
                context_window: model.inputTokenLimit,
                created: Math.floor(Date.now() / 1000),
                id: model.name.replace("models/", ""),
                max_tokens: model.outputTokenLimit,
                object: "model",
                owned_by: "google",
            }));

            res.status(200).json({
                data: models,
                object: "list",
            });
        });

        app.get("/v1beta/models", (req, res) => {
            res.status(200).json({ models: this.config.modelList });
        });

        app.post("/v1/chat/completions", (req, res) => {
            this.requestHandler.processOpenAIRequest(req, res);
        });

        app.post("/v1/responses", (req, res) => {
            this.requestHandler.processOpenAIResponseRequest(req, res);
        });

        app.post("/v1/responses/input_tokens", (req, res) => {
            this.requestHandler.processOpenAIResponseInputTokens(req, res);
        });

        app.post("/responses/input_tokens", (req, res) => {
            this.requestHandler.processOpenAIResponseInputTokens(req, res);
        });

        app.post("/v1/messages", (req, res) => {
            this.requestHandler.processClaudeRequest(req, res);
        });

        app.post("/v1/messages/count_tokens", (req, res) => {
            this.requestHandler.processClaudeCountTokens(req, res);
        });

        // Browser-session WebSocket downgrade / missing headers handler.
        // If a proxy strips Upgrade headers, the request may arrive as a normal GET.
        app.get(this.config.browserWsPath, (req, res) => {
            res.status(400).send(
                "Error: WebSocket connection failed. " +
                    "If you are using a proxy (like Nginx), ensure it forwards 'Upgrade' and 'Connection' headers " +
                    `for ${this.config.browserWsPath}.`
            );
        });

        app.all(/(.*)/, (req, res) => {
            this.requestHandler.processRequest(req, res);
        });

        return app;
    }

    _hasConfiguredApiKeys() {
        return Array.isArray(this.config.apiKeys) && this.config.apiKeys.length > 0;
    }

    _extractClientKey(req, requestUrl = null) {
        if (req.headers["x-goog-api-key"]) {
            return req.headers["x-goog-api-key"];
        }

        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            return req.headers.authorization.substring(7);
        }

        if (req.headers["x-api-key"]) {
            return req.headers["x-api-key"];
        }

        if (requestUrl?.searchParams?.has("key")) {
            return requestUrl.searchParams.get("key");
        }

        if (req.query?.key) {
            return req.query.key;
        }

        return null;
    }

    _isValidApiKey(clientKey) {
        return Boolean(clientKey && this._hasConfiguredApiKeys() && this.config.apiKeys.includes(clientKey));
    }

    _handleUpgradeRequest(req, socket, head) {
        let requestUrl;
        const browserWsPath = this.config.browserWsPath || "/ws";

        try {
            requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
        } catch (error) {
            this.logger.warn(`[System] Failed to parse upgrade URL: ${error.message}`);
            this._rejectUpgrade(socket, 400, "Invalid WebSocket URL");
            return;
        }

        if (requestUrl.pathname !== browserWsPath) {
            this.logger.warn(`[System] Received an upgrade request for an unknown path: ${requestUrl.pathname}`);
            this._rejectUpgrade(socket, 404, "Unknown WebSocket path");
            return;
        }

        if (String(req.headers.upgrade || "").toLowerCase() !== "websocket") {
            this.logger.warn(
                `[System] Rejected upgrade request without websocket header on path ${requestUrl.pathname}.`
            );
            this._rejectUpgrade(socket, 400, "Expected WebSocket upgrade");
            return;
        }

        this.webRoutes.sessionParser(req, {}, () => {
            const authResult = this._isBrowserSessionUpgradeAuthorized(req, requestUrl);
            const clientIp = this.webRoutes.authRoutes.getClientIP(req);

            if (!authResult.authorized) {
                this.logger.warn(
                    `[Auth] Rejected browser WebSocket connection from ${clientIp}: ${authResult.reason || "unauthorized"}`
                );
                this._rejectUpgrade(socket, 401, "Unauthorized WebSocket connection");
                return;
            }

            this.logger.info(`[Auth] Browser WebSocket verification passed via ${authResult.via} (from: ${clientIp})`);

            this.wsServer.handleUpgrade(req, socket, head, ws => {
                this.wsServer.emit("connection", ws, req);
            });
        });
    }

    _isBrowserSessionUpgradeAuthorized(req, requestUrl) {
        if (!this._hasConfiguredApiKeys()) {
            return { authorized: true, via: "no_api_key_configured" };
        }

        const clientKey = this._extractClientKey(req, requestUrl);
        if (this._isValidApiKey(clientKey)) {
            return { authorized: true, via: "api_key" };
        }

        return {
            authorized: false,
            reason: clientKey ? "invalid_api_key" : "missing_api_key",
        };
    }

    _rejectUpgrade(socket, statusCode, message) {
        try {
            socket.write(
                `HTTP/1.1 ${statusCode} ${message}\r\n` +
                    "Connection: close\r\n" +
                    "Content-Type: text/plain; charset=utf-8\r\n" +
                    "\r\n" +
                    `${message}\r\n`
            );
        } catch (error) {
            this.logger.debug(`[System] Failed to write upgrade rejection response: ${error.message}`);
        }

        try {
            socket.destroy();
        } catch (error) {
            this.logger.debug(`[System] Failed to close rejected upgrade socket: ${error.message}`);
        }
    }

    _buildBrowserSessionMeta(req) {
        let clientLabel = "";

        try {
            const requestUrl = new URL(req.url || "/", `ws://${req.headers.host || "localhost"}`);
            clientLabel = this._sanitizeBrowserClientLabel(requestUrl.searchParams.get("client_label"));
        } catch (error) {
            this.logger.debug(`[System] Failed to parse browser WebSocket URL: ${error.message}`);
        }

        return {
            address: this.webRoutes.authRoutes.getClientIP(req),
            clientLabel,
            userAgent: req.headers["user-agent"] || "",
        };
    }

    _sanitizeBrowserClientLabel(value) {
        if (!value) {
            return "";
        }

        return String(value).trim().replace(/\s+/g, " ").slice(0, 64);
    }

    async shutdown() {
        this.logger.info("[System] Shutting down server system...");

        if (this.staleQueueCleanupInterval) {
            clearInterval(this.staleQueueCleanupInterval);
            this.staleQueueCleanupInterval = null;
        }

        this.sessionRegistry.closeAllMessageQueues();
        this.sessionRegistry.closeAllConnections();

        const closeServer = (server, name) =>
            new Promise(resolve => {
                if (!server) {
                    resolve();
                    return;
                }

                try {
                    server.close(() => {
                        this.logger.info(`[System] ${name} closed`);
                        resolve();
                    });
                } catch (error) {
                    this.logger.warn(`[System] Error while closing ${name}: ${error.message}`);
                    resolve();
                }
            });

        await Promise.all([
            closeServer(this.wsServer, "WebSocket server"),
            closeServer(this.httpServer, "HTTP server"),
        ]);

        this.logger.info("[System] Shutdown complete");
    }
}

module.exports = ProxyServerSystem;
