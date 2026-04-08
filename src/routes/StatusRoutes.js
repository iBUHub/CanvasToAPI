/**
 * File: src/routes/StatusRoutes.js
 * Description: Lightweight status and settings routes for browser-owned sessions
 */

const VersionChecker = require("../utils/VersionChecker");
const LoggingService = require("../utils/LoggingService");

class StatusRoutes {
    constructor(serverSystem) {
        this.serverSystem = serverSystem;
        this.logger = serverSystem.logger;
        this.config = serverSystem.config;
        this.distIndexPath = serverSystem.distIndexPath;
        this.versionChecker = new VersionChecker(this.logger);
    }

    setupRoutes(app, isAuthenticated) {
        app.get("/favicon.ico", (req, res) => {
            const iconUrl = process.env.ICON_URL || "/AIStudio_logo.svg";

            // Redirect to the configured icon URL (default: local SVG icon)
            // This supports any icon format (ICO, PNG, SVG, etc.) and any size
            res.redirect(302, iconUrl);
        });

        app.get("/health", (req, res) => {
            const now = new Date();
            const timezone = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone;
            let timestamp;

            try {
                timestamp =
                    now
                        .toLocaleString("zh-CN", {
                            day: "2-digit",
                            hour: "2-digit",
                            hour12: false,
                            minute: "2-digit",
                            month: "2-digit",
                            second: "2-digit",
                            timeZone: timezone,
                            year: "numeric",
                        })
                        .replace(/\//g, "-") + `.${now.getMilliseconds().toString().padStart(3, "0")} [${timezone}]`;
            } catch (err) {
                timestamp = now.toISOString();
            }

            const healthStatus = {
                browserConnected: this.serverSystem.sessionRegistry.getConnectionCount() > 0,
                status: "ok",
                timestamp,
                uptime: process.uptime(),
            };
            res.status(200).json(healthStatus);
        });

        app.get("/", isAuthenticated, (req, res) => {
            res.status(200).sendFile(this.distIndexPath);
        });

        app.post("/", (req, res) => {
            res.status(405).json({ error: "Method Not Allowed" });
        });

        app.get("/api/version/check", isAuthenticated, async (req, res) => {
            // Check if update checking is disabled via environment variable
            const checkUpdate = process.env.CHECK_UPDATE?.toLowerCase() !== "false";
            if (!checkUpdate) {
                return res.status(200).json({
                    current: this.versionChecker.getCurrentVersion(),
                    disabled: true,
                    hasUpdate: false,
                    latest: null,
                    releaseUrl: null,
                });
            }

            try {
                const result = await this.versionChecker.checkForUpdates();
                res.status(200).json(result);
            } catch (error) {
                this.logger.error(`[VersionCheck] Error: ${error.message}`);
                res.status(500).json({ error: "Failed to check for updates" });
            }
        });

        app.get("/api/status", isAuthenticated, (req, res) => {
            res.json(this._getStatusData());
        });

        app.put("/api/sessions/:sessionId/reset-health", isAuthenticated, (req, res) => {
            const sessionId = String(req.params.sessionId || "").trim();
            if (!sessionId) {
                return res.status(400).json({ error: "Invalid session id", message: "settingFailed" });
            }

            const session = this.serverSystem.sessionRegistry.resetConnectionHealth(sessionId);
            if (!session) {
                return res.status(404).json({ error: "Session not found", message: "statusFetchFailed" });
            }

            res.status(200).json({
                message: "sessionResetSuccess",
                session,
                sessionId,
            });
        });

        app.put("/api/settings/streaming-mode", isAuthenticated, (req, res) => {
            const newMode = req.body.mode;
            if (newMode === "fake" || newMode === "real") {
                this.serverSystem.streamingMode = newMode;
                this.logger.info(
                    `[WebUI] Streaming mode switched by authenticated user to: ${this.serverSystem.streamingMode}`
                );
                res.status(200).json({ message: "settingUpdateSuccess", setting: "streamingMode", value: newMode });
            } else {
                res.status(400).json({ message: "errorInvalidMode" });
            }
        });

        app.put("/api/settings/selection-strategy", isAuthenticated, (req, res) => {
            const strategy = String(req.body.strategy || "")
                .trim()
                .toLowerCase();
            if (strategy === "round" || strategy === "random") {
                this.config.sessionSelectionStrategy = strategy;
                this.logger.info(`[WebUI] Session selection strategy switched to: ${strategy}`);
                res.status(200).json({
                    message: "settingUpdateSuccess",
                    setting: "selectionStrategy",
                    value: strategy,
                });
            } else {
                res.status(400).json({ error: "Invalid strategy", message: "settingFailed" });
            }
        });

        app.put("/api/settings/force-thinking", isAuthenticated, (req, res) => {
            this.serverSystem.forceThinking = !this.serverSystem.forceThinking;
            const statusText = this.serverSystem.forceThinking;
            this.logger.info(`[WebUI] Force thinking toggle switched to: ${statusText}`);
            res.status(200).json({ message: "settingUpdateSuccess", setting: "forceThinking", value: statusText });
        });

        app.put("/api/settings/force-web-search", isAuthenticated, (req, res) => {
            this.serverSystem.forceWebSearch = !this.serverSystem.forceWebSearch;
            const statusText = this.serverSystem.forceWebSearch;
            this.logger.info(`[WebUI] Force web search toggle switched to: ${statusText}`);
            res.status(200).json({ message: "settingUpdateSuccess", setting: "forceWebSearch", value: statusText });
        });

        app.put("/api/settings/force-url-context", isAuthenticated, (req, res) => {
            this.serverSystem.forceUrlContext = !this.serverSystem.forceUrlContext;
            const statusText = this.serverSystem.forceUrlContext;
            this.logger.info(`[WebUI] Force URL context toggle switched to: ${statusText}`);
            res.status(200).json({ message: "settingUpdateSuccess", setting: "forceUrlContext", value: statusText });
        });

        app.put("/api/settings/debug-mode", isAuthenticated, (req, res) => {
            const currentLevel = LoggingService.getLevel();
            const newLevel = currentLevel === "DEBUG" ? "INFO" : "DEBUG";
            LoggingService.setLevel(newLevel);
            this.logger.info(`[WebUI] Log level switched to: ${newLevel}`);

            // Sync browser log level via WebSocket (broadcasts to all active contexts)
            const updatedCount = this.serverSystem.requestHandler.setBrowserLogLevel(newLevel);
            const browserSynced = updatedCount > 0;
            if (!browserSynced) {
                this.logger.warn(`[WebUI] Browser log level sync failed (no active connections)`);
            }

            res.status(200).json({
                browserSynced,
                message: "settingUpdateSuccess",
                setting: "logLevel",
                updatedContexts: updatedCount,
                value: newLevel === "DEBUG" ? "debug" : "normal",
            });
        });

        app.put("/api/settings/log-max-count", isAuthenticated, (req, res) => {
            const { count } = req.body;
            const newCount = parseInt(count, 10);

            if (Number.isFinite(newCount) && newCount > 0) {
                this.logger.setDisplayLimit(newCount);
                this.logger.info(`[WebUI] Log display limit updated to: ${newCount}`);
                res.status(200).json({ message: "settingUpdateSuccess", setting: "logMaxCount", value: newCount });
            } else {
                res.status(400).json({ error: "Invalid count", message: "settingFailed" });
            }
        });
    }

    _getSystemSummary() {
        return {
            browserSessionCount: this.serverSystem.sessionRegistry.getConnectionCount(),
            browserWsPath: this.config.browserWsPath || "/ws",
            debugMode: LoggingService.isDebugEnabled(),
            forceThinking: this.serverSystem.forceThinking,
            forceUrlContext: this.serverSystem.forceUrlContext,
            forceWebSearch: this.serverSystem.forceWebSearch,
            logMaxCount: this.logger.displayLimit || 100,
            maxRetries: this.config.maxRetries,
            selectionStrategy: this.config.sessionSelectionStrategy,
            sessionErrorThreshold: this.config.sessionErrorThreshold,
            sessionSelectionState: this.serverSystem.sessionRegistry.getSelectionState(),
            sharePageUrl: this.config.sharePageUrl,
            streamingMode: this.serverSystem.streamingMode,
        };
    }

    _getStatusData() {
        const limit = this.logger.displayLimit || 100;
        const logs = (this.logger.logBuffer || []).slice(-limit);

        return {
            logCount: logs.length,
            logs: logs.join("\n"),
            status: {
                ...this._getSystemSummary(),
                browserSessions: this.serverSystem.sessionRegistry.getConnections(),
                serviceConnected: true,
            },
        };
    }
}

module.exports = StatusRoutes;
