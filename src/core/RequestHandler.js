/**
 * File: src/core/RequestHandler.js
 * Description: Main request handler that processes API requests, manages retries, and coordinates session routing and format conversion
 *
 * Author: iBUHUB
 */

/**
 * Request Handler Module (Refactored)
 * Main request handler that coordinates between other modules
 */
const FormatConverter = require("./FormatConverter");
const { isUserAbortedError } = require("../utils/CustomErrors");
const { QueueClosedError, QueueTimeoutError } = require("../utils/MessageQueue");

// Timeout constants (in milliseconds)
const TIMEOUTS = {
    FAKE_STREAM: 300000, // 300 seconds (5 minutes) - timeout for fake streaming (buffered response)
    STREAM_CHUNK: 60000, // 60 seconds - timeout between stream chunks
};

class RequestHandler {
    constructor(serverSystem, connectionRegistry, logger, config) {
        this.serverSystem = serverSystem;
        this.connectionRegistry = connectionRegistry;
        this.logger = logger;
        this.config = config || {};

        this.sessionState = {
            currentSessionId: null,
            switchToNextSession: async excludedConnectionIds => this._switchToNextSession(excludedConnectionIds),
        };
        this.formatConverter = new FormatConverter(logger, serverSystem);

        this.maxRetries = this.config.maxRetries;
        this.retryDelay = this.config.retryDelay;
        this.timeouts = TIMEOUTS;
    }

    get currentSessionId() {
        return this.sessionState.currentSessionId;
    }

    set currentSessionId(value) {
        this.sessionState.currentSessionId = value;
    }

    get isSystemBusy() {
        return false;
    }

    _selectConnection(excludedConnectionIds = new Set()) {
        return this.connectionRegistry.pickConnection(this.config.sessionSelectionStrategy, excludedConnectionIds);
    }

    _incrementSessionUsageCount(connectionId = this.currentSessionId) {
        if (!connectionId) {
            return 0;
        }

        return this.connectionRegistry.recordConnectionUsage(connectionId);
    }

    async _switchToNextSession(excludedConnectionIds = new Set()) {
        const nextConnection = this.connectionRegistry.switchToNextConnection(
            this.currentSessionId,
            this.config.sessionSelectionStrategy,
            excludedConnectionIds
        );
        if (!nextConnection) {
            return false;
        }

        const previousConnectionId = this.currentSessionId;
        this.currentSessionId = nextConnection.connectionId;
        this.logger.info(
            `[Session] Switched session from ${previousConnectionId || "(unassigned)"} to ${this.currentSessionId} via ${this.config.sessionSelectionStrategy}.`
        );
        return true;
    }

    async _waitForGraceReconnect(timeoutMs = 60000) {
        return this._waitForConnection(timeoutMs);
    }

    _isConnectionResetError(error) {
        if (!error) return false;
        // Check for QueueClosedError type
        if (error instanceof QueueClosedError) return true;
        // Check for error code
        if (error.code === "QUEUE_CLOSED") return true;
        // Fallback to message check for backward compatibility
        if (error.message) {
            return (
                error.message.includes("Queue closed") ||
                error.message.includes("Queue is closed") ||
                error.message.includes("Connection lost")
            );
        }
        return false;
    }

    _isQueueTimeoutError(error) {
        if (!error) return false;
        return error instanceof QueueTimeoutError || error.code === "QUEUE_TIMEOUT";
    }

    _getErrorStatusCode(error, fallbackStatus = 500) {
        if (this._isQueueTimeoutError(error)) {
            return 504;
        }

        if (this._isConnectionResetError(error)) {
            return 503;
        }

        const explicitStatus = Number(error?.status);
        if (Number.isFinite(explicitStatus) && explicitStatus >= 400) {
            return explicitStatus;
        }

        return fallbackStatus;
    }

    _getGeminiErrorStatusText(statusCode) {
        const geminiStatusMap = {
            400: "INVALID_ARGUMENT",
            401: "UNAUTHENTICATED",
            403: "PERMISSION_DENIED",
            404: "NOT_FOUND",
            409: "ABORTED",
            429: "RESOURCE_EXHAUSTED",
            499: "CANCELLED",
            500: "INTERNAL",
            501: "UNIMPLEMENTED",
            503: "UNAVAILABLE",
            504: "DEADLINE_EXCEEDED",
        };

        return geminiStatusMap[statusCode] || "UNKNOWN";
    }

    _logGeminiNativeChunkDebug(googleChunk, mode = "stream") {
        this.logger.debug(`[Proxy] Debug: Received Google chunk for Gemini native ${mode}: ${googleChunk}`);
    }

    _logGeminiNativeResponseDebug(googleResponse, mode = "non-stream") {
        try {
            this.logger.debug(
                `[Proxy] Debug: Received Google response for Gemini native ${mode}: ${JSON.stringify(googleResponse)}`
            );
        } catch (e) {
            this.logger.debug(
                `[Proxy] Debug: Received Google response for Gemini native ${mode} (non-serializable): ${String(
                    googleResponse
                )}`
            );
        }
    }

    _handleRealStreamQueueClosedError(error, res, format) {
        const isClientDisconnect = error.reason === "client_disconnect" || !this._isResponseWritable(res);

        if (isClientDisconnect) {
            this.logger.debug(
                `[Request] ${format} stream interrupted by client disconnect (reason: ${error.reason || "connection_lost"})`
            );
            return true;
        }

        this.logger.warn(
            `[Request] ${format} stream interrupted: Queue closed (reason: ${error.reason || "unknown"}), sending error SSE`
        );

        if (!this._isResponseWritable(res)) {
            return true;
        }

        try {
            const errorMessage = `Stream interrupted: ${error.reason === "page_closed" ? "Session context closed" : error.reason || "Connection lost"}`;

            if (format === "claude") {
                res.write(
                    `event: error\ndata: ${JSON.stringify({
                        error: {
                            message: errorMessage,
                            type: "api_error",
                        },
                        type: "error",
                    })}\n\n`
                );
            } else if (format === "openai") {
                res.write(
                    `data: ${JSON.stringify({
                        error: {
                            code: 503,
                            message: errorMessage,
                            type: "api_error",
                        },
                    })}\n\n`
                );
            } else if (format === "response_api") {
                if (res.__responseApiSeq == null) res.__responseApiSeq = 0;
                res.__responseApiSeq += 1;
                res.write(
                    `event: error\ndata: ${JSON.stringify({
                        code: "service_unavailable",
                        message: `Service unavailable: ${errorMessage}`,
                        param: null,
                        sequence_number: res.__responseApiSeq,
                        type: "error",
                    })}\n\n`
                );
            } else if (format === "gemini") {
                res.write(
                    `data: ${JSON.stringify({
                        error: {
                            code: 503,
                            message: errorMessage,
                            status: "UNAVAILABLE",
                        },
                    })}\n\n`
                );
            }
        } catch (writeError) {
            this.logger.debug(`[Request] Failed to write error to ${format} stream: ${writeError.message}`);
        }

        return true;
    }

    _handleFakeStreamError(error, res, format) {
        if (!this._isResponseWritable(res)) {
            return;
        }

        try {
            let errorPayload;

            if (error.code === "QUEUE_TIMEOUT" || error instanceof QueueTimeoutError) {
                if (format === "openai") {
                    errorPayload = {
                        error: {
                            code: 504,
                            message: `Stream timeout: ${error.message}`,
                            type: "timeout_error",
                        },
                    };
                    if (this._isResponseWritable(res)) {
                        res.write(`data: ${JSON.stringify(errorPayload)}\n\n`);
                    }
                } else if (format === "claude") {
                    errorPayload = {
                        error: {
                            message: `Stream timeout: ${error.message}`,
                            type: "timeout_error",
                        },
                        type: "error",
                    };
                    if (this._isResponseWritable(res)) {
                        res.write(`event: error\ndata: ${JSON.stringify(errorPayload)}\n\n`);
                    }
                } else if (format === "response_api") {
                    errorPayload = {
                        code: "timeout_error",
                        message: `Stream timeout: ${error.message}`,
                        param: null,
                        sequence_number: 0,
                        type: "error",
                    };
                    if (res.__responseApiSeq == null) res.__responseApiSeq = 0;
                    res.__responseApiSeq += 1;
                    errorPayload.sequence_number = res.__responseApiSeq;
                    if (this._isResponseWritable(res)) {
                        res.write(`event: error\ndata: ${JSON.stringify(errorPayload)}\n\n`);
                    }
                } else {
                    errorPayload = {
                        error: {
                            code: 504,
                            message: `Stream timeout: ${error.message}`,
                            status: "DEADLINE_EXCEEDED",
                        },
                    };
                    if (this._isResponseWritable(res)) {
                        res.write(`data: ${JSON.stringify(errorPayload)}\n\n`);
                    }
                }
            } else if (error.code === "QUEUE_CLOSED" || error instanceof QueueClosedError) {
                if (format === "openai") {
                    errorPayload = {
                        error: {
                            code: 503,
                            message: `Service unavailable: ${error.message}`,
                            type: "service_unavailable",
                        },
                    };
                    if (this._isResponseWritable(res)) {
                        res.write(`data: ${JSON.stringify(errorPayload)}\n\n`);
                    }
                } else if (format === "claude") {
                    errorPayload = {
                        error: {
                            message: `Service unavailable: ${error.message}`,
                            type: "overloaded_error",
                        },
                        type: "error",
                    };
                    if (this._isResponseWritable(res)) {
                        res.write(`event: error\ndata: ${JSON.stringify(errorPayload)}\n\n`);
                    }
                } else if (format === "response_api") {
                    errorPayload = {
                        code: "service_unavailable",
                        message: `Service unavailable: ${error.message}`,
                        param: null,
                        sequence_number: 0,
                        type: "error",
                    };
                    if (res.__responseApiSeq == null) res.__responseApiSeq = 0;
                    res.__responseApiSeq += 1;
                    errorPayload.sequence_number = res.__responseApiSeq;
                    if (this._isResponseWritable(res)) {
                        res.write(`event: error\ndata: ${JSON.stringify(errorPayload)}\n\n`);
                    }
                } else {
                    errorPayload = {
                        error: {
                            code: 503,
                            message: `Service unavailable: ${error.message}`,
                            status: "UNAVAILABLE",
                        },
                    };
                    if (this._isResponseWritable(res)) {
                        res.write(`data: ${JSON.stringify(errorPayload)}\n\n`);
                    }
                }
            } else {
                throw error;
            }
        } catch (writeError) {
            this.logger.debug(`[Request] Failed to write fake stream error to client: ${writeError.message}`);
            throw error;
        }
    }

    _logFinalRequestFailure(errorDetails, contextLabel = "Request") {
        this.logger.error(
            `[Request] ${contextLabel} failed after retries. Status code: ${errorDetails?.status || 500}, message: ${errorDetails?.message || "Unknown error"}`
        );
    }

    /**
     * Handle missing browser sessions in the browser-owned architecture.
     * @returns {boolean} true if a usable session is available, false otherwise
     */
    async _handleBrowserRecovery(res) {
        if (this.currentSessionId && this.connectionRegistry.getConnectionBySession(this.currentSessionId)) {
            return true;
        }

        this._sendErrorResponse(res, 503, "No browser session is currently connected.");
        return false;
    }

    async _waitForConnection(timeoutMs = 10000) {
        const startTime = Date.now();
        const checkInterval = 200;

        while (Date.now() - startTime < timeoutMs) {
            const connection = this.connectionRegistry.getConnectionBySession(this.currentSessionId);
            if (connection && connection.readyState === 1) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }

        this.logger.warn(
            `[Request] Timeout waiting for WebSocket connection for browser session ${this.currentSessionId || "(unassigned)"}.`
        );
        return false;
    }

    async _waitForSystemReady() {
        return true;
    }

    async _waitForSystemAndConnectionIfBusy(res = null, options = {}) {
        const {
            connectionMessage = "Service temporarily unavailable: No browser session connected.",
            connectionTimeoutMs = 1000,
            onConnectionTimeout,
            sendError = res ? (status, message) => this._sendErrorResponse(res, status, message) : () => {},
        } = options;

        const connectionReady = await this._waitForConnection(connectionTimeoutMs);
        if (!connectionReady) {
            if (typeof onConnectionTimeout === "function") {
                try {
                    onConnectionTimeout();
                } catch (e) {
                    this.logger.debug(`[System] onConnectionTimeout handler failed: ${e.message}`);
                }
            }
            sendError(503, connectionMessage);
            return false;
        }

        return true;
    }

    _createImmediateSwitchTracker() {
        const attemptedSessionIds = new Set();
        if (this.currentSessionId) {
            attemptedSessionIds.add(this.currentSessionId);
        }
        return { attemptedSessionIds };
    }

    _shouldSwitchSessionOnError(errorDetails) {
        if (!errorDetails || isUserAbortedError(errorDetails)) {
            return false;
        }

        if (this._isConnectionResetError(errorDetails)) {
            return errorDetails.reason !== "client_disconnect";
        }

        return true;
    }

    _describeErrorForSessionSwitch(errorDetails) {
        const status = this._getErrorStatusCode(errorDetails, NaN);
        if (Number.isFinite(status)) {
            return `Received ${status}`;
        }

        if (errorDetails?.reason) {
            return `Received queue closure (${errorDetails.reason})`;
        }

        return `Received error: ${errorDetails?.message || "unknown error"}`;
    }

    async _performImmediateSwitchRetry(errorDetails, requestId, tracker) {
        const switched = await this.sessionState.switchToNextSession(tracker.attemptedSessionIds);
        if (!switched) {
            this.logger.warn(
                `[Request] Immediate switch for request #${requestId} did not find another available browser session.`
            );
            return false;
        }

        tracker.attemptedSessionIds.add(this.currentSessionId);
        return true;
    }

    // Process standard Google API requests
    async processRequest(req, res) {
        const requestId = this._generateRequestId();
        res.__proxyResponseStreamMode = null;

        const selectedConnection = this._selectConnection();
        if (!selectedConnection) {
            this._sendErrorResponse(res, 503, "No browser session is currently connected.");
            return;
        }
        this.currentSessionId = selectedConnection.connectionId;

        // Check current session's browser connection
        if (!this.connectionRegistry.getConnectionBySession(this.currentSessionId)) {
            this.logger.warn(`[Request] No WebSocket connection for session ${this.currentSessionId}`);
            const recovered = await this._handleBrowserRecovery(res);
            if (!recovered) return;
        }

        // Wait for system to become ready if it's busy
        {
            const ready = await this._waitForSystemAndConnectionIfBusy(res);
            if (!ready) return;
        }
        const isGenerativeRequest =
            req.method === "POST" &&
            (req.path.includes("generateContent") || req.path.includes("streamGenerateContent"));

        const proxyRequest = this._buildProxyRequest(req, requestId);
        proxyRequest.is_generative = isGenerativeRequest;
        this._initializeProxyRequestAttempt(proxyRequest);

        const wantsStream = req.path.includes(":streamGenerateContent");
        res.__proxyResponseStreamMode = wantsStream ? proxyRequest.streaming_mode : null;

        try {
            // Create message queue inside try-catch to handle an invalid session selection
            const messageQueue = this.connectionRegistry.createMessageQueue(
                requestId,
                this.currentSessionId,
                proxyRequest.request_attempt_id
            );
            this._setupClientDisconnectHandler(res, requestId);

            if (wantsStream) {
                this.logger.info(
                    `[Request] Client enabled streaming (${proxyRequest.streaming_mode}), entering streaming processing mode...`
                );
                if (proxyRequest.streaming_mode === "fake") {
                    await this._handlePseudoStreamResponse(proxyRequest, messageQueue, req, res);
                } else {
                    await this._handleRealStreamResponse(proxyRequest, messageQueue, req, res);
                }
            } else {
                proxyRequest.streaming_mode = "fake";
                await this._handleNonStreamResponse(proxyRequest, messageQueue, req, res);
            }
        } catch (error) {
            // Handle queue timeout by notifying browser
            this._handleQueueTimeout(error, requestId);

            this._handleRequestError(error, res, "gemini");
        } finally {
            this.connectionRegistry.removeMessageQueue(requestId, "request_complete");
            if (!res.writableEnded) res.end();
        }
    }

    // Process OpenAI format requests
    async processOpenAIRequest(req, res) {
        const requestId = this._generateRequestId();
        res.__proxyResponseStreamMode = null;

        const selectedConnection = this._selectConnection();
        if (!selectedConnection) {
            this._sendErrorResponse(res, 503, "No browser session is currently connected.");
            return;
        }
        this.currentSessionId = selectedConnection.connectionId;

        // Check current session's browser connection
        if (!this.connectionRegistry.getConnectionBySession(this.currentSessionId)) {
            this.logger.warn(`[Request] No WebSocket connection for session ${this.currentSessionId}`);
            const recovered = await this._handleBrowserRecovery(res);
            if (!recovered) return;
        }

        // Wait for system to become ready if it's busy
        {
            const ready = await this._waitForSystemAndConnectionIfBusy(res);
            if (!ready) return;
        }
        const isOpenAIStream = req.body.stream === true;
        const systemStreamMode = this.serverSystem.streamingMode;

        // Translate OpenAI format to Google format (also handles model name suffix parsing)
        let googleBody, model, modelStreamingMode;
        try {
            const result = await this.formatConverter.translateOpenAIToGoogle(req.body);
            googleBody = result.googleRequest;
            model = result.cleanModelName;
            modelStreamingMode = result.modelStreamingMode || null;
        } catch (error) {
            this.logger.error(`[Adapter] OpenAI request translation failed: ${error.message}`);
            return this._sendErrorResponse(res, 400, "Invalid OpenAI request format.");
        }

        const effectiveStreamMode = modelStreamingMode || systemStreamMode;
        const useRealStream = isOpenAIStream && effectiveStreamMode === "real";

        const googleEndpoint = useRealStream ? "streamGenerateContent" : "generateContent";
        const proxyRequest = {
            body: JSON.stringify(googleBody),
            headers: { "Content-Type": "application/json" },
            is_generative: true,
            method: "POST",
            path: `/v1beta/models/${model}:${googleEndpoint}`,
            query_params: useRealStream ? { alt: "sse" } : {},
            request_id: requestId,
            streaming_mode: useRealStream ? "real" : "fake",
        };
        this._initializeProxyRequestAttempt(proxyRequest);
        res.__proxyResponseStreamMode = isOpenAIStream ? (useRealStream ? "real" : "fake") : null;

        try {
            // Create message queue inside try-catch to handle an invalid session selection
            const messageQueue = this.connectionRegistry.createMessageQueue(
                requestId,
                this.currentSessionId,
                proxyRequest.request_attempt_id
            );
            this._setupClientDisconnectHandler(res, requestId);

            if (useRealStream) {
                let currentQueue = messageQueue;
                let initialMessage;
                let skipFinalFailureSwitch = false;
                const immediateSwitchTracker = this._createImmediateSwitchTracker();

                // eslint-disable-next-line no-constant-condition
                while (true) {
                    this._forwardRequest(proxyRequest);
                    initialMessage = await currentQueue.dequeue();

                    if (initialMessage.event_type === "error" && this._shouldSwitchSessionOnError(initialMessage)) {
                        this.logger.warn(
                            `[Request] OpenAI real stream ${this._describeErrorForSessionSwitch(initialMessage)}, switching session and retrying...`
                        );
                        const switched = await this._performImmediateSwitchRetry(
                            initialMessage,
                            requestId,
                            immediateSwitchTracker
                        );
                        if (!switched) {
                            skipFinalFailureSwitch = true;
                            break;
                        }

                        try {
                            currentQueue.close("retry_after_429");
                        } catch {
                            /* empty */
                        }
                        this._advanceProxyRequestAttempt(proxyRequest);
                        currentQueue = this.connectionRegistry.createMessageQueue(
                            requestId,
                            this.currentSessionId,
                            proxyRequest.request_attempt_id
                        );
                        continue;
                    }

                    break;
                }

                if (initialMessage.event_type === "error") {
                    this._logFinalRequestFailure(initialMessage, "OpenAI real stream");

                    // Send standard HTTP error response
                    this._sendErrorResponse(res, initialMessage.status || 500, initialMessage.message);

                    if (skipFinalFailureSwitch) {
                        this.logger.info(
                            "[Request] Immediate-switch retries exhausted, skipping additional session switch."
                        );
                    } else if (this._isConnectionResetError(initialMessage)) {
                        this.logger.info(
                            "[Request] Failure due to connection reset (Real Stream), skipping session switch."
                        );
                    }
                    return;
                }

                res.status(200).set({
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                    "Content-Type": "text/event-stream",
                });
                this.logger.info(`[Request] OpenAI streaming response (Real Mode) started...`);
                await this._streamOpenAIResponse(currentQueue, res, model);
            } else {
                // OpenAI Fake Stream / Non-Stream mode
                // Set up keep-alive timer for fake stream mode to prevent client timeout
                let connectionMaintainer;
                if (isOpenAIStream) {
                    const scheduleNextKeepAlive = () => {
                        const randomInterval = 12000 + Math.floor(Math.random() * 6000); // 12 - 18 seconds
                        connectionMaintainer = setTimeout(() => {
                            if (!res.headersSent) {
                                res.status(200).set({
                                    "Cache-Control": "no-cache",
                                    Connection: "keep-alive",
                                    "Content-Type": "text/event-stream",
                                });
                            }
                            if (!res.writableEnded) {
                                res.write(": keep-alive\n\n");
                                scheduleNextKeepAlive();
                            }
                        }, randomInterval);
                    };
                    scheduleNextKeepAlive();
                }

                try {
                    const result = await this._executeRequestWithRetries(proxyRequest, messageQueue);

                    if (!result.success) {
                        this._logFinalRequestFailure(result.error, "OpenAI fake/non-stream");
                        // Send standard HTTP error response for both streaming and non-streaming
                        if (connectionMaintainer) clearTimeout(connectionMaintainer);
                        if (isOpenAIStream && res.headersSent) {
                            // If keep-alives already started the SSE response, send an SSE error event instead of JSON.
                            this._handleRequestError(result.error, res, "openai");
                        } else {
                            this._sendErrorResponse(res, result.error.status || 500, result.error.message);
                        }

                        if (result.error.skipSessionSwitch) {
                            this.logger.info(
                                "[Request] Immediate-switch retries exhausted, skipping additional session switch."
                            );
                        } else if (this._isConnectionResetError(result.error)) {
                            this.logger.info(
                                "[Request] Failure due to connection reset (OpenAI), skipping session switch."
                            );
                        }
                        return;
                    }

                    // Use the queue that successfully received the initial message
                    const activeQueue = result.queue;

                    if (isOpenAIStream) {
                        // Fake stream - ensure headers are set before sending data
                        if (!res.headersSent) {
                            res.status(200).set({
                                "Cache-Control": "no-cache",
                                Connection: "keep-alive",
                                "Content-Type": "text/event-stream",
                            });
                        }
                        // Clear keep-alive timer as we are about to send real data
                        if (connectionMaintainer) clearTimeout(connectionMaintainer);

                        this.logger.info(`[Request] OpenAI streaming response (Fake Mode) started...`);
                        let fullBody = "";
                        let hadStreamError = false;
                        try {
                            // eslint-disable-next-line no-constant-condition
                            while (true) {
                                const message = await activeQueue.dequeue(this.timeouts.FAKE_STREAM);
                                if (message.type === "STREAM_END") {
                                    break;
                                }

                                if (message.event_type === "error") {
                                    this.logger.error(
                                        `[Request] Error received during OpenAI fake stream: ${message.message}`
                                    );
                                    hadStreamError = true;
                                    // Check if response is still writable before attempting to write
                                    if (this._isResponseWritable(res)) {
                                        try {
                                            res.write(
                                                `data: ${JSON.stringify({ error: { code: 500, message: message.message, type: "api_error" } })}\n\n`
                                            );
                                        } catch (writeError) {
                                            this.logger.debug(
                                                `[Request] Failed to write error to OpenAI fake stream: ${writeError.message}`
                                            );
                                        }
                                    }
                                    break;
                                }

                                if (message.data) fullBody += message.data;
                            }
                            if (hadStreamError) {
                                // Backend errored; don't attempt to translate/send a "normal" stream afterwards.
                                return;
                            }
                            const streamState = {};
                            const translatedChunk = this.formatConverter.translateGoogleToOpenAIStream(
                                fullBody,
                                model,
                                streamState
                            );
                            if (this._isResponseWritable(res)) {
                                try {
                                    if (translatedChunk) {
                                        res.write(translatedChunk);
                                    }
                                    res.write("data: [DONE]\n\n");
                                } catch (writeError) {
                                    this.logger.debug(
                                        `[Request] Failed to write final fake OpenAI stream chunks: ${writeError.message}`
                                    );
                                }
                            } else {
                                this.logger.debug(
                                    "[Request] Response no longer writable before final fake OpenAI stream chunks."
                                );
                            }
                            this.logger.info("[Request] Fake mode: Complete content sent at once.");
                        } catch (error) {
                            // Classify error type and send appropriate response
                            this._handleFakeStreamError(error, res, "openai");
                        }
                    } else {
                        // Non-stream
                        await this._sendOpenAINonStreamResponse(activeQueue, res, model);
                    }
                } finally {
                    if (connectionMaintainer) clearTimeout(connectionMaintainer);
                }
            }
        } catch (error) {
            // Handle queue timeout by notifying browser
            this._handleQueueTimeout(error, requestId);

            this._handleRequestError(error, res);
        } finally {
            this.connectionRegistry.removeMessageQueue(requestId, "request_complete");
            if (!res.writableEnded) res.end();
        }
    }

    // Process OpenAI Response API format requests
    async processOpenAIResponseRequest(req, res) {
        const requestId = this._generateRequestId();
        res.__proxyResponseStreamMode = null;

        const selectedConnection = this._selectConnection();
        if (!selectedConnection) {
            this._sendErrorResponse(res, 503, "No browser session is currently connected.");
            return;
        }
        this.currentSessionId = selectedConnection.connectionId;

        // Check current session's browser connection
        if (!this.connectionRegistry.getConnectionBySession(this.currentSessionId)) {
            this.logger.warn(`[Request] No WebSocket connection for session ${this.currentSessionId}`);
            const recovered = await this._handleBrowserRecovery(res);
            if (!recovered) return;
        }

        // Wait for system to become ready if it's busy
        {
            const ready = await this._waitForSystemAndConnectionIfBusy(res);
            if (!ready) return;
        }
        const isOpenAIStream = req.body.stream === true;
        const normalizeInstructions = value => {
            if (typeof value === "string") return value;
            if (!Array.isArray(value)) return null;
            const chunks = [];
            for (const item of value) {
                if (!item || typeof item !== "object") continue;
                const content = item.content;
                if (typeof content === "string") {
                    chunks.push(content);
                    continue;
                }
                if (!Array.isArray(content)) continue;
                for (const part of content) {
                    if (!part || typeof part !== "object") continue;
                    if (part.type === "text" || part.type === "input_text") {
                        if (typeof part.text === "string" && part.text) chunks.push(part.text);
                    }
                }
            }
            return chunks.length > 0 ? chunks.join("\n") : null;
        };
        const responseDefaultsRaw = {
            instructions: normalizeInstructions(req.body?.instructions),
            max_output_tokens: req.body?.max_output_tokens ?? null,
            metadata:
                req.body?.metadata && typeof req.body.metadata === "object" && !Array.isArray(req.body.metadata)
                    ? req.body.metadata
                    : {},
            parallel_tool_calls:
                typeof req.body?.parallel_tool_calls === "boolean" ? req.body.parallel_tool_calls : true,
            reasoning:
                req.body?.reasoning && typeof req.body.reasoning === "object" && !Array.isArray(req.body.reasoning)
                    ? req.body.reasoning
                    : undefined,
            temperature: typeof req.body?.temperature === "number" ? req.body.temperature : undefined,
            text:
                req.body?.text && typeof req.body.text === "object" && !Array.isArray(req.body.text)
                    ? req.body.text
                    : undefined,
            tool_choice: req.body?.tool_choice ?? undefined,
            tools: Array.isArray(req.body?.tools) ? req.body.tools : undefined,
            top_p: typeof req.body?.top_p === "number" ? req.body.top_p : undefined,
            truncation: typeof req.body?.truncation === "string" ? req.body.truncation : undefined,
            user: typeof req.body?.user === "string" ? req.body.user : undefined,
        };

        const responseDefaults = Object.fromEntries(
            Object.entries(responseDefaultsRaw).filter(([, v]) => v !== undefined)
        );
        const systemStreamMode = this.serverSystem.streamingMode;

        // Handle usage counting
        // Translate OpenAI Response format to Google format
        let googleBody, model, modelStreamingMode;
        try {
            const result = await this.formatConverter.translateOpenAIResponseToGoogle(req.body);
            googleBody = result.googleRequest;
            model = result.cleanModelName;
            modelStreamingMode = result.modelStreamingMode || null;
        } catch (error) {
            this.logger.error(`[Adapter] OpenAI Response request translation failed: ${error.message}`);
            return this._sendErrorResponse(res, 400, "Invalid OpenAI Response request format.");
        }

        const effectiveStreamMode = modelStreamingMode || systemStreamMode;
        const useRealStream = isOpenAIStream && effectiveStreamMode === "real";

        const googleEndpoint = useRealStream ? "streamGenerateContent" : "generateContent";
        const proxyRequest = {
            body: JSON.stringify(googleBody),
            headers: { "Content-Type": "application/json" },
            is_generative: true,
            method: "POST",
            path: `/v1beta/models/${model}:${googleEndpoint}`,
            query_params: useRealStream ? { alt: "sse" } : {},
            request_id: requestId,
            streaming_mode: useRealStream ? "real" : "fake",
        };
        this._initializeProxyRequestAttempt(proxyRequest);
        res.__proxyResponseStreamMode = isOpenAIStream ? (useRealStream ? "real" : "fake") : null;

        try {
            // Create message queue inside try-catch to handle an invalid session selection
            const messageQueue = this.connectionRegistry.createMessageQueue(
                requestId,
                this.currentSessionId,
                proxyRequest.request_attempt_id
            );
            this._setupClientDisconnectHandler(res, requestId);

            if (useRealStream) {
                let currentQueue = messageQueue;
                let initialMessage;
                let skipFinalFailureSwitch = false;
                const immediateSwitchTracker = this._createImmediateSwitchTracker();

                // eslint-disable-next-line no-constant-condition
                while (true) {
                    this._forwardRequest(proxyRequest);
                    initialMessage = await currentQueue.dequeue();

                    if (initialMessage.event_type === "error" && this._shouldSwitchSessionOnError(initialMessage)) {
                        this.logger.warn(
                            `[Request] OpenAI Response API real stream ${this._describeErrorForSessionSwitch(initialMessage)}, switching session and retrying...`
                        );
                        const switched = await this._performImmediateSwitchRetry(
                            initialMessage,
                            requestId,
                            immediateSwitchTracker
                        );
                        if (!switched) {
                            skipFinalFailureSwitch = true;
                            break;
                        }

                        try {
                            currentQueue.close("retry_after_429");
                        } catch {
                            /* empty */
                        }
                        this._advanceProxyRequestAttempt(proxyRequest);
                        currentQueue = this.connectionRegistry.createMessageQueue(
                            requestId,
                            this.currentSessionId,
                            proxyRequest.request_attempt_id
                        );
                        continue;
                    }

                    break;
                }

                if (initialMessage.event_type === "error") {
                    this._logFinalRequestFailure(initialMessage, "OpenAI Response API real stream");

                    // Send standard HTTP error response
                    this._sendErrorResponse(res, initialMessage.status || 500, initialMessage.message);

                    if (skipFinalFailureSwitch) {
                        this.logger.info(
                            "[Request] Immediate-switch retries exhausted, skipping additional session switch."
                        );
                    } else if (this._isConnectionResetError(initialMessage)) {
                        this.logger.info(
                            "[Request] Failure due to connection reset (Real Stream), skipping session switch."
                        );
                    }
                    return;
                }

                res.status(200).set({
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                    "Content-Type": "text/event-stream",
                });
                this.logger.info(`[Request] OpenAI Response API streaming response (Real Mode) started...`);
                await this._streamOpenAIResponseAPIResponse(currentQueue, res, model, {
                    responseDefaults,
                });
            } else {
                // OpenAI Response API Fake Stream / Non-Stream mode
                // Set up keep-alive timer for fake stream mode to prevent client timeout
                let connectionMaintainer;
                if (isOpenAIStream) {
                    const scheduleNextKeepAlive = () => {
                        const randomInterval = 12000 + Math.floor(Math.random() * 6000); // 12 - 18 seconds
                        connectionMaintainer = setTimeout(() => {
                            if (!res.headersSent) {
                                res.status(200).set({
                                    "Cache-Control": "no-cache",
                                    Connection: "keep-alive",
                                    "Content-Type": "text/event-stream",
                                });
                            }
                            if (!res.writableEnded) {
                                res.write(": keep-alive\n\n");
                                scheduleNextKeepAlive();
                            }
                        }, randomInterval);
                    };
                    scheduleNextKeepAlive();
                }

                try {
                    const result = await this._executeRequestWithRetries(proxyRequest, messageQueue);

                    if (!result.success) {
                        this._logFinalRequestFailure(result.error, "OpenAI Response API fake/non-stream");
                        // Send standard HTTP error response for both streaming and non-streaming
                        if (connectionMaintainer) clearTimeout(connectionMaintainer);
                        if (isOpenAIStream && res.headersSent) {
                            // If keep-alives already started the SSE response, send an SSE error event instead of JSON.
                            this._handleRequestError(result.error, res, "response_api");
                        } else {
                            this._sendErrorResponse(res, result.error.status || 500, result.error.message);
                        }

                        if (result.error.skipSessionSwitch) {
                            this.logger.info(
                                "[Request] Immediate-switch retries exhausted, skipping additional session switch."
                            );
                        } else if (this._isConnectionResetError(result.error)) {
                            this.logger.info(
                                "[Request] Failure due to connection reset (Response API), skipping session switch."
                            );
                        }
                        return;
                    }

                    // Use the queue that successfully received the initial message
                    const activeQueue = result.queue;

                    if (isOpenAIStream) {
                        // Fake stream - ensure headers are set before sending data
                        if (!res.headersSent) {
                            res.status(200).set({
                                "Cache-Control": "no-cache",
                                Connection: "keep-alive",
                                "Content-Type": "text/event-stream",
                            });
                        }
                        // Clear keep-alive timer as we are about to send real data
                        if (connectionMaintainer) clearTimeout(connectionMaintainer);

                        this.logger.info(`[Request] OpenAI Response API streaming response (Fake Mode) started...`);
                        let fullBody = "";
                        if (res.__responseApiSeq == null) res.__responseApiSeq = 0;
                        let hadStreamError = false;
                        try {
                            // eslint-disable-next-line no-constant-condition
                            while (true) {
                                const message = await activeQueue.dequeue(this.timeouts.FAKE_STREAM);
                                if (message.type === "STREAM_END") {
                                    break;
                                }

                                if (message.event_type === "error") {
                                    this.logger.error(
                                        `[Request] Error received during OpenAI Response API fake stream: ${message.message}`
                                    );
                                    hadStreamError = true;
                                    // Check if response is still writable before attempting to write
                                    if (this._isResponseWritable(res)) {
                                        try {
                                            res.__responseApiSeq += 1;
                                            res.write(
                                                `event: error\ndata: ${JSON.stringify({
                                                    code: "api_error",
                                                    message: message.message,
                                                    param: null,
                                                    sequence_number: res.__responseApiSeq,
                                                    type: "error",
                                                })}\n\n`
                                            );
                                        } catch (writeError) {
                                            this.logger.debug(
                                                `[Request] Failed to write error to OpenAI Response API fake stream: ${writeError.message}`
                                            );
                                        }
                                    }
                                    break;
                                }

                                if (message.data) fullBody += message.data;
                            }

                            // If backend errored, don't attempt to translate/send a "normal" Responses stream afterwards.
                            if (hadStreamError) {
                                return;
                            }

                            const streamState = {};
                            streamState.responseDefaults = responseDefaults;
                            const translatedChunk = this.formatConverter.translateGoogleToResponseAPIStream(
                                fullBody,
                                model,
                                streamState
                            );
                            if (this._isResponseWritable(res)) {
                                try {
                                    if (translatedChunk) {
                                        res.write(translatedChunk);
                                    }
                                } catch (writeError) {
                                    this.logger.debug(
                                        `[Request] Failed to write final fake OpenAI Response API stream chunks: ${writeError.message}`
                                    );
                                }
                            } else {
                                this.logger.debug(
                                    "[Request] Response no longer writable before final fake OpenAI Response API stream chunks."
                                );
                            }
                            this.logger.info("[Request] Fake mode: Complete content sent at once.");
                        } catch (error) {
                            // Classify error type and send appropriate response
                            this._handleFakeStreamError(error, res, "response_api");
                        }
                    } else {
                        // Non-stream
                        await this._sendOpenAIResponseAPINonStreamResponse(activeQueue, res, model, responseDefaults);
                    }
                } finally {
                    if (connectionMaintainer) clearTimeout(connectionMaintainer);
                }
            }
        } catch (error) {
            // Handle queue timeout by notifying browser
            this._handleQueueTimeout(error, requestId);

            this._handleRequestError(error, res, "response_api");
        } finally {
            this.connectionRegistry.removeMessageQueue(requestId, "request_complete");
            if (!res.writableEnded) res.end();
        }
    }

    // Process Claude API format requests
    async processClaudeRequest(req, res) {
        const requestId = this._generateRequestId();
        res.__proxyResponseStreamMode = null;

        const selectedConnection = this._selectConnection();
        if (!selectedConnection) {
            this._sendClaudeErrorResponse(res, 503, "overloaded_error", "No browser session is currently connected.");
            return;
        }
        this.currentSessionId = selectedConnection.connectionId;

        // Check current session's browser connection
        if (!this.connectionRegistry.getConnectionBySession(this.currentSessionId)) {
            this.logger.warn(`[Request] No WebSocket connection for session ${this.currentSessionId}`);
            const recovered = await this._handleBrowserRecovery(res);
            if (!recovered) return;
        }

        // Wait for system to become ready if it's busy
        {
            const ready = await this._waitForSystemAndConnectionIfBusy(res, {
                sendError: (status, message) => this._sendClaudeErrorResponse(res, status, "overloaded_error", message),
            });
            if (!ready) return;
        }

        const isClaudeStream = req.body.stream === true;
        const systemStreamMode = this.serverSystem.streamingMode;

        // Translate Claude format to Google format
        let googleBody, model, modelStreamingMode;
        try {
            const result = await this.formatConverter.translateClaudeToGoogle(req.body);
            googleBody = result.googleRequest;
            model = result.cleanModelName;
            modelStreamingMode = result.modelStreamingMode || null;
        } catch (error) {
            this.logger.error(`[Adapter] Claude request translation failed: ${error.message}`);
            return this._sendClaudeErrorResponse(res, 400, "invalid_request_error", "Invalid Claude request format.");
        }

        const effectiveStreamMode = modelStreamingMode || systemStreamMode;
        const useRealStream = isClaudeStream && effectiveStreamMode === "real";

        const googleEndpoint = useRealStream ? "streamGenerateContent" : "generateContent";
        const proxyRequest = {
            body: JSON.stringify(googleBody),
            headers: { "Content-Type": "application/json" },
            is_generative: true,
            method: "POST",
            path: `/v1beta/models/${model}:${googleEndpoint}`,
            query_params: useRealStream ? { alt: "sse" } : {},
            request_id: requestId,
            streaming_mode: useRealStream ? "real" : "fake",
        };
        this._initializeProxyRequestAttempt(proxyRequest);
        res.__proxyResponseStreamMode = isClaudeStream ? (useRealStream ? "real" : "fake") : null;

        try {
            // Create message queue inside try-catch to handle an invalid session selection
            const messageQueue = this.connectionRegistry.createMessageQueue(
                requestId,
                this.currentSessionId,
                proxyRequest.request_attempt_id
            );
            this._setupClientDisconnectHandler(res, requestId);

            if (useRealStream) {
                let currentQueue = messageQueue;
                let initialMessage;
                let skipFinalFailureSwitch = false;
                const immediateSwitchTracker = this._createImmediateSwitchTracker();

                // eslint-disable-next-line no-constant-condition
                while (true) {
                    this._forwardRequest(proxyRequest);
                    initialMessage = await currentQueue.dequeue();

                    if (initialMessage.event_type === "error" && this._shouldSwitchSessionOnError(initialMessage)) {
                        this.logger.warn(
                            `[Request] Claude real stream ${this._describeErrorForSessionSwitch(initialMessage)}, switching session and retrying...`
                        );
                        const switched = await this._performImmediateSwitchRetry(
                            initialMessage,
                            requestId,
                            immediateSwitchTracker
                        );
                        if (!switched) {
                            skipFinalFailureSwitch = true;
                            break;
                        }

                        try {
                            currentQueue.close("retry_after_429");
                        } catch {
                            /* empty */
                        }
                        this._advanceProxyRequestAttempt(proxyRequest);
                        currentQueue = this.connectionRegistry.createMessageQueue(
                            requestId,
                            this.currentSessionId,
                            proxyRequest.request_attempt_id
                        );
                        continue;
                    }

                    break;
                }

                if (initialMessage.event_type === "error") {
                    this._logFinalRequestFailure(initialMessage, "Claude real stream");
                    this._sendClaudeErrorResponse(
                        res,
                        initialMessage.status || 500,
                        "api_error",
                        initialMessage.message
                    );
                    if (skipFinalFailureSwitch) {
                        this.logger.info(
                            "[Request] Immediate-switch retries exhausted, skipping additional session switch."
                        );
                    }
                    return;
                }

                res.status(200).set({
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                    "Content-Type": "text/event-stream",
                });
                this.logger.info(`[Request] Claude streaming response (Real Mode) started...`);
                await this._streamClaudeResponse(currentQueue, res, model);
            } else {
                // Claude Fake Stream / Non-Stream mode
                let connectionMaintainer;
                if (isClaudeStream) {
                    const scheduleNextKeepAlive = () => {
                        const randomInterval = 12000 + Math.floor(Math.random() * 6000);
                        connectionMaintainer = setTimeout(() => {
                            if (!res.headersSent) {
                                res.status(200).set({
                                    "Cache-Control": "no-cache",
                                    Connection: "keep-alive",
                                    "Content-Type": "text/event-stream",
                                });
                            }
                            if (!res.writableEnded) {
                                res.write("event: ping\ndata: {}\n\n");
                                scheduleNextKeepAlive();
                            }
                        }, randomInterval);
                    };
                    scheduleNextKeepAlive();
                }

                try {
                    const result = await this._executeRequestWithRetries(proxyRequest, messageQueue);

                    if (!result.success) {
                        this._logFinalRequestFailure(result.error, "Claude fake/non-stream");
                        if (connectionMaintainer) clearTimeout(connectionMaintainer);
                        if (isClaudeStream && res.headersSent) {
                            // If keep-alives already started the SSE response, send an SSE error event instead of JSON.
                            this._handleClaudeRequestError(result.error, res);
                        } else {
                            this._sendClaudeErrorResponse(
                                res,
                                result.error.status || 500,
                                "api_error",
                                result.error.message
                            );
                        }
                        if (result.error.skipSessionSwitch) {
                            this.logger.info(
                                "[Request] Immediate-switch retries exhausted, skipping additional session switch."
                            );
                        }
                        return;
                    }

                    // Use the queue that successfully received the initial message
                    const activeQueue = result.queue;

                    if (isClaudeStream) {
                        // Fake stream
                        if (!res.headersSent) {
                            res.status(200).set({
                                "Cache-Control": "no-cache",
                                Connection: "keep-alive",
                                "Content-Type": "text/event-stream",
                            });
                        }
                        if (connectionMaintainer) clearTimeout(connectionMaintainer);

                        this.logger.info(`[Request] Claude streaming response (Fake Mode) started...`);
                        let fullBody = "";
                        let hadStreamError = false;
                        try {
                            // eslint-disable-next-line no-constant-condition
                            while (true) {
                                const message = await activeQueue.dequeue(this.timeouts.FAKE_STREAM);
                                if (message.type === "STREAM_END") {
                                    break;
                                }

                                if (message.event_type === "error") {
                                    this.logger.error(
                                        `[Request] Error received during Claude fake stream: ${message.message}`
                                    );
                                    hadStreamError = true;
                                    // Check if response is still writable before attempting to write
                                    if (this._isResponseWritable(res)) {
                                        try {
                                            res.write(
                                                `event: error\ndata: ${JSON.stringify({
                                                    error: {
                                                        message: message.message,
                                                        type: "api_error",
                                                    },
                                                    type: "error",
                                                })}\n\n`
                                            );
                                        } catch (writeError) {
                                            this.logger.debug(
                                                `[Request] Failed to write error to Claude fake stream: ${writeError.message}`
                                            );
                                        }
                                    }
                                    break;
                                }

                                if (message.data) fullBody += message.data;
                            }
                            if (hadStreamError) {
                                // Backend errored; don't attempt to translate/send a "normal" stream afterwards.
                                return;
                            }
                            const streamState = {};
                            const translatedChunk = this.formatConverter.translateGoogleToClaudeStream(
                                fullBody,
                                model,
                                streamState
                            );
                            if (this._isResponseWritable(res)) {
                                try {
                                    if (translatedChunk) {
                                        res.write(translatedChunk);
                                    }
                                } catch (writeError) {
                                    this.logger.debug(
                                        `[Request] Failed to write final fake Claude stream chunk: ${writeError.message}`
                                    );
                                }
                            } else {
                                this.logger.debug(
                                    "[Request] Response no longer writable before final fake Claude stream chunk."
                                );
                            }
                            this.logger.info("[Request] Claude fake mode: Complete content sent at once.");
                        } catch (error) {
                            // Classify error type and send appropriate response
                            this._handleFakeStreamError(error, res, "claude");
                        }
                    } else {
                        // Non-stream
                        await this._sendClaudeNonStreamResponse(activeQueue, res, model);
                    }
                } finally {
                    if (connectionMaintainer) clearTimeout(connectionMaintainer);
                }
            }
        } catch (error) {
            // Handle queue timeout by notifying browser
            this._handleQueueTimeout(error, requestId);

            this._handleClaudeRequestError(error, res);
        } finally {
            this.connectionRegistry.removeMessageQueue(requestId, "request_complete");
            if (!res.writableEnded) res.end();
        }
    }

    // Process Claude count tokens request
    async processClaudeCountTokens(req, res) {
        const requestId = this._generateRequestId();

        const selectedConnection = this._selectConnection();
        if (!selectedConnection) {
            this._sendClaudeErrorResponse(res, 503, "overloaded_error", "No browser session is currently connected.");
            return;
        }
        this.currentSessionId = selectedConnection.connectionId;

        // Check current session's browser connection
        if (!this.connectionRegistry.getConnectionBySession(this.currentSessionId)) {
            this.logger.warn(`[Request] No WebSocket connection for session ${this.currentSessionId}`);
            const recovered = await this._handleBrowserRecovery(res);
            if (!recovered) return;
        }

        // Wait for system to become ready if it's busy
        {
            const ready = await this._waitForSystemAndConnectionIfBusy(res, {
                sendError: (status, message) => this._sendClaudeErrorResponse(res, status, "overloaded_error", message),
            });
            if (!ready) return;
        }

        // Translate Claude format to Google format
        let googleBody, model;
        try {
            const result = await this.formatConverter.translateClaudeToGoogle(req.body);
            googleBody = result.googleRequest;
            model = result.cleanModelName;
        } catch (error) {
            this.logger.error(`[Adapter] Claude request translation failed: ${error.message}`);
            return this._sendClaudeErrorResponse(res, 400, "invalid_request_error", "Invalid Claude request format.");
        }

        // Build countTokens request
        // Per Gemini API docs, countTokens accepts:
        // - contents[] (simple mode)
        // - generateContentRequest (full request with model, contents, tools, systemInstruction, etc.)
        const countTokensBody = {
            generateContentRequest: {
                model: `models/${model}`,
                ...googleBody,
            },
        };

        const proxyRequest = {
            body: JSON.stringify(countTokensBody),
            headers: { "Content-Type": "application/json" },
            is_generative: false,
            method: "POST",
            path: `/v1beta/models/${model}:countTokens`,
            query_params: {},
            request_id: requestId,
        };
        this._initializeProxyRequestAttempt(proxyRequest);

        try {
            // Create message queue inside try-catch to handle an invalid session selection
            const messageQueue = this.connectionRegistry.createMessageQueue(
                requestId,
                this.currentSessionId,
                proxyRequest.request_attempt_id
            );
            this._setupClientDisconnectHandler(res, requestId);

            this._forwardRequest(proxyRequest);
            const response = await messageQueue.dequeue();

            if (response.event_type === "error") {
                this.logger.error(
                    `[Request] Received error from browser session. Status code: ${response.status}, message: ${response.message}`
                );
                this._sendClaudeErrorResponse(res, response.status || 500, "api_error", response.message);
                return;
            }

            // For non-streaming requests, consume all chunks until STREAM_END
            let fullBody = "";
            if (response.type !== "STREAM_END") {
                if (response.data) fullBody += response.data;
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    const message = await messageQueue.dequeue();
                    if (message.type === "STREAM_END") {
                        break;
                    }
                    if (message.event_type === "error") {
                        this.logger.error(`[Request] Error received during count tokens: ${message.message}`);
                        return this._sendClaudeErrorResponse(res, 500, "api_error", message.message);
                    }
                    if (message.data) fullBody += message.data;
                }
            }

            // Parse Gemini response
            const geminiResponse = JSON.parse(fullBody || response.body);
            const totalTokens = geminiResponse.totalTokens || 0;

            // Return Claude-compatible response
            res.status(200).json({
                input_tokens: totalTokens,
            });

            this.logger.info(`[Request] Claude count tokens completed: ${totalTokens} input tokens`);
        } catch (error) {
            this._handleClaudeRequestError(error, res);
        } finally {
            this.connectionRegistry.removeMessageQueue(requestId, "request_complete");
            if (!res.writableEnded) res.end();
        }
    }

    // OpenAI Response API count input tokens endpoint
    // Mirrors OpenAI's /v1/responses/input_tokens by returning only the request-side token count.
    async processOpenAIResponseInputTokens(req, res) {
        const requestId = this._generateRequestId();

        const selectedConnection = this._selectConnection();
        if (!selectedConnection) {
            this._sendErrorResponse(res, 503, "No browser session is currently connected.");
            return;
        }
        this.currentSessionId = selectedConnection.connectionId;

        // Check current session's browser connection
        if (!this.connectionRegistry.getConnectionBySession(this.currentSessionId)) {
            this.logger.warn(`[Request] No WebSocket connection for session ${this.currentSessionId}`);
            const recovered = await this._handleBrowserRecovery(res);
            if (!recovered) return;
        }

        // Wait for system to become ready if it's busy
        {
            const ready = await this._waitForSystemAndConnectionIfBusy(res);
            if (!ready) return;
        }

        // Translate OpenAI Response format to Google format (so we can use Gemini countTokens)
        let googleBody, model;
        try {
            const result = await this.formatConverter.translateOpenAIResponseToGoogle(req.body);
            googleBody = result.googleRequest;
            model = result.cleanModelName;
        } catch (error) {
            this.logger.error(`[Adapter] OpenAI Response input_tokens translation failed: ${error.message}`);
            return this._sendErrorResponse(res, 400, "Invalid OpenAI Response request format.");
        }

        // Gemini countTokens accepts either:
        // - contents[]
        // - generateContentRequest (full request; required here because tools/systemInstruction/etc may be present)
        const countTokensBody = {
            generateContentRequest: {
                model: `models/${model}`,
                ...googleBody,
            },
        };

        const proxyRequest = {
            body: JSON.stringify(countTokensBody),
            headers: { "Content-Type": "application/json" },
            is_generative: false,
            method: "POST",
            path: `/v1beta/models/${model}:countTokens`,
            query_params: {},
            request_id: requestId,
        };
        this._initializeProxyRequestAttempt(proxyRequest);

        try {
            const messageQueue = this.connectionRegistry.createMessageQueue(
                requestId,
                this.currentSessionId,
                proxyRequest.request_attempt_id
            );
            this._setupClientDisconnectHandler(res, requestId);

            this._forwardRequest(proxyRequest);
            const response = await messageQueue.dequeue();

            if (response.event_type === "error") {
                this.logger.error(
                    `[Request] Received error from browser session for input_tokens. Status code: ${response.status}, message: ${response.message}`
                );

                this._sendErrorResponse(res, response.status || 500, response.message);

                if (this._isConnectionResetError(response)) {
                    this.logger.info(
                        "[Request] Failure due to connection reset (input_tokens), skipping session switch."
                    );
                }
                return;
            }

            // For non-streaming requests, consume all chunks until STREAM_END
            let fullBody = "";
            if (response.type !== "STREAM_END") {
                if (response.data) fullBody += response.data;
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    const message = await messageQueue.dequeue();
                    if (message.type === "STREAM_END") {
                        break;
                    }
                    if (message.event_type === "error") {
                        this.logger.error(`[Request] Error received during input_tokens count: ${message.message}`);
                        this._sendErrorResponse(res, 500, message.message);
                        return;
                    }
                    if (message.data) fullBody += message.data;
                }
            }

            // Parse Gemini response
            let geminiResponse;
            try {
                geminiResponse = JSON.parse(fullBody || response.body);
            } catch (parseError) {
                this.logger.error(`[Request] Failed to parse countTokens response: ${parseError.message}`);
                this._sendErrorResponse(res, 500, "Failed to parse backend response");
                return;
            }

            const totalTokens = geminiResponse.totalTokens || 0;

            res.status(200).json({
                input_tokens: totalTokens,
            });

            this.logger.info(`[Request] OpenAI Response input_tokens completed: ${totalTokens} input tokens`);
        } catch (error) {
            this._handleRequestError(error, res);
        } finally {
            this.connectionRegistry.removeMessageQueue(requestId, "request_complete");
            if (!res.writableEnded) res.end();
        }
    }

    // === Response Handlers ===

    async _streamClaudeResponse(messageQueue, res, model) {
        const streamState = {};

        try {
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const message = await messageQueue.dequeue(this.timeouts.STREAM_CHUNK);

                if (message.type === "STREAM_END") {
                    this.logger.info("[Request] Claude stream end signal received.");
                    break;
                }

                if (message.event_type === "error") {
                    this.logger.error(`[Request] Error received during Claude stream: ${message.message}`);
                    // Attempt to send error event to client if headers allowed, then close
                    // Check if response is still writable before attempting to write
                    if (this._isResponseWritable(res)) {
                        try {
                            res.write(
                                `event: error\ndata: ${JSON.stringify({
                                    error: {
                                        message: message.message,
                                        type: "api_error",
                                    },
                                    type: "error",
                                })}\n\n`
                            );
                        } catch (writeError) {
                            this.logger.debug(
                                `[Request] Failed to write error to Claude stream: ${writeError.message}`
                            );
                        }
                    }
                    break;
                }

                if (message.data) {
                    const claudeChunk = this.formatConverter.translateGoogleToClaudeStream(
                        message.data,
                        model,
                        streamState
                    );
                    if (claudeChunk) {
                        // Before writing, ensure the response is still writable to avoid
                        // throwing if the client disconnected mid-stream.
                        if (!this._isResponseWritable(res)) {
                            this.logger.debug(
                                "[Request] Response no longer writable during Claude stream; stopping stream."
                            );
                            break;
                        }
                        try {
                            res.write(claudeChunk);
                        } catch (writeError) {
                            this.logger.debug(
                                `[Request] Failed to write Claude chunk to stream: ${writeError.message}`
                            );
                            // Stop streaming on write failure to avoid misclassifying as a timeout.
                            break;
                        }
                    }
                }
            }
        } catch (error) {
            // Only handle connection reset errors here (client disconnect)
            // Let other errors (timeout, parsing, logic errors) propagate to outer catch
            if (this._isConnectionResetError(error)) {
                this._handleRealStreamQueueClosedError(error, res, "claude");
                return;
            }

            // Re-throw all other errors to be handled by outer catch block
            throw error;
        }
    }

    async _sendClaudeNonStreamResponse(messageQueue, res, model) {
        let fullBody = "";
        let receiving = true;
        while (receiving) {
            const message = await messageQueue.dequeue();
            if (message.type === "STREAM_END") {
                this.logger.info("[Request] Claude received end signal.");
                receiving = false;
                break;
            }

            if (message.event_type === "error") {
                this.logger.error(`[Adapter] Error during Claude non-stream conversion: ${message.message}`);
                this._sendClaudeErrorResponse(res, 500, "api_error", message.message);
                return;
            }

            if (message.event_type === "chunk" && message.data) {
                fullBody += message.data;
            }
        }

        try {
            const googleResponse = JSON.parse(fullBody);
            const claudeResponse = this.formatConverter.convertGoogleToClaudeNonStream(googleResponse, model);
            res.type("application/json").send(JSON.stringify(claudeResponse));
        } catch (e) {
            this.logger.error(`[Adapter] Failed to parse response for Claude: ${e.message}`);
            this._sendClaudeErrorResponse(res, 500, "api_error", "Failed to parse backend response");
        }
    }

    _sendClaudeErrorResponse(res, status, errorType, message) {
        if (!res.headersSent) {
            res.status(status)
                .type("application/json")
                .send(
                    JSON.stringify({
                        error: {
                            message,
                            type: errorType,
                        },
                        type: "error",
                    })
                );
        }
    }

    _handleClaudeRequestError(error, res) {
        // Normalize error message to handle non-Error objects and missing/non-string messages
        const errorMsg = String(error?.message ?? error);

        // Check if this is a client disconnect - if so, just log and return
        if (this._isConnectionResetError(error)) {
            const isClientDisconnect = error.reason === "client_disconnect" || !this._isResponseWritable(res);
            if (isClientDisconnect) {
                this.logger.info(`[Request] Request terminated: Queue closed (${error.reason || "connection_lost"})`);
                if (!res.writableEnded) {
                    try {
                        res.end();
                    } catch (e) {
                        // Ignore end errors for disconnected clients
                    }
                }
                return;
            }
        }

        if (res.headersSent) {
            this.logger.error(`[Request] Claude request error (headers already sent): ${errorMsg}`);

            // Try to send error in SSE format if response is still writable
            if (this._isResponseWritable(res)) {
                const contentType = res.getHeader("content-type");

                if (contentType && contentType.includes("text/event-stream")) {
                    try {
                        let errorType = "api_error";
                        const status = this._getErrorStatusCode(error);
                        let errorMessage = `Processing failed: ${errorMsg}`;

                        // Use precise error type checking instead of string matching
                        if (this._isQueueTimeoutError(error)) {
                            errorType = "timeout_error";
                            errorMessage = `Stream timeout: ${errorMsg}`;
                        } else if (this._isConnectionResetError(error)) {
                            errorType = "overloaded_error";
                            errorMessage = `Service unavailable: ${errorMsg}`;
                        }

                        res.write(
                            `event: error\ndata: ${JSON.stringify({
                                error: {
                                    message: errorMessage,
                                    status,
                                    type: errorType,
                                },
                                type: "error",
                            })}\n\n`
                        );
                        this.logger.info("[Request] Claude error event sent to SSE stream");
                    } catch (writeError) {
                        this.logger.error(`[Request] Failed to write error to Claude stream: ${writeError.message}`);
                    }
                }
            }

            if (!res.writableEnded) res.end();
        } else {
            this.logger.error(`[Request] Claude request error: ${errorMsg}`);
            const status = this._getErrorStatusCode(error);
            let errorType = "api_error";
            // Use precise error type checking instead of string matching
            if (this._isQueueTimeoutError(error)) {
                errorType = "timeout_error";
            } else if (this._isConnectionResetError(error)) {
                errorType = "overloaded_error";
                this.logger.info(`[Request] Queue closed, returning 503 Service Unavailable.`);
            }
            this._sendClaudeErrorResponse(res, status, errorType, `Proxy error: ${errorMsg}`);
        }
    }

    async _handlePseudoStreamResponse(proxyRequest, messageQueue, req, res) {
        this.logger.info("[Request] Entering pseudo-stream mode...");

        // Per user request, convert the backend call to non-streaming.
        proxyRequest.path = proxyRequest.path.replace(":streamGenerateContent", ":generateContent");
        if (proxyRequest.query_params && proxyRequest.query_params.alt) {
            delete proxyRequest.query_params.alt;
        }

        let connectionMaintainer;
        const scheduleNextKeepAlive = () => {
            const randomInterval = 12000 + Math.floor(Math.random() * 6000); // 12 - 18 seconds
            connectionMaintainer = setTimeout(() => {
                if (!res.headersSent) {
                    res.setHeader("Content-Type", "text/event-stream");
                    res.setHeader("Cache-Control", "no-cache");
                    res.setHeader("Connection", "keep-alive");
                }
                if (!res.writableEnded) {
                    res.write(": keep-alive\n\n");
                    scheduleNextKeepAlive();
                }
            }, randomInterval);
        };
        scheduleNextKeepAlive();

        try {
            const result = await this._executeRequestWithRetries(proxyRequest, messageQueue);

            if (!result.success) {
                clearTimeout(connectionMaintainer);

                if (isUserAbortedError(result.error)) {
                    this.logger.debug(
                        `[Request] Request #${proxyRequest.request_id} was properly cancelled by user, not counted in failure statistics.`
                    );
                } else {
                    this._logFinalRequestFailure(result.error, "Gemini fake stream");
                    // If keep-alives already started the SSE response, send an SSE error event instead of JSON.
                    if (res.headersSent) {
                        this._handleRequestError(result.error, res, "gemini");
                    } else {
                        this._sendErrorResponse(res, result.error.status || 500, result.error.message);
                    }

                    if (result.error.skipSessionSwitch) {
                        this.logger.info(
                            "[Request] Immediate-switch retries exhausted, skipping additional session switch."
                        );
                    } else if (this._isConnectionResetError(result.error)) {
                        this.logger.info(
                            "[Request] Failure due to connection reset (Gemini Non-Stream), skipping session switch."
                        );
                    }
                }
                return;
            }

            // Use the queue that successfully received the initial message
            const activeQueue = result.queue;

            if (!res.headersSent) {
                res.setHeader("Content-Type", "text/event-stream");
                res.setHeader("Cache-Control", "no-cache");
                res.setHeader("Connection", "keep-alive");
            }
            // Clear the keep-alive timer as we are about to send real data
            clearTimeout(connectionMaintainer);

            // Read all data chunks until STREAM_END to handle potential fragmentation
            let fullData = "";
            let hadStreamError = false;
            try {
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    const message = await activeQueue.dequeue(this.timeouts.FAKE_STREAM); // 5 min timeout for fake streaming
                    if (message.type === "STREAM_END") {
                        break;
                    }

                    if (message.event_type === "error") {
                        this.logger.error(`[Request] Error received during Gemini pseudo-stream: ${message.message}`);
                        hadStreamError = true;
                        this._handleRequestError({ message: message.message }, res, "gemini");
                        break;
                    }

                    if (message.data) {
                        fullData += message.data;
                    }
                }
            } catch (error) {
                // Handle timeout or other errors during streaming
                // Don't attempt to write if it's a connection reset or if response is destroyed
                if (!this._isConnectionResetError(error)) {
                    // Classify error type and send appropriate response
                    this._handleFakeStreamError(error, res, "gemini");
                } else {
                    this.logger.debug(
                        "[Request] Gemini pseudo-stream interrupted by connection reset, skipping error write"
                    );
                }
                // Return early to prevent JSON parsing of incomplete data
                return;
            }
            if (hadStreamError) {
                // Backend errored; don't attempt to parse/split/send "normal" chunks afterwards.
                return;
            }

            try {
                const googleResponse = JSON.parse(fullData);
                this._logGeminiNativeResponseDebug(googleResponse, "pseudo-stream");
                const candidate = googleResponse.candidates?.[0];

                if (candidate && candidate.content && Array.isArray(candidate.content.parts)) {
                    this.logger.debug(
                        "[Request] Splitting full Gemini response into 'thought' and 'content' chunks for pseudo-stream."
                    );

                    const thinkingParts = candidate.content.parts.filter(p => p.thought === true);
                    const contentParts = candidate.content.parts.filter(p => p.thought !== true);
                    const role = candidate.content.role || "model";

                    // Send thinking part first
                    if (thinkingParts.length > 0) {
                        const thinkingResponse = {
                            candidates: [
                                {
                                    content: {
                                        parts: thinkingParts,
                                        role,
                                    },
                                    // We don't include finishReason here
                                },
                            ],
                            // We don't include usageMetadata here
                        };
                        if (!this._isResponseWritable(res)) {
                            this.logger.debug(
                                "[Request] Response no longer writable during Gemini stream (thinking parts); stopping stream."
                            );
                            return;
                        }
                        try {
                            res.write(`data: ${JSON.stringify(thinkingResponse)}\n\n`);
                        } catch (writeError) {
                            this.logger.debug(
                                `[Request] Failed to write Gemini thinking chunk to stream: ${writeError.message}`
                            );
                            return;
                        }
                        this.logger.info(`[Request] Sent ${thinkingParts.length} thinking part(s).`);
                    }

                    // Then send content part
                    if (contentParts.length > 0) {
                        const contentResponse = {
                            candidates: [
                                {
                                    content: {
                                        parts: contentParts,
                                        role,
                                    },
                                    finishReason: candidate.finishReason,
                                    // Other candidate fields can be preserved if needed
                                },
                            ],
                            usageMetadata: googleResponse.usageMetadata,
                        };
                        if (!this._isResponseWritable(res)) {
                            this.logger.debug(
                                "[Request] Response no longer writable during Gemini stream (content parts); stopping stream."
                            );
                            return;
                        }
                        try {
                            res.write(`data: ${JSON.stringify(contentResponse)}\n\n`);
                        } catch (writeError) {
                            this.logger.debug(
                                `[Request] Failed to write Gemini content chunk to stream: ${writeError.message}`
                            );
                            return;
                        }
                        this.logger.info(`[Request] Sent ${contentParts.length} content part(s).`);
                    } else if (candidate.finishReason) {
                        // If there's no content but a finish reason, send an empty content message with it
                        const finalResponse = {
                            candidates: [
                                {
                                    content: { parts: [], role },
                                    finishReason: candidate.finishReason,
                                },
                            ],
                            usageMetadata: googleResponse.usageMetadata,
                        };
                        if (!this._isResponseWritable(res)) {
                            this.logger.debug(
                                "[Request] Response no longer writable during Gemini stream (final response); stopping stream."
                            );
                            return;
                        }
                        try {
                            res.write(`data: ${JSON.stringify(finalResponse)}\n\n`);
                        } catch (writeError) {
                            this.logger.debug(
                                `[Request] Failed to write Gemini final chunk to stream: ${writeError.message}`
                            );
                            return;
                        }
                    }
                } else if (fullData) {
                    // Fallback for responses without candidates or parts, or if parsing fails
                    this.logger.warn(
                        "[Request] Response structure not recognized for splitting, sending as a single chunk."
                    );
                    if (!this._isResponseWritable(res)) {
                        this.logger.debug(
                            "[Request] Response no longer writable during Gemini stream (fallback); stopping stream."
                        );
                        return;
                    }
                    try {
                        res.write(`data: ${fullData}\n\n`);
                    } catch (writeError) {
                        this.logger.debug(
                            `[Request] Failed to write Gemini fallback chunk to stream: ${writeError.message}`
                        );
                        return;
                    }
                }
            } catch (e) {
                this.logger.error(
                    `[Request] Failed to parse and split Gemini response: ${e.message}. Sending raw data.`
                );
                if (fullData) {
                    if (!this._isResponseWritable(res)) {
                        this.logger.debug(
                            "[Request] Response no longer writable during Gemini stream (error fallback); stopping stream."
                        );
                        return;
                    }
                    try {
                        res.write(`data: ${fullData}\n\n`);
                    } catch (writeError) {
                        this.logger.debug(
                            `[Request] Failed to write Gemini error fallback chunk to stream: ${writeError.message}`
                        );
                        return;
                    }
                }
            }

            const finishReason = (() => {
                try {
                    return JSON.parse(fullData).candidates?.[0]?.finishReason || "UNKNOWN";
                } catch {
                    return "UNKNOWN";
                }
            })();
            this.logger.info(
                `✅ [Request] Response ended, reason: ${finishReason}, request ID: ${proxyRequest.request_id}`
            );
        } catch (error) {
            this._handleRequestError(error, res, "gemini");
        } finally {
            clearTimeout(connectionMaintainer);
            if (!res.writableEnded) {
                res.end();
            }
            this.logger.info(`[Request] Response processing ended, request ID: ${proxyRequest.request_id}`);
        }
    }

    async _handleRealStreamResponse(proxyRequest, messageQueue, req, res) {
        this.logger.info(`[Request] Request dispatched to browser for processing...`);
        let currentQueue = messageQueue;
        let headerMessage;
        let skipFinalFailureSwitch = false;
        const immediateSwitchTracker = this._createImmediateSwitchTracker();

        // eslint-disable-next-line no-constant-condition
        while (true) {
            this._forwardRequest(proxyRequest);
            headerMessage = await currentQueue.dequeue();

            if (headerMessage.event_type === "error" && this._shouldSwitchSessionOnError(headerMessage)) {
                this.logger.warn(
                    `[Request] Gemini real stream ${this._describeErrorForSessionSwitch(headerMessage)}, switching session and retrying...`
                );
                const switched = await this._performImmediateSwitchRetry(
                    headerMessage,
                    proxyRequest.request_id,
                    immediateSwitchTracker
                );
                if (!switched) {
                    skipFinalFailureSwitch = true;
                    break;
                }

                try {
                    currentQueue.close("retry_after_429");
                } catch {
                    /* empty */
                }

                this._advanceProxyRequestAttempt(proxyRequest);
                currentQueue = this.connectionRegistry.createMessageQueue(
                    proxyRequest.request_id,
                    this.currentSessionId,
                    proxyRequest.request_attempt_id
                );
                continue;
            }

            break;
        }

        if (headerMessage.event_type === "error") {
            if (isUserAbortedError(headerMessage)) {
                this.logger.debug(
                    `[Request] Request #${proxyRequest.request_id} was properly cancelled by user, not counted in failure statistics.`
                );
            } else {
                this._logFinalRequestFailure(headerMessage, "Gemini real stream");
                if (skipFinalFailureSwitch) {
                    this.logger.info(
                        "[Request] Immediate-switch retries exhausted, skipping additional session switch."
                    );
                } else if (this._isConnectionResetError(headerMessage)) {
                    this.logger.info(
                        "[Request] Failure due to connection reset (Gemini Real Stream), skipping session switch."
                    );
                }
                return this._sendErrorResponse(res, headerMessage.status, headerMessage.message);
            }
            if (!res.writableEnded) res.end();
            return;
        }

        this._setResponseHeaders(res, headerMessage, req);
        // Fallback: Ensure Content-Type is set for streaming response
        if (!res.get("Content-Type")) {
            res.type("text/event-stream");
        }
        this.logger.info("[Request] Starting streaming transmission...");
        try {
            let lastChunk = "";
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const dataMessage = await currentQueue.dequeue(this.timeouts.STREAM_CHUNK);
                if (dataMessage.type === "STREAM_END") {
                    this.logger.info("[Request] Received stream end signal.");
                    break;
                }

                if (dataMessage.event_type === "error") {
                    this.logger.error(`[Request] Error received during Gemini real stream: ${dataMessage.message}`);
                    // Check if response is still writable before attempting to write
                    if (this._isResponseWritable(res)) {
                        try {
                            res.write(
                                `data: ${JSON.stringify({ error: { code: 500, message: dataMessage.message, status: "INTERNAL" } })}\n\n`
                            );
                        } catch (writeError) {
                            this.logger.debug(
                                `[Request] Failed to write error to Gemini real stream: ${writeError.message}`
                            );
                        }
                    }
                    break;
                }

                if (dataMessage.data) {
                    this._logGeminiNativeChunkDebug(dataMessage.data, "stream");
                    if (!this._isResponseWritable(res)) {
                        this.logger.debug(
                            "[Request] Response no longer writable during Gemini real stream; stopping stream."
                        );
                        break;
                    }
                    try {
                        res.write(dataMessage.data);
                        lastChunk = dataMessage.data;
                    } catch (writeError) {
                        this.logger.debug(
                            `[Request] Failed to write Gemini data chunk to stream: ${writeError.message}`
                        );
                        break;
                    }
                }
            }
            try {
                if (lastChunk.startsWith("data: ")) {
                    const jsonString = lastChunk.substring(6).trim();
                    if (jsonString) {
                        const lastResponse = JSON.parse(jsonString);
                        const finishReason = lastResponse.candidates?.[0]?.finishReason || "UNKNOWN";
                        this.logger.info(
                            `✅ [Request] Response ended, reason: ${finishReason}, request ID: ${proxyRequest.request_id}`
                        );
                    }
                }
            } catch (e) {
                // Ignore JSON parsing errors for finish reason
            }
        } catch (error) {
            // Handle queue closed errors (session switch, context closed, etc.)
            if (this._isConnectionResetError(error)) {
                this._handleRealStreamQueueClosedError(error, res, "gemini");
            } else if (error instanceof QueueTimeoutError || error.code === "QUEUE_TIMEOUT") {
                // Keep behavior consistent with other interfaces: treat missing stream chunks as a timeout error.
                this._handleRequestError(error, res, "gemini");
            } else {
                // Unexpected error - rethrow to outer handler
                throw error;
            }
        } finally {
            if (!res.writableEnded) res.end();
            this.logger.info(
                `[Request] Real stream response connection closed, request ID: ${proxyRequest.request_id}`
            );
        }
    }

    async _handleNonStreamResponse(proxyRequest, messageQueue, req, res) {
        this.logger.info(`[Request] Entering non-stream processing mode...`);

        try {
            const result = await this._executeRequestWithRetries(proxyRequest, messageQueue);

            if (!result.success) {
                // If retries failed, return the last browser-side error
                if (isUserAbortedError(result.error)) {
                    this.logger.info(`[Request] Request #${proxyRequest.request_id} was properly cancelled by user.`);
                } else {
                    this._logFinalRequestFailure(result.error, "Gemini non-stream");
                    if (result.error.skipSessionSwitch) {
                        this.logger.info(
                            "[Request] Immediate-switch retries exhausted, skipping additional session switch."
                        );
                    } else if (this._isConnectionResetError(result.error)) {
                        this.logger.info(
                            "[Request] Failure due to connection reset (Gemini Non-Stream), skipping session switch."
                        );
                    }
                }
                return this._sendErrorResponse(res, result.error.status || 500, result.error.message);
            }

            // Use the queue that successfully received the initial message
            const activeQueue = result.queue;

            const headerMessage = result.message;
            const chunks = [];
            let receiving = true;
            while (receiving) {
                const message = await activeQueue.dequeue();
                if (message.type === "STREAM_END") {
                    this.logger.info("[Request] Received end signal, data reception complete.");
                    receiving = false;
                    break;
                }

                if (message.event_type === "error") {
                    this.logger.error(`[Request] Error received during Gemini non-stream: ${message.message}`);
                    this._sendErrorResponse(res, 500, message.message);
                    return;
                }

                if (message.event_type === "chunk" && message.data) {
                    chunks.push(Buffer.from(message.data));
                }
            }

            const fullBodyBuffer = Buffer.concat(chunks);

            try {
                const fullResponse = JSON.parse(fullBodyBuffer.toString());
                this._logGeminiNativeResponseDebug(fullResponse, "non-stream");
                const finishReason = fullResponse.candidates?.[0]?.finishReason || "UNKNOWN";
                this.logger.info(
                    `✅ [Request] Response ended, reason: ${finishReason}, request ID: ${proxyRequest.request_id}`
                );
            } catch (e) {
                // Ignore JSON parsing errors for finish reason
            }

            this._setResponseHeaders(res, headerMessage, req);

            // Ensure Content-Type is set (Express defaults Buffer to application/octet-stream)
            if (!res.get("Content-Type")) {
                res.type("application/json");
            }

            res.send(fullBodyBuffer);

            this.logger.info(`[Request] Complete non-stream response sent to client.`);
        } catch (error) {
            this._handleRequestError(error, res);
        }
    }

    // === Helper Methods ===

    _processImageInResponse(fullBody) {
        try {
            const parsedBody = JSON.parse(fullBody);
            let needsReserialization = false;

            const candidate = parsedBody.candidates?.[0];
            if (candidate?.content?.parts) {
                const imagePartIndex = candidate.content.parts.findIndex(p => p.inlineData);

                if (imagePartIndex > -1) {
                    this.logger.info(
                        "[Proxy] Detected image data in Google format response, converting to Markdown..."
                    );
                    const imagePart = candidate.content.parts[imagePartIndex];
                    const image = imagePart.inlineData;

                    candidate.content.parts[imagePartIndex] = {
                        text: `![Generated Image](data:${image.mimeType};base64,${image.data})`,
                    };
                    needsReserialization = true;
                }
            }

            if (needsReserialization) {
                return JSON.stringify(parsedBody);
            }
        } catch (e) {
            this.logger.warn(
                `[Proxy] Response body is not valid JSON, or error occurred while processing image: ${e.message}`
            );
        }
        return fullBody;
    }

    async _executeRequestWithRetries(proxyRequest, messageQueue) {
        let lastError = null;
        let currentQueue = messageQueue;
        // Track the session id for the current queue to ensure proper cleanup
        let currentQueueSessionId = this.currentSessionId;
        let retryAttempt = 1;
        const immediateSwitchTracker = this._createImmediateSwitchTracker();

        while (retryAttempt <= this.maxRetries) {
            try {
                this._forwardRequest(proxyRequest);

                const initialMessage = await currentQueue.dequeue();

                if (initialMessage.event_type === "timeout") {
                    throw new Error(
                        JSON.stringify({
                            code: "QUEUE_TIMEOUT",
                            event_type: "error",
                            message: "Request timed out waiting for browser response.",
                            status: 504,
                        })
                    );
                }

                if (initialMessage.event_type === "error") {
                    // Throw a structured error to be caught by the catch block
                    throw new Error(JSON.stringify(initialMessage));
                }

                // Success, return the initial message and the queue that received it
                return { message: initialMessage, queue: currentQueue, success: true };
            } catch (error) {
                // Parse the structured error message
                let errorPayload;
                try {
                    errorPayload = JSON.parse(error.message);
                } catch (e) {
                    // JSON parse failed - check if it's a timeout error
                    if (this._isQueueTimeoutError(error)) {
                        errorPayload = { code: error.code, message: error.message || "Queue timeout", status: 504 };
                    } else {
                        errorPayload = { message: error.message, status: 500 };
                    }
                }

                if (this._isQueueTimeoutError(error)) {
                    this._handleQueueTimeout(error, proxyRequest.request_id);
                }

                // Stop retrying immediately if the queue is closed
                if (this._isConnectionResetError(error)) {
                    // Check the actual closure reason to provide accurate error messages
                    const reason = error.reason || "unknown";
                    const isClientDisconnect = reason === "client_disconnect";

                    if (isClientDisconnect) {
                        this.logger.warn(`[Request] Message queue closed due to client disconnect, aborting retries.`);
                        lastError = { message: "Connection lost (client disconnect)", status: 503 };
                        break;
                    }

                    lastError = {
                        code: error.code,
                        message: `Queue closed: ${error.message || reason}`,
                        reason,
                        status: 503,
                    };
                    this.logger.warn(
                        `[Request] ${this._describeErrorForSessionSwitch(lastError)}, switching session and retrying...`
                    );
                    try {
                        const switched = await this._performImmediateSwitchRetry(
                            lastError,
                            proxyRequest.request_id,
                            immediateSwitchTracker
                        );
                        if (!switched) {
                            lastError = { ...lastError, skipSessionSwitch: true };
                            break;
                        }
                    } catch (switchError) {
                        lastError = { ...lastError, skipSessionSwitch: true };
                        this.logger.error(`[Request] Session switch failed during retry flow: ${switchError.message}`);
                        break;
                    }

                    try {
                        currentQueue.close("retry_creating_new_queue");
                    } catch (e) {
                        this.logger.debug(`[Request] Failed to close old queue before retry: ${e.message}`);
                    }

                    this.logger.debug(
                        `[Request] Creating new message queue after session switch for request #${proxyRequest.request_id} (switching from session ${currentQueueSessionId} to ${this.currentSessionId})`
                    );
                    this._advanceProxyRequestAttempt(proxyRequest);
                    currentQueue = this.connectionRegistry.createMessageQueue(
                        proxyRequest.request_id,
                        this.currentSessionId,
                        proxyRequest.request_attempt_id
                    );
                    currentQueueSessionId = this.currentSessionId;
                    continue;
                }

                lastError = errorPayload;

                if (this._shouldSwitchSessionOnError(errorPayload)) {
                    this.logger.warn(
                        `[Request] ${this._describeErrorForSessionSwitch(errorPayload)}, switching session and retrying...`
                    );
                    try {
                        const switched = await this._performImmediateSwitchRetry(
                            errorPayload,
                            proxyRequest.request_id,
                            immediateSwitchTracker
                        );
                        if (!switched) {
                            lastError = { ...errorPayload, skipSessionSwitch: true };
                            break;
                        }
                    } catch (switchError) {
                        lastError = { ...errorPayload, skipSessionSwitch: true };
                        this.logger.error(
                            `[Request] Session switch failed during immediate-switch retry flow: ${switchError.message}`
                        );
                        break;
                    }
                    try {
                        currentQueue.close("retry_creating_new_queue");
                    } catch (e) {
                        this.logger.debug(`[Request] Failed to close old queue before retry: ${e.message}`);
                    }

                    this.logger.debug(
                        `[Request] Creating new message queue after session switch for request #${proxyRequest.request_id} (switching from session ${currentQueueSessionId} to ${this.currentSessionId})`
                    );
                    this._advanceProxyRequestAttempt(proxyRequest);
                    currentQueue = this.connectionRegistry.createMessageQueue(
                        proxyRequest.request_id,
                        this.currentSessionId,
                        proxyRequest.request_attempt_id
                    );
                    currentQueueSessionId = this.currentSessionId;
                    continue;
                }

                // Log the warning for the current attempt
                this.logger.warn(
                    `[Request] Attempt #${retryAttempt}/${this.maxRetries} for request #${proxyRequest.request_id} failed: ${errorPayload.message}`
                );

                // If it's the last attempt, break the loop to return failure
                if (retryAttempt >= this.maxRetries) {
                    this.logger.error(
                        `[Request] All ${this.maxRetries} retries failed for request #${proxyRequest.request_id}. Final error: ${errorPayload.message}`
                    );
                    break;
                }

                // Cancel browser request on the original session that owns this queue.
                // request_attempt_id isolates retries so a delayed cancel cannot abort a newer attempt.
                // If the session has switched, currentSessionId may differ from currentQueueSessionId.
                this._cancelBrowserRequest(
                    proxyRequest.request_id,
                    currentQueueSessionId,
                    proxyRequest.request_attempt_id
                );

                // Explicitly close the old queue before creating a new one
                // This ensures waitingResolvers are properly rejected even if the session changes
                try {
                    currentQueue.close("retry_creating_new_queue");
                } catch (e) {
                    this.logger.debug(`[Request] Failed to close old queue before retry: ${e.message}`);
                }

                // Create a new message queue for the retry with the current session
                // Note: We keep the same requestId so the browser response routes to the new queue
                // createMessageQueue will automatically close and remove any existing queue with the same ID from the registry
                this.logger.debug(
                    `[Request] Creating new message queue for retry #${retryAttempt + 1} for request #${proxyRequest.request_id} (switching from session ${currentQueueSessionId} to ${this.currentSessionId})`
                );
                this._advanceProxyRequestAttempt(proxyRequest);
                currentQueue = this.connectionRegistry.createMessageQueue(
                    proxyRequest.request_id,
                    this.currentSessionId,
                    proxyRequest.request_attempt_id
                );
                // Update tracked session id for the new queue
                currentQueueSessionId = this.currentSessionId;

                // Wait before the next retry
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                retryAttempt++;
            }
        }

        // After all retries, return the final failure result
        return { error: lastError, success: false };
    }

    async _streamOpenAIResponseAPIResponse(messageQueue, res, model, streamOptions = {}) {
        const streamState = {
            responseDefaults: streamOptions.responseDefaults || {},
        };
        // Keep Response API sequence numbers consistent across helpers that might write to the same SSE response.
        if (res.__responseApiSeq == null) res.__responseApiSeq = 0;
        streamState.sequenceNumber = res.__responseApiSeq;

        try {
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const message = await messageQueue.dequeue(this.timeouts.STREAM_CHUNK);
                if (message.type === "STREAM_END") {
                    this.logger.info("[Request] OpenAI Response API stream end signal received.");
                    break;
                }

                if (message.event_type === "error") {
                    this.logger.error(`[Request] Error received during Response API stream: ${message.message}`);
                    if (this._isResponseWritable(res)) {
                        try {
                            if (!streamState.sequenceNumber) streamState.sequenceNumber = 0;
                            streamState.sequenceNumber++;
                            res.__responseApiSeq = streamState.sequenceNumber;
                            res.write(
                                `event: error\ndata: ${JSON.stringify({
                                    code: "api_error",
                                    message: message.message,
                                    param: null,
                                    sequence_number: streamState.sequenceNumber,
                                    type: "error",
                                })}\n\n`
                            );
                        } catch (writeError) {
                            this.logger.debug(
                                `[Request] Failed to write error to Response API stream: ${writeError.message}`
                            );
                        }
                    }
                    break;
                }

                if (message.data) {
                    const responseAPIChunk = this.formatConverter.translateGoogleToResponseAPIStream(
                        message.data,
                        model,
                        streamState
                    );
                    if (typeof streamState.sequenceNumber === "number") {
                        res.__responseApiSeq = streamState.sequenceNumber;
                    }
                    if (responseAPIChunk) {
                        if (!this._isResponseWritable(res)) {
                            this.logger.debug(
                                "[Request] Response no longer writable during Response API stream; stopping stream."
                            );
                            break;
                        }
                        try {
                            res.write(responseAPIChunk);
                        } catch (writeError) {
                            this.logger.debug(
                                `[Request] Failed to write Response API chunk (connection likely closed): ${writeError.message}`
                            );
                            break;
                        }
                    }
                }
            }
        } catch (error) {
            // Only handle connection reset errors here (client disconnect / queue closed).
            // Let other errors (timeout, parsing, logic errors) propagate to the outer catch.
            if (this._isConnectionResetError(error)) {
                this._handleRealStreamQueueClosedError(error, res, "response_api");
                return;
            }

            throw error;
        }
    }

    async _streamOpenAIResponse(messageQueue, res, model) {
        const streamState = {};

        try {
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const message = await messageQueue.dequeue(this.timeouts.STREAM_CHUNK);
                if (message.type === "STREAM_END") {
                    this.logger.info("[Request] OpenAI stream end signal received.");
                    if (this._isResponseWritable(res)) {
                        try {
                            res.write("data: [DONE]\n\n");
                        } catch (writeError) {
                            this.logger.debug(
                                `[Request] Failed to write final [DONE] to OpenAI stream (connection likely closed): ${writeError.message}`
                            );
                        }
                    }
                    break;
                }

                if (message.event_type === "error") {
                    this.logger.error(`[Request] Error received during OpenAI stream: ${message.message}`);
                    // Attempt to send error event to client if headers allowed, then close
                    // Check if response is still writable before attempting to write
                    if (this._isResponseWritable(res)) {
                        try {
                            res.write(
                                `data: ${JSON.stringify({ error: { code: 500, message: message.message, type: "api_error" } })}\n\n`
                            );
                        } catch (writeError) {
                            this.logger.debug(
                                `[Request] Failed to write error to OpenAI stream: ${writeError.message}`
                            );
                        }
                    }
                    break;
                }

                if (message.data) {
                    const openAIChunk = this.formatConverter.translateGoogleToOpenAIStream(
                        message.data,
                        model,
                        streamState
                    );
                    if (openAIChunk) {
                        if (!this._isResponseWritable(res)) {
                            this.logger.debug(
                                "[Request] Response no longer writable during OpenAI stream; stopping stream."
                            );
                            break;
                        }
                        try {
                            res.write(openAIChunk);
                        } catch (writeError) {
                            this.logger.debug(
                                `[Request] Failed to write OpenAI chunk to stream: ${writeError.message}`
                            );
                            break;
                        }
                    }
                }
            }
        } catch (error) {
            // Only handle connection reset errors here (client disconnect)
            // Let other errors (timeout, parsing, logic errors) propagate to outer catch
            if (this._isConnectionResetError(error)) {
                this._handleRealStreamQueueClosedError(error, res, "openai");
                return;
            }

            // Re-throw all other errors to be handled by outer catch block
            throw error;
        }
    }

    async _sendOpenAIResponseAPINonStreamResponse(messageQueue, res, model, responseDefaults = {}) {
        let fullBody = "";
        let receiving = true;
        while (receiving) {
            const message = await messageQueue.dequeue();
            if (message.type === "STREAM_END") {
                this.logger.info("[Request] OpenAI Response API received end signal.");
                receiving = false;
                break;
            }

            if (message.event_type === "error") {
                this.logger.error(
                    `[Adapter] Error during OpenAI Response API non-stream conversion: ${message.message}`
                );
                this._sendErrorResponse(res, 500, message.message);
                return;
            }

            if (message.event_type === "chunk" && message.data) {
                fullBody += message.data;
            }
        }

        // Parse and convert to OpenAI Response API format
        try {
            const googleResponse = JSON.parse(fullBody);
            const responseAPIResponse = this.formatConverter.convertGoogleToResponseAPINonStream(
                googleResponse,
                model,
                responseDefaults
            );
            res.type("application/json").send(JSON.stringify(responseAPIResponse));
        } catch (e) {
            this.logger.error(`[Adapter] Failed to parse response for OpenAI Response API: ${e.message}`);
            this._sendErrorResponse(res, 500, "Failed to parse backend response");
        }
    }

    async _sendOpenAINonStreamResponse(messageQueue, res, model) {
        let fullBody = "";
        let receiving = true;
        while (receiving) {
            const message = await messageQueue.dequeue();
            if (message.type === "STREAM_END") {
                this.logger.info("[Request] OpenAI received end signal.");
                receiving = false;
                break;
            }

            if (message.event_type === "error") {
                this.logger.error(`[Adapter] Error during OpenAI non-stream conversion: ${message.message}`);
                this._sendErrorResponse(res, 500, message.message);
                return;
            }

            if (message.event_type === "chunk" && message.data) {
                fullBody += message.data;
            }
        }

        // Parse and convert to OpenAI format
        try {
            const googleResponse = JSON.parse(fullBody);
            const openAIResponse = this.formatConverter.convertGoogleToOpenAINonStream(googleResponse, model);
            res.type("application/json").send(JSON.stringify(openAIResponse));
        } catch (e) {
            this.logger.error(`[Adapter] Failed to parse response for OpenAI: ${e.message}`);
            this._sendErrorResponse(res, 500, "Failed to parse backend response");
        }
    }

    _setResponseHeaders(res, headerMessage, req) {
        res.status(headerMessage.status || 200);
        const headers = headerMessage.headers || {};

        // Filter headers that might cause CORS conflicts
        const forbiddenHeaders = [
            "access-control-allow-origin",
            "access-control-allow-methods",
            "access-control-allow-headers",
        ];

        Object.entries(headers).forEach(([name, value]) => {
            const lowerName = name.toLowerCase();
            if (forbiddenHeaders.includes(lowerName)) return;
            if (lowerName === "content-length") return;

            // Special handling for upload URL and redirects: point them back to this proxy
            if ((lowerName === "x-goog-upload-url" || lowerName === "location") && value.includes("googleapis.com")) {
                try {
                    const urlObj = new URL(value);
                    // Rewrite upload/redirect URLs to point to this proxy server
                    // build.js already rewrote the URL to localhost with __proxy_host__ param
                    // Here we just ensure it matches the client's request host (for Docker/remote access)
                    let newAuthority;
                    if (req && req.headers && req.headers.host) {
                        newAuthority = req.headers.host;
                    } else {
                        const host =
                            this.serverSystem.config.host === "0.0.0.0" ? "127.0.0.1" : this.serverSystem.config.host;
                        newAuthority = `${host}:${this.serverSystem.config.httpPort}`;
                    }

                    const protocol =
                        req.secure || (req.get && req.get("X-Forwarded-Proto") === "https") ? "https" : "http";
                    const newUrl = `${protocol}://${newAuthority}${urlObj.pathname}${urlObj.search}`;

                    this.logger.debug(`[Response] Debug: Rewriting header ${name}: ${value} -> ${newUrl}`);
                    res.set(name, newUrl);
                } catch (e) {
                    res.set(name, value);
                }
            } else {
                res.set(name, value);
            }
        });
    }

    _handleRequestError(error, res, format = "openai") {
        // Normalize error message to handle non-Error objects and missing/non-string messages
        const errorMsg = String(error?.message ?? error);

        // Check if this is a client disconnect - if so, just log and return
        if (this._isConnectionResetError(error)) {
            const isClientDisconnect = error.reason === "client_disconnect" || !this._isResponseWritable(res);
            if (isClientDisconnect) {
                this.logger.info(`[Request] Request terminated: Queue closed (${error.reason || "connection_lost"})`);
                if (!res.writableEnded) {
                    try {
                        res.end();
                    } catch (e) {
                        // Ignore end errors for disconnected clients
                    }
                }
                return;
            }
        }

        if (res.headersSent) {
            this.logger.error(`[Request] Request processing error (headers already sent): ${errorMsg}`);

            // Try to send error in the stream format
            if (this._isResponseWritable(res)) {
                const contentType = res.getHeader("content-type");

                if (contentType && contentType.includes("text/event-stream")) {
                    // SSE format - send error event
                    try {
                        // Determine error code and type based on error classification
                        const errorCode = this._getErrorStatusCode(error);
                        let errorType = "api_error";
                        let errorMessage = `Processing failed: ${errorMsg}`;

                        // Use precise error type checking instead of string matching
                        if (this._isQueueTimeoutError(error)) {
                            errorType = "timeout_error";
                            errorMessage = `Stream timeout: ${errorMsg}`;
                        } else if (this._isConnectionResetError(error)) {
                            errorType = "service_unavailable";
                            errorMessage = `Service unavailable: ${errorMsg}`;
                        }

                        if (format === "response_api") {
                            if (res.__responseApiSeq == null) res.__responseApiSeq = 0;
                            res.__responseApiSeq += 1;
                            res.write(
                                `event: error\ndata: ${JSON.stringify({
                                    code: errorType,
                                    message: errorMessage,
                                    param: null,
                                    sequence_number: res.__responseApiSeq,
                                    type: "error",
                                })}\n\n`
                            );
                        } else if (format === "claude") {
                            res.write(
                                `event: error\ndata: ${JSON.stringify({
                                    error: {
                                        message: errorMessage,
                                        type: errorType,
                                    },
                                    type: "error",
                                })}\n\n`
                            );
                        } else if (format === "gemini") {
                            const statusText = this._getGeminiErrorStatusText(errorCode);
                            res.write(
                                `data: ${JSON.stringify({
                                    error: {
                                        code: errorCode,
                                        message: errorMessage,
                                        status: statusText,
                                    },
                                })}\n\n`
                            );
                        } else {
                            res.write(
                                `data: ${JSON.stringify({
                                    error: {
                                        code: errorCode,
                                        message: errorMessage,
                                        type: errorType,
                                    },
                                })}\n\n`
                            );
                        }
                        this.logger.info("[Request] Error event sent to SSE stream");
                    } catch (writeError) {
                        const writeErrorMsg = String(writeError?.message ?? writeError);
                        this.logger.error(`[Request] Failed to write error to stream: ${writeErrorMsg}`);
                    }
                } else if (res.__proxyResponseStreamMode === "fake") {
                    // Request-scoped fake stream mode - try to send an SSE-style error chunk
                    try {
                        this._sendErrorChunkToClient(res, `Processing failed: ${errorMsg}`);
                    } catch (writeError) {
                        const writeErrorMsg = String(writeError?.message ?? writeError);
                        this.logger.error(`[Request] Failed to write error chunk: ${writeErrorMsg}`);
                    }
                }

                try {
                    res.end();
                } catch (endError) {
                    this.logger.debug(`[Request] Failed to end response: ${endError.message}`);
                }
            }
        } else {
            this.logger.error(`[Request] Request processing error: ${errorMsg}`);
            const status = this._getErrorStatusCode(error);
            if (this._isConnectionResetError(error)) {
                this.logger.info(`[Request] Queue closed, returning 503 Service Unavailable.`);
            }
            this._sendErrorResponse(res, status, `Proxy error: ${errorMsg}`);
        }
    }

    _sendErrorResponse(res, status, message) {
        if (!res.headersSent) {
            const errorPayload = {
                error: {
                    code: status || 500,
                    message,
                    status: "SERVICE_UNAVAILABLE",
                },
            };
            res.status(status || 500)
                .type("application/json")
                .send(JSON.stringify(errorPayload));
        }
    }

    _isResponseWritable(res) {
        // Comprehensive check to ensure response is writable
        // Explicitly return boolean to avoid returning null/undefined from res.socket check
        return Boolean(
            !res.writableEnded && !res.destroyed && res.socket && !res.socket.destroyed && res.socket.writable !== false
        );
    }

    _sendErrorChunkToClient(res, message) {
        if (!res.headersSent) {
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");
        }
        // Check if response is still writable before attempting to write
        if (this._isResponseWritable(res)) {
            try {
                res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
            } catch (writeError) {
                this.logger.debug(`[Request] Failed to write error chunk to client: ${writeError.message}`);
            }
        }
    }

    _setupClientDisconnectHandler(res, requestId) {
        res.on("close", () => {
            if (!res.writableEnded) {
                this.logger.warn(`[Request] Client closed request #${requestId} connection prematurely.`);

                // Dynamically look up the current session id from the connection registry
                // This ensures we cancel on the correct session even after retries switch sessions
                const targetSessionId =
                    this.connectionRegistry.getSessionIdForRequest(requestId) ?? this.currentSessionId;
                const requestAttemptId = this.connectionRegistry.getRequestAttemptIdForRequest(requestId);

                this._cancelBrowserRequest(requestId, targetSessionId, requestAttemptId);
                // Close and remove the message queue to unblock any waiting dequeue() calls
                this.connectionRegistry.removeMessageQueue(requestId, "client_disconnect");
            }
        });
    }

    _cancelBrowserRequest(requestId, sessionId, requestAttemptId = null) {
        const targetSessionId = sessionId !== undefined ? sessionId : this.currentSessionId;
        const connection = this.connectionRegistry.getConnectionBySession(targetSessionId);
        if (connection) {
            this.logger.info(
                `[Request] Cancelling request #${requestId} on session ${targetSessionId}` +
                    (requestAttemptId ? ` (attempt ${requestAttemptId})` : "")
            );
            connection.send(
                JSON.stringify({
                    event_type: "cancel_request",
                    request_attempt_id: requestAttemptId,
                    request_id: requestId,
                })
            );
        } else {
            this.logger.warn(
                `[Request] Unable to send cancel instruction: No available WebSocket connection for session ${targetSessionId}.`
            );
        }
    }

    /**
     * Handle queue timeout by notifying browser to cancel the request
     * @param {Error} error - The timeout error
     * @param {string} requestId - The request ID
     */
    _handleQueueTimeout(error, requestId) {
        if (error.code === "QUEUE_TIMEOUT" || error instanceof QueueTimeoutError) {
            // Get the session id for this request from the registry
            const sessionId = this.connectionRegistry.getSessionIdForRequest(requestId);
            const requestAttemptId = this.connectionRegistry.getRequestAttemptIdForRequest(requestId);
            if (sessionId !== null) {
                this.logger.debug(
                    `[Request] Queue timeout for request #${requestId}, notifying browser on session ${sessionId} to cancel`
                );
                this._cancelBrowserRequest(requestId, sessionId, requestAttemptId);
            } else {
                this.logger.debug(
                    `[Request] Queue timeout for request #${requestId}, but queue already removed (session id not found)`
                );
            }
        }
    }

    /**
     * Set browser (build.js) log level at runtime for all active contexts
     * @param {string} level - 'DEBUG', 'INFO', 'WARN', or 'ERROR'
     * @returns {number} Number of browser contexts updated (0 if none)
     */
    setBrowserLogLevel(level) {
        const validLevels = ["DEBUG", "INFO", "WARN", "ERROR"];
        const upperLevel = level?.toUpperCase();

        if (!validLevels.includes(upperLevel)) {
            return 0;
        }

        // Broadcast to all active browser contexts
        const sentCount = this.connectionRegistry.broadcastMessage(
            JSON.stringify({
                event_type: "set_log_level",
                level: upperLevel,
            })
        );

        if (sentCount > 0) {
            this.logger.info(`[Config] Browser log level set to: ${upperLevel} (${sentCount} context(s) updated)`);

            // Also update server-side LoggingService level to keep in sync
            const LoggingService = require("../utils/LoggingService");
            LoggingService.setLevel(upperLevel);
            this.logger.info(`[Config] Server log level synchronized to: ${upperLevel}`);

            return sentCount;
        } else {
            this.logger.warn(`[Config] Unable to set browser log level: No active WebSocket connections.`);
            return 0;
        }
    }

    _buildProxyRequest(req, requestId) {
        const fullPath = req.path;
        let cleanPath = fullPath.replace(/^\/proxy/, "");
        const bodyObj = req.body;

        this.logger.debug(`[Proxy] Debug: incoming Gemini Body (Google Native) = ${JSON.stringify(bodyObj, null, 2)}`);

        // Parse thinkingLevel suffix from model name in native Gemini generation requests
        // Only handle generation requests: /v1beta/models/{modelName}:generateContent or :streamGenerateContent
        const modelPathMatch = cleanPath.match(
            /^(\/v1beta\/models\/)([^:]+)(:(generateContent|streamGenerateContent).*)$/
        );
        let modelThinkingLevel = null;
        let modelStreamingMode = null;

        if (modelPathMatch) {
            const pathPrefix = modelPathMatch[1];
            const rawModelName = modelPathMatch[2];
            const pathSuffix = modelPathMatch[3];

            const FormatConverter = require("./FormatConverter");
            const { cleanModelName: streamStrippedModel, streamingMode: parsedStreamingMode } =
                FormatConverter.parseModelStreamingModeSuffix(rawModelName);
            const { cleanModelName, thinkingLevel: parsedThinkingLevel } =
                FormatConverter.parseModelThinkingLevel(streamStrippedModel);
            modelStreamingMode = parsedStreamingMode;
            modelThinkingLevel = parsedThinkingLevel;

            if (modelStreamingMode) {
                this.logger.info(
                    `[Proxy] Detected streamingMode suffix in model path: "${rawModelName}" -> model="${streamStrippedModel}", streamingMode="${modelStreamingMode}"`
                );
            }

            if (modelThinkingLevel) {
                this.logger.info(
                    `[Proxy] Detected thinkingLevel suffix in model path: "${streamStrippedModel}" -> model="${cleanModelName}", thinkingLevel="${modelThinkingLevel}"`
                );
            }

            // Always strip recognized directives from path model name
            if (cleanModelName !== rawModelName) {
                cleanPath = `${pathPrefix}${cleanModelName}${pathSuffix}`;
            }
        }

        // Force thinking for native Google requests (processed first)
        if (this.serverSystem.forceThinking && req.method === "POST" && bodyObj && bodyObj.contents) {
            if (!bodyObj.generationConfig) {
                bodyObj.generationConfig = {};
            }

            if (
                !bodyObj.generationConfig.thinkingConfig ||
                bodyObj.generationConfig.thinkingConfig.includeThoughts === undefined
            ) {
                this.logger.info(`[Proxy] ?? Force thinking enabled, setting includeThoughts=true. (Google Native)`);
                bodyObj.generationConfig.thinkingConfig = {
                    ...(bodyObj.generationConfig.thinkingConfig || {}),
                    includeThoughts: true,
                };
            }
        }

        // If thinkingLevel is parsed from model name suffix, inject into thinkingConfig (after force thinking, higher priority, direct override)
        if (modelThinkingLevel && req.method === "POST" && bodyObj && bodyObj.contents) {
            if (!bodyObj.generationConfig) {
                bodyObj.generationConfig = {};
            }
            if (!bodyObj.generationConfig.thinkingConfig) {
                bodyObj.generationConfig.thinkingConfig = {};
            }
            // Model name suffix thinkingLevel has highest priority, direct override
            bodyObj.generationConfig.thinkingConfig.thinkingLevel = modelThinkingLevel;
            this.logger.info(
                `[Proxy] Applied thinkingLevel from model name suffix: ${modelThinkingLevel} (Google Native)`
            );
        }

        // Pre-process native Google requests
        // 1. Ensure thoughtSignature for functionCall (not functionResponse)
        // 2. Sanitize tools (remove unsupported fields, convert type to uppercase)
        if (req.method === "POST" && bodyObj) {
            if (bodyObj.contents) {
                this.formatConverter.ensureThoughtSignature(bodyObj);
            }
            if (bodyObj.tools) {
                this.formatConverter.sanitizeGeminiTools(bodyObj);
            }
        }

        // Force web search and URL context for native Google requests
        if (
            (this.serverSystem.forceWebSearch || this.serverSystem.forceUrlContext) &&
            req.method === "POST" &&
            bodyObj &&
            bodyObj.contents
        ) {
            if (!bodyObj.tools) {
                bodyObj.tools = [];
            }

            const toolsToAdd = [];

            // Handle Google Search
            if (this.serverSystem.forceWebSearch) {
                const hasSearch = bodyObj.tools.some(t => t.googleSearch);
                if (!hasSearch) {
                    bodyObj.tools.push({ googleSearch: {} });
                    toolsToAdd.push("googleSearch");
                } else {
                    this.logger.info(
                        `[Proxy] ✅ Client-provided web search detected, skipping force injection. (Google Native)`
                    );
                }
            }

            // Handle URL Context
            if (this.serverSystem.forceUrlContext) {
                const hasUrlContext = bodyObj.tools.some(t => t.urlContext);
                if (!hasUrlContext) {
                    bodyObj.tools.push({ urlContext: {} });
                    toolsToAdd.push("urlContext");
                } else {
                    this.logger.info(
                        `[Proxy] ✅ Client-provided URL context detected, skipping force injection. (Google Native)`
                    );
                }
            }

            if (toolsToAdd.length > 0) {
                this.logger.info(
                    `[Proxy] ⚠️ Forcing tools enabled, injecting: [${toolsToAdd.join(", ")}] (Google Native)`
                );
            }
        }

        this.formatConverter.ensureServerSideToolInvocations(bodyObj, "[Proxy]");

        // Apply safety settings for native Google requests (only if not already provided)
        if (req.method === "POST" && bodyObj && bodyObj.contents && !bodyObj.safetySettings) {
            bodyObj.safetySettings = [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            ];
        }

        this.logger.debug(`[Proxy] Debug: Final Gemini Request (Google Native) = ${JSON.stringify(bodyObj, null, 2)}`);

        const effectiveStreamMode = modelStreamingMode || this.serverSystem.streamingMode;

        return {
            body: req.method !== "GET" ? JSON.stringify(bodyObj) : undefined,
            headers: req.headers,
            is_generative:
                req.method === "POST" &&
                (req.path.includes("generateContent") || req.path.includes("streamGenerateContent")),
            method: req.method,
            path: cleanPath,
            query_params: req.query || {},
            request_id: requestId,
            streaming_mode: effectiveStreamMode,
        };
    }

    _initializeProxyRequestAttempt(proxyRequest) {
        if (!proxyRequest.request_attempt_number) {
            proxyRequest.request_attempt_number = 1;
        }
        proxyRequest.request_attempt_id = this._generateRequestAttemptId(
            proxyRequest.request_id,
            proxyRequest.request_attempt_number
        );
    }

    _advanceProxyRequestAttempt(proxyRequest) {
        proxyRequest.request_attempt_number = (proxyRequest.request_attempt_number || 1) + 1;
        proxyRequest.request_attempt_id = this._generateRequestAttemptId(
            proxyRequest.request_id,
            proxyRequest.request_attempt_number
        );
    }

    _forwardRequest(proxyRequest) {
        const connection = this.connectionRegistry.getConnectionBySession(this.currentSessionId);
        if (connection) {
            const usageCount = this._incrementSessionUsageCount(this.currentSessionId);
            this.logger.debug(
                `[Request] Forwarding request #${proxyRequest.request_id} via session ${this.currentSessionId}` +
                    ` (attempt=${proxyRequest.request_attempt_id}, usage=${usageCount})`
            );
            connection.send(
                JSON.stringify({
                    event_type: "proxy_request",
                    ...proxyRequest,
                })
            );
        } else {
            throw new Error(
                `Unable to forward request: No WebSocket connection found for session ${this.currentSessionId}`
            );
        }
    }

    _generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }

    _generateRequestAttemptId(requestId, attemptNumber) {
        return `${requestId}_attempt_${attemptNumber}_${Math.random().toString(36).substring(2, 8)}`;
    }
}

module.exports = RequestHandler;
