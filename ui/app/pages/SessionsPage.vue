<!--
 * File: ui/app/pages/SessionsPage.vue
 * Description: Sessions management page for browser session pool status and health management
 *
 * Author: iBUHUB
-->

<template>
    <div class="dashboard-layout">
        <!-- Side Navigation -->
        <SideNavBar :active-item="activeTab" @navigate="handleNavigate" />

        <!-- Top App Bar -->
        <TopAppBar
            @search="handleSearch"
            @action="handleAction"
            @toggle-theme="toggleTheme"
            @toggle-language="toggleLanguage"
        />

        <!-- Main Content -->
        <main class="main-content">
            <div class="content-wrapper">
                <!-- Header Section -->
                <div class="page-header">
                    <div class="header-title-group">
                        <h1 class="page-title">{{ t("browserSessionsHeading") }}</h1>
                        <p class="page-subtitle">{{ t("sessionPoolHeading") }}</p>
                    </div>
                </div>

                <!-- Service Status Cards -->
                <div class="metrics-grid">
                    <MetricCard
                        :label="t('serviceStatus')"
                        :value="serviceConnected ? t('connected') : t('disconnected')"
                        icon="cloud"
                        :icon-color="serviceConnected ? 'var(--color-success)' : 'var(--color-error)'"
                        :status="serviceConnected ? t('onlineLabel') : t('disconnected')"
                        :status-type="serviceConnected ? 'success' : 'error'"
                    />
                    <MetricCard
                        :label="t('totalSessionsLabel')"
                        :value="sessions.length"
                        :subtitle="t('activeSessionsLabel') + ': ' + activeSessionCount"
                        icon="devices"
                        icon-color="var(--color-primary)"
                    />
                    <MetricCard
                        :label="t('activeSessions')"
                        :value="activeSessionCount"
                        :subtitle="t('disabledLabel') + ': ' + disabledSessionCount"
                        icon="groups"
                        icon-color="var(--color-secondary)"
                    />
                    <MetricCard
                        :label="t('wsEndpointLabel')"
                        :value="browserWsPath"
                        icon="cable"
                        icon-color="var(--color-tertiary-container)"
                    />
                </div>

                <!-- Sessions List -->
                <div class="sessions-section">
                    <div class="section-header">
                        <h2 class="section-title">{{ t("browserSessionsHeading") }}</h2>
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
        </main>

        <!-- Background Decoration -->
        <div class="bg-decoration bg-decoration-1"></div>
        <div class="bg-decoration bg-decoration-2"></div>
    </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watchEffect } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";

// Components
import SideNavBar from "../components/SideNavBar.vue";
import TopAppBar from "../components/TopAppBar.vue";
import MetricCard from "../components/MetricCard.vue";

// Utils
import I18n from "../utils/i18n";
import { useTheme } from "../utils/useTheme";

// State
const activeTab = ref("sessions");
const sessions = ref([]);
const updateTimer = ref(null);
const langVersion = ref(I18n.state.version);
const { theme, setTheme } = useTheme();

const state = reactive({
    browserWsPath: "/ws",
    serviceConnected: false,
});

// i18n helper
const t = (key, options) => {
    langVersion.value; // trigger reactivity
    return I18n.t(key, options);
};

// Computed
const serviceConnected = computed(() => state.serviceConnected);
const browserWsPath = computed(() => state.browserWsPath);
const activeSessionCount = computed(() => sessions.value.filter(s => !s.disabledAt).length);
const disabledSessionCount = computed(() => sessions.value.filter(s => s.disabledAt).length);

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

// Navigation
const handleNavigate = itemId => {
    activeTab.value = itemId;
};

// Search
const handleSearch = query => {
    console.log("Search:", query);
};

// Actions
const handleAction = action => {
    console.log("Action:", action);
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

// Fetch status data
const fetchStatus = async () => {
    try {
        const response = await fetch("/api/status");
        if (!response.ok) {
            throw new Error("Failed to fetch status");
        }
        const data = await response.json();
        applyStatusPayload(data);
    } catch (error) {
        console.error("Failed to fetch status:", error);
    }
};

const applyStatusPayload = payload => {
    const status = payload?.status || {};
    state.serviceConnected = Boolean(status.serviceConnected);
    state.browserWsPath = status.browserWsPath || "/ws";
    sessions.value = Array.isArray(status.browserSessions) ? status.browserSessions : [];
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

// Lifecycle
onMounted(() => {
    fetchStatus();
    updateTimer.value = setInterval(fetchStatus, 5000);

    // Apply i18n
    if (I18n.isInitialized()) {
        I18n.applyI18n();
    } else {
        I18n.init();
    }

    // Update document title
    watchEffect(() => {
        document.title = "CanvasToAPI - Sessions";
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

// Sessions Section
.sessions-section {
    background-color: @surface-container-lowest;
    border: 1px solid rgba(195, 198, 215, 0.15);
    border-radius: @border-radius-2xl;
    overflow: hidden;
}

.section-header {
    padding: @spacing-lg @spacing-xl;
    border-bottom: 1px solid @outline-variant;
}

.section-title {
    margin: 0;
    font-family: @font-family-headline;
    font-size: @font-size-lg;
    font-weight: 600;
    color: @on-surface;
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
