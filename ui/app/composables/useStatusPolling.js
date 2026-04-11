/**
 * File: ui/app/composables/useStatusPolling.js
 * Description: Composable for managing status polling and data synchronization
 *
 * Author: iBUHUB
 */

import { computed, nextTick, reactive, ref } from 'vue';

export function useStatusPolling(settingsState, versionState, sessionsRef, getActiveTab) {
    const updateTimer = ref(null);

    const state = reactive({
        browserWsPath: '/ws',
        logCount: 0,
        logs: '',
        logScrollTop: 0,
        serviceConnected: false,
        sharePageUrl: '',
    });

    // Computed for WebSocket endpoint text
    const browserWsEndpointText = computed(() => {
        if (typeof window === 'undefined') {
            return state.browserWsPath || '/ws';
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${window.location.host}${state.browserWsPath || '/ws'}`;
    });

    // Apply status payload to all states
    const applyStatusPayload = payload => {
        const status = payload?.status || {};

        // Update settings state
        settingsState.sessionErrorThreshold = Number.isFinite(Number(status.sessionErrorThreshold))
            ? Number(status.sessionErrorThreshold)
            : 3;
        settingsState.debugMode = Boolean(status.debugMode);
        settingsState.forceThinking = Boolean(status.forceThinking);
        settingsState.forceUrlContext = Boolean(status.forceUrlContext);
        settingsState.forceWebSearch = Boolean(status.forceWebSearch);
        settingsState.logMaxCount = Number(status.logMaxCount || 100);
        settingsState.selectionStrategy = status.selectionStrategy || 'round';
        settingsState.streamingMode = status.streamingMode || 'fake';

        // Update local state
        state.logCount = Number(payload?.logCount || 0);
        state.logs = payload?.logs || '';
        state.serviceConnected = Boolean(status.serviceConnected);
        state.browserWsPath = status.browserWsPath || '/ws';
        state.sharePageUrl = status.sharePageUrl || '';

        // Update sessions
        sessionsRef.value = Array.isArray(status.browserSessions) ? status.browserSessions : [];
    };

    // Fetch status data
    const fetchStatus = async () => {
        try {
            const logContainer = getActiveTab() === 'logs' ? document.getElementById('log-container') : null;
            if (logContainer) {
                state.logScrollTop = logContainer.scrollTop;
            }

            const response = await fetch('/api/status');
            if (response.redirected) {
                window.location.href = response.url;
                return;
            }
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            if (!response.ok) throw new Error(`status ${response.status}`);

            const data = await response.json();
            applyStatusPayload(data);

            if (getActiveTab() === 'logs') {
                nextTick(() => {
                    const updatedLogContainer = document.getElementById('log-container');
                    if (updatedLogContainer) {
                        updatedLogContainer.scrollTop = state.logScrollTop || 0;
                    }
                });
            }
        } catch (error) {
            state.serviceConnected = false;
        }
    };

    // Start polling
    const startPolling = (interval = 5000) => {
        fetchStatus();
        updateTimer.value = setInterval(fetchStatus, interval);
    };

    // Stop polling
    const stopPolling = () => {
        if (updateTimer.value) {
            clearInterval(updateTimer.value);
            updateTimer.value = null;
        }
    };

    return {
        applyStatusPayload,
        browserWsEndpointText,
        fetchStatus,
        startPolling,
        state,
        stopPolling,
        updateTimer,
    };
}
