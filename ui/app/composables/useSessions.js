/**
 * File: ui/app/composables/useSessions.js
 * Description: Composable for managing browser sessions state and operations
 *
 * Author: iBUHUB
 */

import { computed, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import I18n from '../utils/i18n';

export function useSessions() {
    const sessions = ref([]);

    // i18n helper
    const t = (key, options) => I18n.t(key, options);

    // Computed
    const activeSessionCount = computed(() => sessions.value.filter(s => !s.disabledAt).length);
    const disabledSessionCount = computed(() => sessions.value.filter(s => s.disabledAt).length);

    // Helper functions
    function formatTime(timestamp) {
        if (!timestamp) return '-';
        const date = new Date(timestamp);
        return date.toLocaleString();
    }

    function getSessionStatusClass(session) {
        if (session.disabledAt) {
            return 'status-disabled';
        }
        return 'status-online';
    }

    function getSessionStatusText(session) {
        if (session.disabledAt) {
            return t('disabledLabel');
        }
        return t('onlineLabel');
    }

    // Reset session health
    const handleResetHealth = async (session, onSuccess) => {
        try {
            await ElMessageBox.confirm(t('sessionResetConfirm', { session: session.connectionId }), t('warningTitle'), {
                cancelButtonText: t('cancel'),
                confirmButtonText: t('ok'),
                type: 'warning',
            });

            const response = await fetch(`/api/sessions/${session.sessionId}/reset-health`, {
                headers: {
                    'Content-Type': 'application/json',
                },
                method: 'PUT',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Reset failed');
            }

            ElMessage.success(t('sessionResetSuccess', { session: session.connectionId }));

            // Call onSuccess callback to refresh session list
            if (onSuccess) {
                await onSuccess();
            }
        } catch (error) {
            if (error !== 'cancel') {
                ElMessage.error(error.message || t('unknownError'));
            }
        }
    };

    return {
        activeSessionCount,
        disabledSessionCount,
        formatTime,
        getSessionStatusClass,
        getSessionStatusText,
        handleResetHealth,
        sessions,
    };
}
