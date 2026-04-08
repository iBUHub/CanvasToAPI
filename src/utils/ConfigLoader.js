/**
 * File: src/utils/ConfigLoader.js
 * Description: Configuration loader for the browser-owned session architecture
 *
 * Author: iBUHUB
 */

const fs = require("fs");
const path = require("path");
const { getProxySummaryFromEnv } = require("./ProxyUtils");

class ConfigLoader {
    constructor(logger) {
        this.logger = logger;
    }

    loadConfiguration() {
        const config = {
            apiKeys: [],
            apiKeySource: "Not set",
            browserWsErrorThreshold: 3,
            failureThreshold: 3,
            forceThinking: false,
            forceUrlContext: false,
            forceWebSearch: false,
            host: "0.0.0.0",
            httpPort: 7861,
            immediateSwitchStatusCodes: [429, 503],
            maxRetries: 3,
            retryDelay: 2000,
            sessionSelectionStrategy: "round",
            streamingMode: "fake",
            switchOnUses: 40,
            wsPort: 9997,
        };

        if (process.env.PORT) {
            const parsed = parseInt(process.env.PORT, 10);
            config.httpPort = Number.isFinite(parsed) ? parsed : config.httpPort;
        }

        if (process.env.HOST) {
            config.host = process.env.HOST;
        }

        if (process.env.STREAMING_MODE) {
            config.streamingMode = process.env.STREAMING_MODE;
        }

        if (process.env.MAX_RETRIES) {
            const parsed = parseInt(process.env.MAX_RETRIES, 10);
            config.maxRetries = Number.isFinite(parsed) ? Math.max(1, parsed) : config.maxRetries;
        }

        if (process.env.RETRY_DELAY) {
            const parsed = parseInt(process.env.RETRY_DELAY, 10);
            config.retryDelay = Number.isFinite(parsed) ? Math.max(50, parsed) : config.retryDelay;
        }

        if (process.env.WS_PORT) {
            const parsed = parseInt(process.env.WS_PORT, 10);
            config.wsPort = Number.isFinite(parsed) ? parsed : config.wsPort;
        }

        if (process.env.ROUND) {
            const strategy = String(process.env.ROUND).trim().toLowerCase();
            if (strategy === "random" || strategy === "round") {
                config.sessionSelectionStrategy = strategy;
            } else {
                this.logger.warn(
                    `[Config] Invalid ROUND="${process.env.ROUND}", using ${config.sessionSelectionStrategy}.`
                );
            }
        }

        if (process.env.BROWSER_WS_ERROR_THRESHOLD) {
            const parsed = parseInt(process.env.BROWSER_WS_ERROR_THRESHOLD, 10);
            config.browserWsErrorThreshold = Number.isFinite(parsed)
                ? Math.max(1, parsed)
                : config.browserWsErrorThreshold;
        }

        if (process.env.SWITCH_ON_USES) {
            const parsed = parseInt(process.env.SWITCH_ON_USES, 10);
            config.switchOnUses = Number.isFinite(parsed) ? Math.max(0, parsed) : config.switchOnUses;
        }

        if (process.env.FAILURE_THRESHOLD) {
            const parsed = parseInt(process.env.FAILURE_THRESHOLD, 10);
            config.failureThreshold = Number.isFinite(parsed) ? Math.max(0, parsed) : config.failureThreshold;
        }

        if (process.env.IMMEDIATE_SWITCH_STATUS_CODES) {
            config.immediateSwitchStatusCodes = process.env.IMMEDIATE_SWITCH_STATUS_CODES.split(",")
                .map(value => parseInt(String(value).trim(), 10))
                .filter(Number.isFinite);
        }

        if (process.env.API_KEYS) {
            config.apiKeys = process.env.API_KEYS.split(",");
        }

        if (process.env.FORCE_THINKING) {
            config.forceThinking = process.env.FORCE_THINKING.toLowerCase() === "true";
        }

        if (process.env.FORCE_WEB_SEARCH) {
            config.forceWebSearch = process.env.FORCE_WEB_SEARCH.toLowerCase() === "true";
        }

        if (process.env.FORCE_URL_CONTEXT) {
            config.forceUrlContext = process.env.FORCE_URL_CONTEXT.toLowerCase() === "true";
        }

        if (Array.isArray(config.apiKeys)) {
            config.apiKeys = config.apiKeys.map(key => String(key).trim()).filter(Boolean);
        } else {
            config.apiKeys = [];
        }

        if (config.apiKeys.length > 0) {
            config.apiKeySource = "Custom";
        } else {
            config.apiKeys = ["123456"];
            config.apiKeySource = "Default";
            this.logger.info("[System] No API key set, using default password: 123456");
        }

        const modelsPath = path.join(process.cwd(), "configs", "models.json");
        try {
            if (fs.existsSync(modelsPath)) {
                const modelsFileContent = fs.readFileSync(modelsPath, "utf-8");
                const modelsData = JSON.parse(modelsFileContent);
                if (modelsData && modelsData.models) {
                    config.modelList = modelsData.models;
                    this.logger.info(
                        `[System] Successfully loaded ${config.modelList.length} models from models.json.`
                    );
                } else {
                    this.logger.warn("[System] models.json has unexpected format, using default model list.");
                    config.modelList = [{ name: "models/gemini-2.5-flash" }];
                }
            } else {
                this.logger.warn("[System] models.json not found, using default model list.");
                config.modelList = [{ name: "models/gemini-2.5-flash" }];
            }
        } catch (error) {
            this.logger.error(
                `[System] Failed to read or parse models.json: ${error.message}, using default model list.`
            );
            config.modelList = [{ name: "models/gemini-2.5-flash" }];
        }

        this._printConfiguration(config);
        return config;
    }

    _printConfiguration(config) {
        this.logger.info("================ [ Active Configuration ] ================");
        this.logger.info(`  HTTP Server Port: ${config.httpPort}`);
        this.logger.info(`  WebSocket Port: ${config.wsPort}`);
        this.logger.info(`  Listening Address: ${config.host}`);
        this.logger.info(`  Streaming Mode: ${config.streamingMode}`);
        this.logger.info(`  Session Selection: ${config.sessionSelectionStrategy}`);
        this.logger.info(`  Browser Error Threshold: ${config.browserWsErrorThreshold}`);
        this.logger.info(`  Switch On Uses: ${config.switchOnUses}`);
        this.logger.info(`  Failure Threshold: ${config.failureThreshold}`);
        this.logger.info(`  Immediate Switch Status Codes: ${config.immediateSwitchStatusCodes.join(",") || "None"}`);
        this.logger.info(`  Force Thinking: ${config.forceThinking}`);
        this.logger.info(`  Force Web Search: ${config.forceWebSearch}`);
        this.logger.info(`  Force URL Context: ${config.forceUrlContext}`);
        this.logger.info(`  Max Retries per Request: ${config.maxRetries} times`);
        this.logger.info(`  Retry Delay: ${config.retryDelay}ms`);
        this.logger.info(`  API Key Source: ${config.apiKeySource}`);

        const proxySummary = getProxySummaryFromEnv();
        if (!proxySummary.enabled) {
            this.logger.info("  Proxy: Disabled");
        } else {
            this.logger.info(`  Proxy: Enabled (${proxySummary.envKey})`);
            this.logger.info(`  Proxy Server: ${proxySummary.server}`);
        }

        this.logger.info("=============================================================");
    }
}

module.exports = ConfigLoader;
