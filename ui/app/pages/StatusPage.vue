<!--
 * File: ui/app/pages/StatusPage.vue
 * Description: Main status page with tab-based navigation (Dashboard, Settings, Logs)
 *
 * Author: iBUHUB
-->

<template>
    <div class="dashboard-layout">
        <!-- Side Navigation -->
        <SideNavBar :active-item="activeTab" @navigate="switchTab" />

        <!-- Top App Bar -->
        <TopAppBar
            @search="handleSearch"
            @action="handleAction"
            @toggle-theme="toggleTheme"
            @toggle-language="toggleLanguage"
        />

        <!-- Main Content -->
        <main class="main-content">
            <!-- Dashboard Tab -->
            <div v-show="activeTab === 'dashboard'" class="content-wrapper">
                <!-- Header Section -->
                <div class="page-header">
                    <div class="header-title-group">
                        <h1 class="page-title">{{ t("statusHeading") }}</h1>
                        <p class="page-subtitle">{{ t("realTimeInfrastructure") }}</p>
                    </div>
                </div>

                <!-- Status Cards -->
                <div class="metrics-grid">
                    <MetricCard
                        :label="t('serviceStatus')"
                        :value="pollingState.serviceConnected ? t('connected') : t('disconnected')"
                        icon="cloud"
                        :icon-color="pollingState.serviceConnected ? 'var(--color-success)' : 'var(--color-error)'"
                        :status="pollingState.serviceConnected ? t('onlineLabel') : t('disconnected')"
                        :status-type="pollingState.serviceConnected ? 'success' : 'error'"
                    />
                    <MetricCard
                        v-if="pollingState.serviceConnected"
                        :label="t('totalSessionsLabel')"
                        :value="sessions.length"
                        :subtitle="t('activeSessionsLabel') + ': ' + activeSessionCount"
                        icon="devices"
                        icon-color="var(--color-primary)"
                    />
                    <MetricCard
                        v-if="pollingState.serviceConnected"
                        :label="t('activeSessions')"
                        :value="activeSessionCount"
                        :subtitle="t('disabledLabel') + ': ' + disabledSessionCount"
                        icon="groups"
                        icon-color="var(--color-secondary)"
                    />
                    <MetricCard
                        :label="t('wsEndpointLabel')"
                        :value="browserWsEndpointText"
                        :copy-hint="t('clickToCopy')"
                        icon="cable"
                        icon-color="var(--color-tertiary-container)"
                        copyable
                    />
                </div>

                <!-- Session Pool Section -->
                <div v-if="pollingState.serviceConnected" class="sessions-section">
                    <div class="section-header">
                        <h2 class="section-title">{{ t("browserSessionsHeading") }}</h2>
                        <a
                            v-if="pollingState.sharePageUrl"
                            class="status-link"
                            :href="pollingState.sharePageUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {{ t("newSessionLinkLabel") }}
                        </a>
                    </div>

                    <!-- Empty State -->
                    <div v-if="sessions.length === 0" class="empty-state">
                        <span class="material-symbols-outlined empty-icon">devices_other</span>
                        <p class="empty-text">{{ t("noBrowserSessions") }}</p>
                    </div>

                    <!-- Sessions Table -->
                    <div v-else class="sessions-table-container">
                        <table class="sessions-table">
                            <thead>
                                <tr>
                                    <th>{{ t("browserIdentifierLabel") }}</th>
                                    <th>{{ t("status") }}</th>
                                    <th>{{ t("usageCount") }}</th>
                                    <th>{{ t("errorsLabel") }}</th>
                                    <th>{{ t("connectedAtLabel") }}</th>
                                    <th>{{ t("actionsPanel") }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="session in sessions"
                                    :key="session.connectionId"
                                    class="session-row"
                                    :class="{ disabled: session.disabledAt }"
                                >
                                    <td class="session-id">
                                        <span class="id-label">{{
                                            session.meta?.clientLabel || session.connectionId
                                        }}</span>
                                        <span v-if="session.meta?.address" class="id-address">{{
                                            session.meta.address
                                        }}</span>
                                    </td>
                                    <td>
                                        <span class="status-badge" :class="getSessionStatusClass(session)">
                                            {{ getSessionStatusText(session) }}
                                        </span>
                                    </td>
                                    <td class="metric-cell">{{ session.usageCount || 0 }}</td>
                                    <td class="metric-cell">
                                        <span :class="{ 'error-count': session.failureCount > 0 }">
                                            {{ session.failureCount || 0 }}
                                        </span>
                                    </td>
                                    <td class="time-cell">{{ formatTime(session.connectedAt) }}</td>
                                    <td>
                                        <el-button
                                            type="primary"
                                            size="small"
                                            :disabled="!session.disabledAt"
                                            @click="handleResetHealth(session)"
                                        >
                                            {{ t("sessionResetActionHint") }}
                                        </el-button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Settings Tab -->
            <div v-show="activeTab === 'settings'" class="content-wrapper">
                <!-- Header Section -->
                <div class="page-header">
                    <div class="header-title-group">
                        <h1 class="page-title">{{ t("settingsConfiguration") }}</h1>
                        <p class="page-subtitle">{{ t("systemSettingsLogs") }}</p>
                    </div>
                </div>

                <!-- Version Info Section -->
                <div class="settings-section">
                    <h2 class="section-title">{{ t("versionInfo") }}</h2>
                    <div class="settings-grid">
                        <div class="setting-item">
                            <div class="setting-info">
                                <label class="setting-label">GitHub {{ t("repo") }}</label>
                            </div>
                            <div class="setting-control">
                                <a href="https://github.com/iBUHub/CanvasToAPI" target="_blank" class="repo-link">
                                    iBUHub/CanvasToAPI
                                </a>
                            </div>
                        </div>
                        <div class="setting-item">
                            <div class="setting-info">
                                <label class="setting-label">{{ t("currentVersion") }}</label>
                            </div>
                            <div class="setting-control">
                                <span class="version-value">{{ appVersion }}</span>
                            </div>
                        </div>
                        <div class="setting-item">
                            <div class="setting-info">
                                <label class="setting-label">{{ t("latestVersion") }}</label>
                            </div>
                            <div class="setting-control">
                                <span v-if="versionState.hasUpdate" class="version-value has-update">
                                    <a
                                        :href="
                                            versionState.releaseUrl || 'https://github.com/iBUHub/CanvasToAPI/releases'
                                        "
                                        target="_blank"
                                        class="update-link"
                                    >
                                        {{ latestVersionFormatted }}
                                    </a>
                                </span>
                                <span v-else class="version-value">{{ latestVersionFormatted }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Log Settings Section -->
                <div class="settings-section">
                    <h2 class="section-title">{{ t("log") }}</h2>
                    <div class="settings-grid">
                        <div class="setting-item">
                            <div class="setting-info">
                                <label class="setting-label">{{ t("logLevel") }}</label>
                            </div>
                            <div class="setting-control">
                                <ElSelect
                                    :model-value="settingsState.debugMode"
                                    :disabled="settingsLoading.debugMode"
                                    @change="handleDebugModeChange"
                                >
                                    <ElOption :label="t('normal')" :value="false" />
                                    <ElOption :label="t('debug')" :value="true" />
                                </ElSelect>
                            </div>
                        </div>
                        <div class="setting-item">
                            <div class="setting-info">
                                <label class="setting-label">{{ t("logMaxCount") }}</label>
                            </div>
                            <div class="setting-control">
                                <ElInputNumber
                                    v-model="settingsState.logMaxCount"
                                    :min="10"
                                    :max="1000"
                                    :step="10"
                                    :disabled="settingsLoading.logMaxCount"
                                    @change="updateLogMaxCount"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Proxy Settings Section -->
                <div class="settings-section">
                    <h2 class="section-title">{{ t("proxySettings") }}</h2>
                    <div class="settings-grid">
                        <!-- Streaming Mode -->
                        <div class="setting-item">
                            <div class="setting-info">
                                <label class="setting-label">{{ t("streamingMode") }}</label>
                                <span class="setting-hint">{{ t("onlyAppliesWhenStreamingEnabled") }}</span>
                            </div>
                            <div class="setting-control">
                                <ElSelect
                                    v-model="settingsState.streamingMode"
                                    :disabled="settingsLoading.streamingMode"
                                    @change="updateStreamingMode"
                                >
                                    <ElOption :label="t('fake')" value="fake" />
                                    <ElOption :label="t('real')" value="real" />
                                </ElSelect>
                            </div>
                        </div>

                        <!-- Selection Strategy -->
                        <div class="setting-item">
                            <div class="setting-info">
                                <label class="setting-label">{{ t("selectionStrategyLabel") }}</label>
                            </div>
                            <div class="setting-control">
                                <ElSelect
                                    v-model="settingsState.selectionStrategy"
                                    :disabled="settingsLoading.selectionStrategy"
                                    @change="updateSelectionStrategy"
                                >
                                    <ElOption :label="t('selectionStrategyRound')" value="round" />
                                    <ElOption :label="t('selectionStrategyRandom')" value="random" />
                                </ElSelect>
                            </div>
                        </div>

                        <!-- Session Error Threshold -->
                        <div class="setting-item">
                            <div class="setting-info">
                                <label class="setting-label">{{ t("sessionErrorThreshold") }}</label>
                                <span class="setting-hint">{{ t("errorThresholdLabel") }}</span>
                            </div>
                            <div class="setting-control">
                                <ElInputNumber
                                    v-model="settingsState.sessionErrorThreshold"
                                    :min="0"
                                    :max="100"
                                    :disabled="settingsLoading.sessionErrorThreshold"
                                    @change="updateSessionErrorThreshold"
                                />
                            </div>
                        </div>

                        <!-- Force Thinking -->
                        <div class="setting-item">
                            <div class="setting-info">
                                <label class="setting-label">{{ t("forceThinking") }}</label>
                            </div>
                            <div class="setting-control">
                                <ElSwitch
                                    v-model="settingsState.forceThinking"
                                    :disabled="settingsLoading.forceThinking"
                                    @change="updateForceThinking"
                                />
                            </div>
                        </div>

                        <!-- Force Web Search -->
                        <div class="setting-item">
                            <div class="setting-info">
                                <label class="setting-label">{{ t("forceWebSearch") }}</label>
                            </div>
                            <div class="setting-control">
                                <ElSwitch
                                    v-model="settingsState.forceWebSearch"
                                    :disabled="settingsLoading.forceWebSearch"
                                    @change="updateForceWebSearch"
                                />
                            </div>
                        </div>

                        <!-- Force URL Context -->
                        <div class="setting-item">
                            <div class="setting-info">
                                <label class="setting-label">{{ t("forceUrlContext") }}</label>
                            </div>
                            <div class="setting-control">
                                <ElSwitch
                                    v-model="settingsState.forceUrlContext"
                                    :disabled="settingsLoading.forceUrlContext"
                                    @change="updateForceUrlContext"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Appearance Section -->
                <div class="settings-section">
                    <h2 class="section-title">{{ t("appearance") }}</h2>
                    <div class="settings-grid">
                        <div class="setting-item">
                            <div class="setting-info">
                                <label class="setting-label">{{ t("theme") }}</label>
                            </div>
                            <div class="setting-control">
                                <ElSelect :model-value="theme" @update:model-value="setTheme">
                                    <ElOption :label="t('followSystem')" value="auto" />
                                    <ElOption :label="t('light')" value="light" />
                                    <ElOption :label="t('dark')" value="dark" />
                                </ElSelect>
                            </div>
                        </div>
                        <div class="setting-item">
                            <div class="setting-info">
                                <label class="setting-label">{{ t("language") }}</label>
                            </div>
                            <div class="setting-control">
                                <ElSelect :model-value="currentLang" @change="onLanguageChange">
                                    <ElOption label="中文" value="zh" />
                                    <ElOption label="English" value="en" />
                                </ElSelect>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Logs Tab -->
            <div v-show="activeTab === 'logs'" class="content-wrapper">
                <!-- Header Section -->
                <div class="page-header page-header-split">
                    <div class="header-title-group">
                        <h1 class="page-title">{{ t("realtimeLogs") }} ({{ pollingState.logCount }})</h1>
                        <p class="page-subtitle">{{ t("systemLogs") }}</p>
                    </div>
                    <div class="header-actions">
                        <ElButton @click="handleClearLogsView">
                            {{ t("clearViewLabel") }}
                        </ElButton>
                        <ElButton type="primary" @click="handleDownloadLogs">
                            {{ t("downloadLogs") }}
                        </ElButton>
                    </div>
                </div>

                <!-- Logs Content -->
                <div class="logs-section">
                    <div class="logs-content">
                        <!-- eslint-disable-next-line vue/no-v-html -->
                        <pre id="log-container" v-html="formattedLogs"></pre>
                    </div>
                </div>
            </div>
        </main>

        <!-- Background Decoration -->
        <div class="bg-decoration bg-decoration-1"></div>
        <div class="bg-decoration bg-decoration-2"></div>
    </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watchEffect } from "vue";

// Components
import SideNavBar from "../components/SideNavBar.vue";
import TopAppBar from "../components/TopAppBar.vue";
import MetricCard from "../components/MetricCard.vue";

// Composables
import { useSettings } from "../composables/useSettings";
import { useSessions } from "../composables/useSessions";
import { useLogs } from "../composables/useLogs";
import { useVersionInfo } from "../composables/useVersionInfo";
import { useI18nHelper } from "../composables/useI18nHelper";
import { useStatusPolling } from "../composables/useStatusPolling";

// Utils
import I18n from "../utils/i18n";
import { useTheme } from "../utils/useTheme";

// Initialize composables
const {
    state: settingsState,
    loading: settingsLoading,
    handleDebugModeChange,
    updateLogMaxCount,
    updateStreamingMode,
    updateSelectionStrategy,
    updateSessionErrorThreshold,
    updateForceThinking,
    updateForceWebSearch,
    updateForceUrlContext,
} = useSettings();

const {
    sessions,
    activeSessionCount,
    disabledSessionCount,
    formatTime,
    getSessionStatusClass,
    getSessionStatusText,
    handleResetHealth: resetSessionHealth,
} = useSessions();

const { getFormattedLogs, clearLogsView, downloadLogs } = useLogs();

const { state: versionState, appVersion, latestVersionFormatted, fetchVersionInfo } = useVersionInfo();

const { t, getCurrentLang, toggleLanguage: toggleLang, handleLanguageChange } = useI18nHelper();

// Page-level state
const activeTab = ref("dashboard");
const { theme, setTheme } = useTheme();
const currentLang = ref(getCurrentLang());

// Status polling - pass required state references
const {
    state: pollingState,
    browserWsEndpointText,
    fetchStatus,
    startPolling,
    stopPolling,
} = useStatusPolling(settingsState, versionState, sessions, () => activeTab.value);

// Computed for formatted logs
const formattedLogs = computed(() => getFormattedLogs(pollingState.logs));

// Tab switching
const switchTab = tabName => {
    if (activeTab.value === "logs") {
        const logContainer = document.getElementById("log-container");
        if (logContainer) {
            pollingState.logScrollTop = logContainer.scrollTop;
        }
    }

    activeTab.value = tabName;

    if (tabName === "logs") {
        nextTick(() => {
            const logContainer = document.getElementById("log-container");
            if (logContainer) {
                logContainer.scrollTop = pollingState.logScrollTop || 0;
            }
        });
    }
};

// Navigation handlers
const handleSearch = () => {
    // TODO: Implement search functionality
};

const handleAction = () => {
    // TODO: Implement action handling
};

// Theme toggle
const toggleTheme = () => {
    const newTheme = theme.value === "dark" ? "light" : "dark";
    setTheme(newTheme);
};

// Language toggle wrapper
const toggleLanguage = () => {
    toggleLang();
    currentLang.value = getCurrentLang();
};

// Language change wrapper for template
const onLanguageChange = lang => {
    handleLanguageChange(lang);
    currentLang.value = lang;
};

// Reset session health with callback
const handleResetHealth = session => {
    resetSessionHealth(session, fetchStatus);
};

// Clear logs view
const handleClearLogsView = () => {
    clearLogsView(pollingState);
};

// Download logs
const handleDownloadLogs = () => {
    downloadLogs(pollingState.logs);
};

// Lifecycle
onMounted(() => {
    startPolling(5000);
    fetchVersionInfo();

    // Apply i18n
    if (I18n.isInitialized()) {
        I18n.applyI18n();
    } else {
        I18n.init();
    }

    // Update document title
    watchEffect(() => {
        document.title = "CanvasToAPI - Dashboard";
    });
});

onBeforeUnmount(() => {
    stopPolling();
});
</script>

<style lang="less" scoped>
@import "../styles/variables.less";

.dashboard-layout {
    min-height: 100vh;
    background-color: @surface;
}

.main-content {
    margin-left: @sidebar-width;
    padding-top: @topbar-height;
    min-height: 100vh;
    background-color: @surface;
}

.content-wrapper {
    padding: @spacing-2xl;
    max-width: @container-max-width;
}

// Page Header
.page-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin-bottom: @spacing-2xl;
}

.page-header-split {
    align-items: flex-start;
}

.header-title-group {
    //
}

.page-title {
    margin: 0;
    font-family: @font-family-headline;
    font-size: @font-size-3xl;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: @on-surface;
}

.page-subtitle {
    margin: @spacing-sm 0 0;
    font-size: @font-size-sm;
    color: @on-surface-variant;
}

.header-actions {
    display: flex;
    gap: @spacing-sm;
}

// Metrics Grid
.metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: @spacing-xl;
    margin-bottom: @spacing-2xl;

    @media (max-width: 1200px) {
        grid-template-columns: repeat(2, 1fr);
    }

    @media (max-width: 768px) {
        grid-template-columns: 1fr;
    }
}

// Section Title
.section-title {
    margin: 0 0 @spacing-lg;
    font-family: @font-family-headline;
    font-size: @font-size-xl;
    font-weight: 600;
    color: @on-surface;
}

// Sessions Section
.sessions-section {
    background-color: @surface-container-lowest;
    border: 1px solid rgba(195, 198, 215, 0.15);
    border-radius: @border-radius-2xl;
    overflow: hidden;
    margin-bottom: @spacing-2xl;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: @spacing-lg @spacing-xl;
    border-bottom: 1px solid @outline-variant;
}

.status-link {
    font-size: @font-size-sm;
    color: var(--color-primary);
    text-decoration: none;
    transition: opacity @transition-fast;

    &:hover {
        opacity: 0.8;
        text-decoration: underline;
    }
}

// Empty State
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: @spacing-3xl;
    text-align: center;
}

.empty-icon {
    font-size: 48px;
    color: @outline;
    margin-bottom: @spacing-md;
}

.empty-text {
    margin: 0;
    font-size: @font-size-md;
    color: @on-surface-variant;
}

// Sessions Table
.sessions-table-container {
    overflow-x: auto;
}

.sessions-table {
    width: 100%;
    border-collapse: collapse;
}

.sessions-table th {
    padding: @spacing-md @spacing-lg;
    text-align: left;
    font-family: @font-family-sans;
    font-size: @font-size-xs;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: @on-surface-variant;
    background-color: @surface-container-low;
    border-bottom: 1px solid @outline-variant;
}

.sessions-table td {
    padding: @spacing-md @spacing-lg;
    border-bottom: 1px solid @outline-variant;
    font-size: @font-size-sm;
    color: @on-surface;
}

.session-row {
    transition: background-color @transition-fast;

    &:hover {
        background-color: @surface-container;
    }

    &.disabled {
        opacity: 0.6;
    }
}

.session-id {
    .id-label {
        display: block;
        font-weight: 500;
        color: @on-surface;
    }

    .id-address {
        display: block;
        font-size: @font-size-xs;
        color: @on-surface-variant;
        margin-top: 2px;
    }
}

// Status Badge
.status-badge {
    display: inline-flex;
    align-items: center;
    padding: @spacing-xs @spacing-md;
    border-radius: @border-radius-full;
    font-size: @font-size-xs;
    font-weight: 600;
    text-transform: uppercase;

    &.status-online {
        background-color: var(--color-success-container);
        color: var(--color-on-success-container);
    }

    &.status-disabled {
        background-color: var(--color-error-container);
        color: var(--color-on-error-container);
    }
}

// Metric Cell
.metric-cell {
    font-family: @font-family-mono;
    font-size: @font-size-sm;
}

.error-count {
    color: var(--color-error);
    font-weight: 600;
}

// Time Cell
.time-cell {
    font-size: @font-size-sm;
    color: @on-surface-variant;
}

// Settings Section
.settings-section {
    margin-bottom: @spacing-2xl;
    padding: @spacing-xl;
    background-color: @surface-container-low;
    border-radius: @border-radius-xl;
}

.settings-grid {
    display: flex;
    flex-direction: column;
    gap: @spacing-lg;
}

.setting-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: @spacing-md @spacing-lg;
    background-color: @surface-container;
    border-radius: @border-radius-lg;
}

.setting-info {
    display: flex;
    flex-direction: column;
    gap: @spacing-xs;
}

.setting-label {
    font-family: @font-family-sans;
    font-size: @font-size-md;
    font-weight: 500;
    color: @on-surface;
}

.setting-hint {
    font-size: @font-size-xs;
    color: @on-surface-variant;
}

.setting-control {
    flex-shrink: 0;
}

.repo-link {
    color: var(--color-primary);
    text-decoration: none;
    font-size: @font-size-md;

    &:hover {
        text-decoration: underline;
    }
}

.version-value {
    font-family: @font-family-mono;
    font-size: @font-size-md;
    color: @on-surface;

    &.has-update {
        a {
            color: var(--color-primary);
            text-decoration: none;

            &:hover {
                text-decoration: underline;
            }
        }
    }
}

.update-link {
    color: var(--color-primary);
    text-decoration: none;

    &:hover {
        text-decoration: underline;
    }
}

// Logs Section
.logs-section {
    padding: @spacing-xl;
    background-color: @surface-container-low;
    border-radius: @border-radius-xl;
}

.logs-content {
    max-height: @log-container-max-height;
    overflow: auto;
    padding: @spacing-md;
    background-color: @surface-container;
    border-radius: @border-radius-lg;
    border: 1px solid @outline-variant;

    pre {
        margin: 0;
        font-family: @font-family-mono;
        font-size: @font-size-sm;
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-all;
        color: @on-surface;
    }
}

// Background Decorations
.bg-decoration {
    position: fixed;
    border-radius: 50%;
    filter: blur(120px);
    opacity: 0.5;
    pointer-events: none;
    z-index: -10;

    &.bg-decoration-1 {
        top: 0;
        right: 0;
        width: 640px;
        height: 640px;
        background-color: rgba(0, 74, 198, 0.05);
        transform: translate(50%, -50%);
    }

    &.bg-decoration-2 {
        bottom: 0;
        left: 0;
        width: 480px;
        height: 480px;
        background-color: rgba(81, 95, 116, 0.05);
        transform: translate(-33%, 33%);
        opacity: 0.3;
    }
}

// Dark mode adjustments
[data-theme="dark"] & {
    .main-content {
        background-color: var(--color-surface);
    }

    .sessions-section {
        background-color: var(--color-surface-container-lowest);
    }

    .sessions-table th {
        background-color: var(--color-surface-container-low);
    }
}
</style>
