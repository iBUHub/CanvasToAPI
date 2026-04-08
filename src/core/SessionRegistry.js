/**
 * File: src/core/SessionRegistry.js
 * Description: WebSocket session registry for browser-owned connections and request queues
 *
 * Author: iBUHUB
 */

const { randomUUID } = require("crypto");
const { EventEmitter } = require("events");
const MessageQueue = require("../utils/MessageQueue");

class SessionRegistry extends EventEmitter {
    constructor(logger, config = {}) {
        super();
        this.logger = logger;
        this.config = config;
        this.connections = new Map();
        this.messageQueues = new Map();
        this.lastSelectedAt = null;
        this.lastSelectedConnectionId = null;
        this.roundCursor = 0;
        this.selectionCount = 0;
        this.browserWsErrorThreshold = Number.isFinite(config.browserWsErrorThreshold)
            ? Math.max(1, config.browserWsErrorThreshold)
            : 3;
    }

    addConnection(ws, meta = {}) {
        const connectionId = randomUUID();
        const connection = {
            connectedAt: Date.now(),
            disabledAt: null,
            failureCount: 0,
            lastError: null,
            lastSelectedAt: null,
            lastUsedAt: null,
            meta,
            selectedCount: 0,
            usageCount: 0,
            ws,
        };

        this.connections.set(connectionId, connection);
        ws._connectionId = connectionId;

        this.logger.info(
            `[Session] Browser connected (${connectionId}) from ${meta.address || "unknown address"}` +
                (meta.clientLabel ? ` [${meta.clientLabel}]` : "")
        );

        ws.on("message", data => this._handleIncomingMessage(data.toString(), connectionId));
        ws.on("close", (code, reasonBuffer) => {
            const reason =
                typeof reasonBuffer === "string" ? reasonBuffer : Buffer.from(reasonBuffer || []).toString("utf8");
            this.removeConnection(connectionId, reason || `socket_closed_${code || "unknown"}`);
        });
        ws.on("error", error => {
            this.recordConnectionFailure(connectionId, "ws_error", error.message);
        });

        this.emit("connectionAdded", { connectionId, ...connection });
        return connectionId;
    }

    removeConnection(connectionId, reason = "connection_closed") {
        const entry = this.connections.get(connectionId);
        if (!entry) {
            return;
        }

        this.connections.delete(connectionId);
        this.closeQueuesForConnection(connectionId, reason);

        this.logger.info(`[Session] Browser disconnected (${connectionId}). Reason: ${reason}`);
        this.emit("connectionRemoved", { connectionId, reason });
    }

    getConnection(connectionId) {
        return this.connections.get(connectionId)?.ws || null;
    }

    getConnectionByAuth(connectionId) {
        return this.getConnection(connectionId);
    }

    getConnections() {
        return Array.from(this.connections.entries()).map(([connectionId, entry]) => ({
            connectedAt: entry.connectedAt,
            connectionId,
            disabledAt: entry.disabledAt,
            failureCount: entry.failureCount,
            lastError: entry.lastError,
            lastSelectedAt: entry.lastSelectedAt,
            lastUsedAt: entry.lastUsedAt,
            meta: entry.meta,
            readyState: entry.ws.readyState,
            selectedCount: entry.selectedCount,
            sessionId: connectionId,
            usageCount: entry.usageCount,
        }));
    }

    getConnectionCount() {
        return this._getAvailableConnections().length;
    }

    pickConnection(strategy = "round", excludedConnectionIds = new Set()) {
        const availableConnections = this._getAvailableConnections().filter(
            connection => !excludedConnectionIds.has(connection.connectionId)
        );
        if (availableConnections.length === 0) {
            return null;
        }

        if (strategy === "random") {
            const randomIndex = Math.floor(Math.random() * availableConnections.length);
            const selected = availableConnections[randomIndex];
            this._recordSelection(selected.connectionId);
            return selected;
        }

        const selected = availableConnections[this.roundCursor % availableConnections.length];
        this.roundCursor = (this.roundCursor + 1) % Math.max(availableConnections.length, 1);
        this._recordSelection(selected.connectionId);
        return selected;
    }

    switchToNextConnection(currentConnectionId = null, strategy = "round", excludedConnectionIds = new Set()) {
        const excluded = new Set(excludedConnectionIds);
        if (currentConnectionId) {
            excluded.add(currentConnectionId);
        }
        return this.pickConnection(strategy, excluded);
    }

    recordConnectionUsage(connectionId) {
        const entry = this.connections.get(connectionId);
        if (!entry) {
            return 0;
        }

        entry.usageCount += 1;
        entry.lastUsedAt = new Date().toISOString();
        return entry.usageCount;
    }

    getConnectionStats(connectionId) {
        const entry = this.connections.get(connectionId);
        if (!entry) {
            return null;
        }

        return {
            connectedAt: entry.connectedAt,
            disabledAt: entry.disabledAt,
            failureCount: entry.failureCount,
            lastError: entry.lastError,
            lastSelectedAt: entry.lastSelectedAt,
            lastUsedAt: entry.lastUsedAt,
            selectedCount: entry.selectedCount,
            usageCount: entry.usageCount,
        };
    }

    getSelectionState() {
        return {
            lastSelectedAt: this.lastSelectedAt,
            lastSelectedConnectionId: this.lastSelectedConnectionId,
            lastSelectedSessionId: this.lastSelectedConnectionId,
            roundCursor: this.roundCursor,
            selectionCount: this.selectionCount,
        };
    }

    createMessageQueue(requestId, connectionId, requestAttemptId = null) {
        if (!connectionId || !this.connections.has(connectionId)) {
            throw new Error(`Invalid connectionId: ${connectionId}`);
        }

        const existingEntry = this.messageQueues.get(requestId);
        if (existingEntry) {
            try {
                existingEntry.queue.close("retry_replaced");
            } catch (error) {
                this.logger.debug(
                    `[Session] Failed to close existing queue for request ${requestId}: ${error.message}`
                );
            }
            this.messageQueues.delete(requestId);
        }

        const queue = new MessageQueue();
        this.messageQueues.set(requestId, {
            connectionId,
            createdAt: Date.now(),
            queue,
            requestAttemptId,
        });

        return queue;
    }

    removeMessageQueue(requestId, reason = "handler_cleanup") {
        const entry = this.messageQueues.get(requestId);
        if (!entry) {
            return;
        }

        entry.queue.close(reason);
        this.messageQueues.delete(requestId);
    }

    getConnectionIdForRequest(requestId) {
        return this.messageQueues.get(requestId)?.connectionId || null;
    }

    getAuthIndexForRequest(requestId) {
        return this.getConnectionIdForRequest(requestId);
    }

    getRequestAttemptIdForRequest(requestId) {
        return this.messageQueues.get(requestId)?.requestAttemptId || null;
    }

    closeQueuesForConnection(connectionId, reason = "connection_closed") {
        let closedCount = 0;

        for (const [requestId, entry] of this.messageQueues.entries()) {
            if (entry.connectionId !== connectionId) {
                continue;
            }

            try {
                entry.queue.close(reason);
            } catch (error) {
                this.logger.warn(`[Session] Failed to close queue for request ${requestId}: ${error.message}`);
            }

            this.messageQueues.delete(requestId);
            closedCount++;
        }

        if (closedCount > 0) {
            this.logger.info(
                `[Session] Closed ${closedCount} pending queue(s) for browser ${connectionId} (reason: ${reason})`
            );
        }

        return closedCount;
    }

    closeMessageQueuesForAuth(connectionId, reason = "connection_closed") {
        return this.closeQueuesForConnection(connectionId, reason);
    }

    closeAllMessageQueues() {
        if (this.messageQueues.size === 0) {
            return;
        }

        for (const [requestId, entry] of this.messageQueues.entries()) {
            try {
                entry.queue.close("system_reset");
            } catch (error) {
                this.logger.warn(`[Session] Failed to close message queue for request ${requestId}: ${error.message}`);
            }
        }

        this.messageQueues.clear();
    }

    cleanupStaleQueues(maxAgeMs = 600000) {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [requestId, entry] of this.messageQueues.entries()) {
            if (now - entry.createdAt <= maxAgeMs) {
                continue;
            }

            try {
                entry.queue.close("stale_cleanup");
            } catch (error) {
                this.logger.debug(`[Session] Failed to close stale queue for request ${requestId}: ${error.message}`);
            }

            this.messageQueues.delete(requestId);
            cleanedCount++;
        }

        if (cleanedCount > 0) {
            this.logger.info(`[Session] Cleaned ${cleanedCount} stale queue(s)`);
        }

        return cleanedCount;
    }

    broadcastMessage(message) {
        let sentCount = 0;

        for (const { connectionId, ws } of this._getAvailableConnections()) {
            try {
                ws.send(message);
                sentCount++;
            } catch (error) {
                this.logger.warn(`[Session] Failed to broadcast to ${connectionId}: ${error.message}`);
            }
        }

        return sentCount;
    }

    closeAllConnections(reason = "server_shutdown") {
        for (const [connectionId, entry] of this.connections.entries()) {
            try {
                this._safeCloseWebSocket(entry.ws, 1001, reason);
            } catch (error) {
                this.logger.warn(`[Session] Failed to close browser session ${connectionId}: ${error.message}`);
            }
        }
    }

    _getAvailableConnections() {
        return Array.from(this.connections.entries())
            .filter(([, entry]) => entry.ws.readyState === 1 && !entry.disabledAt)
            .map(([connectionId, entry]) => ({
                connectedAt: entry.connectedAt,
                connectionId,
                failureCount: entry.failureCount,
                lastError: entry.lastError,
                meta: entry.meta,
                ws: entry.ws,
            }));
    }

    _handleIncomingMessage(messageData, connectionId) {
        try {
            const parsedMessage = JSON.parse(messageData);
            const requestId = parsedMessage.request_id;

            if (!requestId) {
                this.logger.warn("[Session] Received invalid message: missing request_id");
                return;
            }

            const entry = this.messageQueues.get(requestId);
            if (!entry) {
                this.logger.warn(`[Session] Received message for unknown request ${requestId}`);
                return;
            }

            if (entry.connectionId !== connectionId) {
                this.logger.warn(
                    `[Session] Discarding message for request ${requestId} from ${connectionId}; expected ${entry.connectionId}`
                );
                return;
            }

            if (entry.requestAttemptId && parsedMessage.request_attempt_id !== entry.requestAttemptId) {
                this.logger.warn(
                    `[Session] Discarding stale message for request ${requestId}: expected attempt ${entry.requestAttemptId}, got ${parsedMessage.request_attempt_id || "missing"}`
                );
                return;
            }

            this._routeMessage(parsedMessage, entry.queue, connectionId);
        } catch (error) {
            this.logger.error(`[Session] Failed to parse browser message: ${error.message}`);
        }
    }

    _routeMessage(message, queue, connectionId) {
        switch (message.event_type) {
            case "response_headers":
                this.recordConnectionSuccess(connectionId);
                queue.enqueue(message);
                break;
            case "chunk":
                this.recordConnectionSuccess(connectionId);
                queue.enqueue(message);
                break;
            case "error":
                this.recordConnectionFailure(connectionId, "browser_error", message.message);
                queue.enqueue(message);
                break;
            case "stream_close":
                this.recordConnectionSuccess(connectionId);
                queue.enqueue({ type: "STREAM_END" });
                break;
            default:
                this.logger.warn(`[Session] Unknown browser event type: ${message.event_type}`);
        }
    }

    recordConnectionFailure(connectionId, type, message) {
        const entry = this.connections.get(connectionId);
        if (!entry) {
            return;
        }

        entry.failureCount += 1;
        entry.lastError = {
            at: new Date().toISOString(),
            message,
            type,
        };

        if (entry.failureCount >= this.browserWsErrorThreshold && !entry.disabledAt) {
            entry.disabledAt = Date.now();
            this.logger.error(
                `[Session] Browser ${connectionId} disabled after ${entry.failureCount} error(s). Last error: ${message}`
            );
            return;
        }

        this.logger.warn(
            `[Session] Browser ${connectionId} error recorded (${entry.failureCount}/${this.browserWsErrorThreshold}): ${message}`
        );
    }

    recordConnectionSuccess(connectionId) {
        const entry = this.connections.get(connectionId);
        if (!entry || entry.disabledAt || entry.failureCount === 0) {
            return;
        }

        entry.failureCount = 0;
        this.logger.debug(`[Session] Browser ${connectionId} failure counter reset after successful response.`);
    }

    _recordSelection(connectionId) {
        const entry = this.connections.get(connectionId);
        if (!entry) {
            return;
        }

        const timestamp = new Date().toISOString();
        entry.lastSelectedAt = timestamp;
        entry.selectedCount += 1;
        this.lastSelectedAt = timestamp;
        this.lastSelectedConnectionId = connectionId;
        this.selectionCount += 1;
    }

    isInGracePeriod() {
        return false;
    }

    isReconnectingInProgress() {
        return false;
    }

    _safeCloseWebSocket(ws, code, reason) {
        if (!ws) {
            return;
        }

        if (ws.readyState === 0 || ws.readyState === 1) {
            ws.close(code, reason);
        }
    }
}

module.exports = SessionRegistry;
