/**
 * File: ui/app/composables/useLogs.js
 * Description: Composable for managing logs display and operations
 *
 * Author: iBUHUB
 */

import { ElMessage } from 'element-plus';
import I18n from '../utils/i18n';
import escapeHtml from '../utils/escapeHtml';

export function useLogs() {
    // i18n helper
    const t = (key, options) => I18n.t(key, options);

    // Helper function to highlight log levels
    const highlightLogLevel = (content, level, color) =>
        content.replace(
            new RegExp(`(^|\\r?\\n)(\\[${level}\\])(?=\\s)`, 'g'),
            `$1<span style="color: ${color}; font-weight: bold;">$2</span>`
        );

    // Computed for formatted logs (receives raw logs string)
    const getFormattedLogs = logs => {
        let safeLogs = escapeHtml(logs || t('loading'));

        safeLogs = highlightLogLevel(safeLogs, 'DEBUG', '#3498db');
        safeLogs = highlightLogLevel(safeLogs, 'WARN', '#f39c12');
        safeLogs = highlightLogLevel(safeLogs, 'ERROR', '#e74c3c');

        return safeLogs;
    };

    // Clear logs view (updates state directly)
    const clearLogsView = state => {
        state.logs = '';
    };

    // Download logs
    const downloadLogs = logs => {
        if (!logs) {
            ElMessage.warning(t('noLogsAvailable'));
            return;
        }

        const blob = new Blob([logs], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `canvastoapi-logs-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return {
        clearLogsView,
        downloadLogs,
        getFormattedLogs,
    };
}
