/**
 * File: ui/app/composables/useSettings.js
 * Description: Composable for managing application settings state and API updates
 *
 * Author: iBUHUB
 */

import { reactive } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import I18n from '../utils/i18n';

export function useSettings() {
    const state = reactive({
        debugMode: false,
        forceThinking: false,
        forceUrlContext: false,
        forceWebSearch: false,
        logMaxCount: 100,
        selectionStrategy: 'round',
        sessionErrorThreshold: 3,
        streamingMode: 'fake',
    });

    const loading = reactive({
        debugMode: false,
        forceThinking: false,
        forceUrlContext: false,
        forceWebSearch: false,
        logMaxCount: false,
        selectionStrategy: false,
        sessionErrorThreshold: false,
        streamingMode: false,
    });

    // i18n helper
    const t = (key, options) => I18n.t(key, options);

    // Settings update methods
    const handleDebugModeChange = async value => {
        loading.debugMode = true;
        try {
            const response = await fetch('/api/settings/debug-mode', {
                headers: { 'Content-Type': 'application/json' },
                method: 'PUT',
            });

            const data = await response.json();
            if (response.ok) {
                ElMessage.success(t('settingUpdateSuccess', { setting: t('logLevel'), value: data.value }));
            } else {
                ElMessage.error(t('settingFailed', { message: data.message || 'Unknown error' }));
                state.debugMode = !value;
            }
        } catch (error) {
            ElMessage.error(t('settingFailed', { message: error.message }));
            state.debugMode = !value;
        } finally {
            loading.debugMode = false;
        }
    };

    const updateLogMaxCount = async value => {
        loading.logMaxCount = true;
        try {
            const response = await fetch('/api/settings/log-max-count', {
                body: JSON.stringify({ count: value }),
                headers: { 'Content-Type': 'application/json' },
                method: 'PUT',
            });

            const data = await response.json();
            if (response.ok) {
                ElMessage.success(t('settingUpdateSuccess', { setting: t('logMaxCount'), value }));
            } else {
                ElMessage.error(t('settingFailed', { message: data.message || 'Unknown error' }));
            }
        } catch (error) {
            ElMessage.error(t('settingFailed', { message: error.message }));
        } finally {
            loading.logMaxCount = false;
        }
    };

    const updateStreamingMode = async value => {
        loading.streamingMode = true;
        try {
            // Show confirmation for "real" mode
            if (value === 'real') {
                try {
                    await ElMessageBox.confirm(t('streamingModeEnableConfirm'), t('warningTitle'), {
                        cancelButtonText: t('cancel'),
                        confirmButtonText: t('ok'),
                        type: 'warning',
                    });
                } catch {
                    // User cancelled, revert to "fake"
                    state.streamingMode = 'fake';
                    loading.streamingMode = false;
                    return;
                }
            }

            const response = await fetch('/api/settings/streaming-mode', {
                body: JSON.stringify({ mode: value }),
                headers: { 'Content-Type': 'application/json' },
                method: 'PUT',
            });

            const data = await response.json();
            if (response.ok) {
                ElMessage.success(t('settingUpdateSuccess', { setting: t('streamingMode'), value }));
            } else {
                ElMessage.error(t('settingFailed', { message: data.message || 'Unknown error' }));
                state.streamingMode = value === 'real' ? 'fake' : 'real';
            }
        } catch (error) {
            ElMessage.error(t('settingFailed', { message: error.message }));
            state.streamingMode = value === 'real' ? 'fake' : 'real';
        } finally {
            loading.streamingMode = false;
        }
    };

    const updateSelectionStrategy = async value => {
        loading.selectionStrategy = true;
        try {
            const response = await fetch('/api/settings/selection-strategy', {
                body: JSON.stringify({ strategy: value }),
                headers: { 'Content-Type': 'application/json' },
                method: 'PUT',
            });

            const data = await response.json();
            if (response.ok) {
                ElMessage.success(t('settingUpdateSuccess', { setting: t('selectionStrategyLabel'), value }));
            } else {
                ElMessage.error(t('settingFailed', { message: data.message || 'Unknown error' }));
                state.selectionStrategy = value === 'round' ? 'random' : 'round';
            }
        } catch (error) {
            ElMessage.error(t('settingFailed', { message: error.message }));
            state.selectionStrategy = value === 'round' ? 'random' : 'round';
        } finally {
            loading.selectionStrategy = false;
        }
    };

    const updateSessionErrorThreshold = async value => {
        loading.sessionErrorThreshold = true;
        try {
            const response = await fetch('/api/settings/session-error-threshold', {
                body: JSON.stringify({ threshold: value }),
                headers: { 'Content-Type': 'application/json' },
                method: 'PUT',
            });

            const data = await response.json();
            if (response.ok) {
                ElMessage.success(t('settingUpdateSuccess', { setting: t('sessionErrorThreshold'), value }));
            } else {
                ElMessage.error(t('settingFailed', { message: data.message || 'Unknown error' }));
            }
        } catch (error) {
            ElMessage.error(t('settingFailed', { message: error.message }));
        } finally {
            loading.sessionErrorThreshold = false;
        }
    };

    const updateForceThinking = async value => {
        loading.forceThinking = true;
        try {
            const response = await fetch('/api/settings/force-thinking', {
                headers: { 'Content-Type': 'application/json' },
                method: 'PUT',
            });

            const data = await response.json();
            if (response.ok) {
                ElMessage.success(t('settingUpdateSuccess', { setting: t('forceThinking'), value: data.value }));
            } else {
                ElMessage.error(t('settingFailed', { message: data.message || 'Unknown error' }));
                state.forceThinking = !value;
            }
        } catch (error) {
            ElMessage.error(t('settingFailed', { message: error.message }));
            state.forceThinking = !value;
        } finally {
            loading.forceThinking = false;
        }
    };

    const updateForceWebSearch = async value => {
        loading.forceWebSearch = true;
        try {
            // Show confirmation when enabling
            if (value) {
                try {
                    await ElMessageBox.confirm(t('forceWebSearchEnableConfirm'), t('warningTitle'), {
                        cancelButtonText: t('cancel'),
                        confirmButtonText: t('ok'),
                        type: 'warning',
                    });
                } catch {
                    // User cancelled, revert
                    state.forceWebSearch = false;
                    loading.forceWebSearch = false;
                    return;
                }
            }

            const response = await fetch('/api/settings/force-web-search', {
                headers: { 'Content-Type': 'application/json' },
                method: 'PUT',
            });

            const data = await response.json();
            if (response.ok) {
                ElMessage.success(t('settingUpdateSuccess', { setting: t('forceWebSearch'), value: data.value }));
            } else {
                ElMessage.error(t('settingFailed', { message: data.message || 'Unknown error' }));
                state.forceWebSearch = !value;
            }
        } catch (error) {
            ElMessage.error(t('settingFailed', { message: error.message }));
            state.forceWebSearch = !value;
        } finally {
            loading.forceWebSearch = false;
        }
    };

    const updateForceUrlContext = async value => {
        loading.forceUrlContext = true;
        try {
            const response = await fetch('/api/settings/force-url-context', {
                headers: { 'Content-Type': 'application/json' },
                method: 'PUT',
            });

            const data = await response.json();
            if (response.ok) {
                ElMessage.success(t('settingUpdateSuccess', { setting: t('forceUrlContext'), value: data.value }));
            } else {
                ElMessage.error(t('settingFailed', { message: data.message || 'Unknown error' }));
                state.forceUrlContext = !value;
            }
        } catch (error) {
            ElMessage.error(t('settingFailed', { message: error.message }));
            state.forceUrlContext = !value;
        } finally {
            loading.forceUrlContext = false;
        }
    };

    return {
        handleDebugModeChange,
        loading,
        state,
        updateForceThinking,
        updateForceUrlContext,
        updateForceWebSearch,
        updateLogMaxCount,
        updateSelectionStrategy,
        updateSessionErrorThreshold,
        updateStreamingMode,
    };
}
