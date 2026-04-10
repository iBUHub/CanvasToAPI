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
                        :value="state.serviceConnected ? t('connected') : t('disconnected')"
                        icon="cloud"
                        :icon-color="state.serviceConnected ? 'var(--color-success)' : 'var(--color-error)'"
                        :status="state.serviceConnected ? t('onlineLabel') : t('disconnected')"
                        :status-type="state.serviceConnected ? 'success' : 'error'"
                    />
                    <MetricCard
                        v-if="state.serviceConnected"
                        :label="t('totalSessionsLabel')"
                        :value="sessions.length"
                        :subtitle="t('activeSessionsLabel') + ': ' + activeSessionCount"
                        icon="devices"
                        icon-color="var(--color-primary)"
                    />
                    <MetricCard
                        v-if="state.serviceConnected"
                        :label="t('activeSessions')"
                        :value="activeSessionCount"
                        :subtitle="t('disabledLabel') + ': ' + disabledSessionCount"
                        icon="groups"
                        icon-color="var(--color-secondary)"
                    />
                    <MetricCard
                        :label="t('wsEndpointLabel')"
                        :value="browserWsEndpointText"
                        icon="cable"
                        icon-color="var(--color-tertiary-container)"
                    />
                </div>

                <!-- Session Pool Section -->
                <div v-if="state.serviceConnected" class="sessions-section">
                    <div class="section-header">
                        <h2 class="section-title">{{ t("browserSessionsHeading") }}</h2>
                        <a
                            v-if="state.sharePageUrl"
                            class="status-link"
                            :href="state.sharePageUrl"
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
                                <span v-if="state.hasUpdate" class="version-value has-update">
                                    <a
                                        :href="state.releaseUrl || 'https://github.com/iBUHub/CanvasToAPI/releases'"
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
                                    :model-value="state.debugMode"
                                    :disabled="loading.debugMode"
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
                                    v-model="state.logMaxCount"
                                    :min="10"
                                    :max="1000"
                                    :step="10"
                                    :disabled="loading.logMaxCount"
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
                                    v-model="state.streamingMode"
                                    :disabled="loading.streamingMode"
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
                                    v-model="state.selectionStrategy"
                                    :disabled="loading.selectionStrategy"
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
                                    v-model="state.sessionErrorThreshold"
                                    :min="0"
                                    :max="100"
                                    :disabled="loading.sessionErrorThreshold"
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
                                    v-model="state.forceThinking"
                                    :disabled="loading.forceThinking"
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
                                    v-model="state.forceWebSearch"
                                    :disabled="loading.forceWebSearch"
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
                                    v-model="state.forceUrlContext"
                                    :disabled="loading.forceUrlContext"
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
                                <ElSelect :model-value="state.currentLang" @change="handleLanguageChange">
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
                        <h1 class="page-title">{{ t("realtimeLogs") }} ({{ state.logCount }})</h1>
                        <p class="page-subtitle">{{ t("systemLogs") }}</p>
                    </div>
                    <div class="header-actions">
                        <ElButton @click="clearLogsView">
                            {{ t("clearViewLabel") }}
                        </ElButton>
                        <ElButton type="primary" @click="downloadLogs">
                            {{ t("downloadLogs") }}
                        </ElButton>
                    </div>
                </div>

                <!-- Logs Content -->
                <div class="logs-section">
                    <div class="logs-content">
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
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watchEffect } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";

// Components
import SideNavBar from "../components/SideNavBar.vue";
import TopAppBar from "../components/TopAppBar.vue";
import MetricCard from "../components/MetricCard.vue";

// Utils
import I18n from "../utils/i18n";
import escapeHtml from "../utils/escapeHtml";
import { useTheme } from "../utils/useTheme";

// State
const activeTab = ref("dashboard");
const sessions = ref([]);
const updateTimer = ref(null);
const langVersion = ref(I18n.state.version);
const { theme, setTheme } = useTheme();

const state = reactive({
    browserWsPath: "/ws",
    currentLang: I18n.getLang(),
    currentVersion: "",
    debugMode: false,
    forceThinking: false,
    forceUrlContext: false,
    forceWebSearch: false,
    hasUpdate: false,
    latestVersion: "",
    logCount: 0,
    logMaxCount: 100,
    logs: "",
    logScrollTop: 0,
    releaseUrl: "",
    selectionStrategy: "round",
    serviceConnected: false,
    sessionErrorThreshold: 3,
    sharePageUrl: "",
    streamingMode: "fake",
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
const t = (key, options) => {
    langVersion.value; // trigger reactivity
    return I18n.t(key, options);
};

// Computed
const activeSessionCount = computed(() => sessions.value.filter(s => !s.disabledAt).length);
const disabledSessionCount = computed(() => sessions.value.filter(s => s.disabledAt).length);

const browserWsEndpointText = computed(() => {
    if (typeof window === "undefined") {
        return state.browserWsPath || "/ws";
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}${state.browserWsPath || "/ws"}`;
});

const appVersion = computed(() => {
    const version = state.currentVersion || (typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev");
    if (/^\d/.test(version)) {
        return `v${version}`;
    }
    if (version.startsWith("preview")) {
        return version.charAt(0).toUpperCase() + version.slice(1);
    }
    return version;
});

const latestVersionFormatted = computed(() => {
    const version =
        state.latestVersion ||
        state.currentVersion ||
        (typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev");
    if (/^\d/.test(version)) {
        return `v${version}`;
    }
    if (version.startsWith("preview")) {
        return version.charAt(0).toUpperCase() + version.slice(1);
    }
    return version;
});

const highlightLogLevel = (content, level, color) =>
    content.replace(
        new RegExp(`(^|\\r?\\n)(\\[${level}\\])(?=\\s)`, "g"),
        `$1<span style="color: ${color}; font-weight: bold;">$2</span>`
    );

const formattedLogs = computed(() => {
    let safeLogs = escapeHtml(state.logs || t("loading"));

    safeLogs = highlightLogLevel(safeLogs, "DEBUG", "#3498db");
    safeLogs = highlightLogLevel(safeLogs, "WARN", "#f39c12");
    safeLogs = highlightLogLevel(safeLogs, "ERROR", "#e74c3c");

    return safeLogs;
});

// Helper functions
function formatTime(timestamp) {
    if (!timestamp) return "-";
    const date = new Date(timestamp);
    return date.toLocaleString();
}

function getSessionStatusClass(session) {
    if (session.disabledAt) {
        return "status-disabled";
    }
    return "status-online";
}

function getSessionStatusText(session) {
    if (session.disabledAt) {
        return t("disabledLabel");
    }
    return t("onlineLabel");
}

// Tab switching
const switchTab = tabName => {
    if (activeTab.value === "logs") {
        const logContainer = document.getElementById("log-container");
        if (logContainer) {
            state.logScrollTop = logContainer.scrollTop;
        }
    }

    activeTab.value = tabName;

    if (tabName === "logs") {
        nextTick(() => {
            const logContainer = document.getElementById("log-container");
            if (logContainer) {
                logContainer.scrollTop = state.logScrollTop || 0;
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

// Language toggle
const toggleLanguage = () => {
    I18n.toggleLang();
    langVersion.value++;
};

const handleLanguageChange = lang => {
    I18n.setLang(lang);
    state.currentLang = lang;
    langVersion.value++;
};

// Fetch status data
const fetchStatus = async () => {
    try {
        const logContainer = activeTab.value === "logs" ? document.getElementById("log-container") : null;
        if (logContainer) {
            state.logScrollTop = logContainer.scrollTop;
        }

        const response = await fetch("/api/status");
        if (response.redirected) {
            window.location.href = response.url;
            return;
        }
        if (response.status === 401) {
            window.location.href = "/login";
            return;
        }
        if (!response.ok) throw new Error(`status ${response.status}`);

        const data = await response.json();
        applyStatusPayload(data);

        if (activeTab.value === "logs") {
            nextTick(() => {
                const updatedLogContainer = document.getElementById("log-container");
                if (updatedLogContainer) {
                    updatedLogContainer.scrollTop = state.logScrollTop || 0;
                }
            });
        }
    } catch (error) {
        state.serviceConnected = false;
    }
};

const applyStatusPayload = payload => {
    const status = payload?.status || {};
    state.sessionErrorThreshold = Number.isFinite(Number(status.sessionErrorThreshold))
        ? Number(status.sessionErrorThreshold)
        : 3;
    state.debugMode = Boolean(status.debugMode);
    state.forceThinking = Boolean(status.forceThinking);
    state.forceUrlContext = Boolean(status.forceUrlContext);
    state.forceWebSearch = Boolean(status.forceWebSearch);
    state.logCount = Number(payload?.logCount || 0);
    state.logMaxCount = Number(status.logMaxCount || 100);
    state.logs = payload?.logs || "";
    state.selectionStrategy = status.selectionStrategy || "round";
    state.serviceConnected = Boolean(status.serviceConnected);
    state.streamingMode = status.streamingMode || "fake";
    state.browserWsPath = status.browserWsPath || "/ws";
    state.sharePageUrl = status.sharePageUrl || "";
    sessions.value = Array.isArray(status.browserSessions) ? status.browserSessions : [];
};

// Fetch version info
const fetchVersionInfo = async () => {
    try {
        const response = await fetch("/api/version/check");
        if (!response.ok) {
            return;
        }

        const data = await response.json();
        state.currentVersion = data.current || "";
        state.hasUpdate = Boolean(data.hasUpdate);
        state.latestVersion = data.latest || "";
        state.releaseUrl = data.releaseUrl || "";
    } catch {
        state.hasUpdate = false;
    }
};

// Reset session health
const handleResetHealth = async session => {
    try {
        await ElMessageBox.confirm(t("sessionResetConfirm", { session: session.connectionId }), t("warningTitle"), {
            cancelButtonText: t("cancel"),
            confirmButtonText: t("ok"),
            type: "warning",
        });

        const response = await fetch(`/api/sessions/${session.sessionId}/reset-health`, {
            headers: {
                "Content-Type": "application/json",
            },
            method: "PUT",
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Reset failed");
        }

        ElMessage.success(t("sessionResetSuccess", { session: session.connectionId }));

        // Refresh session list
        await fetchStatus();
    } catch (error) {
        if (error !== "cancel") {
            ElMessage.error(error.message || t("unknownError"));
        }
    }
};

// Settings update methods
const handleDebugModeChange = async value => {
    loading.debugMode = true;
    try {
        const response = await fetch("/api/settings/debug-mode", {
            headers: { "Content-Type": "application/json" },
            method: "PUT",
        });

        const data = await response.json();
        if (response.ok) {
            ElMessage.success(t("settingUpdateSuccess", { setting: t("logLevel"), value: data.value }));
        } else {
            ElMessage.error(t("settingFailed", { message: data.message || "Unknown error" }));
            state.debugMode = !value;
        }
    } catch (error) {
        ElMessage.error(t("settingFailed", { message: error.message }));
        state.debugMode = !value;
    } finally {
        loading.debugMode = false;
    }
};

const updateLogMaxCount = async value => {
    loading.logMaxCount = true;
    try {
        const response = await fetch("/api/settings/log-max-count", {
            body: JSON.stringify({ count: value }),
            headers: { "Content-Type": "application/json" },
            method: "PUT",
        });

        const data = await response.json();
        if (response.ok) {
            ElMessage.success(t("settingUpdateSuccess", { setting: t("logMaxCount"), value }));
        } else {
            ElMessage.error(t("settingFailed", { message: data.message || "Unknown error" }));
        }
    } catch (error) {
        ElMessage.error(t("settingFailed", { message: error.message }));
    } finally {
        loading.logMaxCount = false;
    }
};

const updateStreamingMode = async value => {
    loading.streamingMode = true;
    try {
        // Show confirmation for "real" mode
        if (value === "real") {
            try {
                await ElMessageBox.confirm(t("streamingModeEnableConfirm"), t("warningTitle"), {
                    cancelButtonText: t("cancel"),
                    confirmButtonText: t("ok"),
                    type: "warning",
                });
            } catch {
                // User cancelled, revert to "fake"
                state.streamingMode = "fake";
                loading.streamingMode = false;
                return;
            }
        }

        const response = await fetch("/api/settings/streaming-mode", {
            body: JSON.stringify({ mode: value }),
            headers: { "Content-Type": "application/json" },
            method: "PUT",
        });

        const data = await response.json();
        if (response.ok) {
            ElMessage.success(t("settingUpdateSuccess", { setting: t("streamingMode"), value }));
        } else {
            ElMessage.error(t("settingFailed", { message: data.message || "Unknown error" }));
            state.streamingMode = value === "real" ? "fake" : "real";
        }
    } catch (error) {
        ElMessage.error(t("settingFailed", { message: error.message }));
        state.streamingMode = value === "real" ? "fake" : "real";
    } finally {
        loading.streamingMode = false;
    }
};

const updateSelectionStrategy = async value => {
    loading.selectionStrategy = true;
    try {
        const response = await fetch("/api/settings/selection-strategy", {
            body: JSON.stringify({ strategy: value }),
            headers: { "Content-Type": "application/json" },
            method: "PUT",
        });

        const data = await response.json();
        if (response.ok) {
            ElMessage.success(t("settingUpdateSuccess", { setting: t("selectionStrategyLabel"), value }));
        } else {
            ElMessage.error(t("settingFailed", { message: data.message || "Unknown error" }));
            state.selectionStrategy = value === "round" ? "random" : "round";
        }
    } catch (error) {
        ElMessage.error(t("settingFailed", { message: error.message }));
        state.selectionStrategy = value === "round" ? "random" : "round";
    } finally {
        loading.selectionStrategy = false;
    }
};

const updateSessionErrorThreshold = async value => {
    loading.sessionErrorThreshold = true;
    try {
        const response = await fetch("/api/settings/session-error-threshold", {
            body: JSON.stringify({ threshold: value }),
            headers: { "Content-Type": "application/json" },
            method: "PUT",
        });

        const data = await response.json();
        if (response.ok) {
            ElMessage.success(t("settingUpdateSuccess", { setting: t("sessionErrorThreshold"), value }));
        } else {
            ElMessage.error(t("settingFailed", { message: data.message || "Unknown error" }));
        }
    } catch (error) {
        ElMessage.error(t("settingFailed", { message: error.message }));
    } finally {
        loading.sessionErrorThreshold = false;
    }
};

const updateForceThinking = async value => {
    loading.forceThinking = true;
    try {
        const response = await fetch("/api/settings/force-thinking", {
            headers: { "Content-Type": "application/json" },
            method: "PUT",
        });

        const data = await response.json();
        if (response.ok) {
            ElMessage.success(t("settingUpdateSuccess", { setting: t("forceThinking"), value: data.value }));
        } else {
            ElMessage.error(t("settingFailed", { message: data.message || "Unknown error" }));
            state.forceThinking = !value;
        }
    } catch (error) {
        ElMessage.error(t("settingFailed", { message: error.message }));
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
                await ElMessageBox.confirm(t("forceWebSearchEnableConfirm"), t("warningTitle"), {
                    cancelButtonText: t("cancel"),
                    confirmButtonText: t("ok"),
                    type: "warning",
                });
            } catch {
                // User cancelled, revert
                state.forceWebSearch = false;
                loading.forceWebSearch = false;
                return;
            }
        }

        const response = await fetch("/api/settings/force-web-search", {
            headers: { "Content-Type": "application/json" },
            method: "PUT",
        });

        const data = await response.json();
        if (response.ok) {
            ElMessage.success(t("settingUpdateSuccess", { setting: t("forceWebSearch"), value: data.value }));
        } else {
            ElMessage.error(t("settingFailed", { message: data.message || "Unknown error" }));
            state.forceWebSearch = !value;
        }
    } catch (error) {
        ElMessage.error(t("settingFailed", { message: error.message }));
        state.forceWebSearch = !value;
    } finally {
        loading.forceWebSearch = false;
    }
};

const updateForceUrlContext = async value => {
    loading.forceUrlContext = true;
    try {
        const response = await fetch("/api/settings/force-url-context", {
            headers: { "Content-Type": "application/json" },
            method: "PUT",
        });

        const data = await response.json();
        if (response.ok) {
            ElMessage.success(t("settingUpdateSuccess", { setting: t("forceUrlContext"), value: data.value }));
        } else {
            ElMessage.error(t("settingFailed", { message: data.message || "Unknown error" }));
            state.forceUrlContext = !value;
        }
    } catch (error) {
        ElMessage.error(t("settingFailed", { message: error.message }));
        state.forceUrlContext = !value;
    } finally {
        loading.forceUrlContext = false;
    }
};

// Logs methods
const clearLogsView = () => {
    state.logs = "";
};

const downloadLogs = () => {
    const logs = state.logs;
    if (!logs) {
        ElMessage.warning(t("noLogsAvailable"));
        return;
    }

    const blob = new Blob([logs], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `canvastoapi-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// Lifecycle
onMounted(() => {
    fetchStatus();
    fetchVersionInfo();
    updateTimer.value = setInterval(fetchStatus, 5000);

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
    if (updateTimer.value) {
        clearInterval(updateTimer.value);
    }
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
