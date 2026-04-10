<!--
 * File: ui/app/pages/StatusPage.vue
 * Description: Main dashboard page with new Material Design 3 styling
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
                        <h1 class="page-title">{{ t("dashboardOverview") }}</h1>
                        <p class="page-subtitle">{{ t("realTimeInfrastructure") }}</p>
                    </div>
                    <div class="header-actions">
                        <button class="btn-secondary" @click="handleExportReport">
                            {{ t("exportReport") }}
                        </button>
                        <button class="btn-primary">
                            <span class="material-symbols-outlined btn-icon">add</span>
                            {{ t("newDeployment") }}
                        </button>
                    </div>
                </div>

                <!-- Metrics Grid -->
                <div class="metrics-grid">
                    <MetricCard
                        :label="t('serverStatus')"
                        :value="'99.98%'"
                        :subtitle="t('uptime24h')"
                        icon=""
                        status="Online"
                        status-type="success"
                        :show-sparkline="true"
                    />
                    <MetricCard
                        :label="t('activeSessions')"
                        :value="activeSessionCount"
                        :subtitle="t('connectedViaWs', { count: wsConnectedCount })"
                        icon="groups"
                        icon-color="var(--color-primary)"
                    />
                    <MetricCard
                        :label="t('todayRequests')"
                        :value="'1,452'"
                        :subtitle="'+12% vs yesterday'"
                        icon="swap_calls"
                        icon-color="var(--color-secondary)"
                        trend="up"
                    />
                    <MetricCard
                        :label="t('avgLatency')"
                        :value="'240ms'"
                        :subtitle="'P95: 385ms'"
                        icon="timer"
                        icon-color="var(--color-tertiary-container)"
                    />
                </div>

                <!-- Charts Grid -->
                <div class="charts-grid">
                    <TrafficChart class="chart-traffic" />
                    <LoadDistribution class="chart-load" @view-logs="handleViewLogs" />
                </div>

                <!-- Recent Requests Table -->
                <RequestTable
                    :requests="recentRequests"
                    @refresh="handleRefreshRequests"
                    @filter="handleFilterRequests"
                />
            </div>
        </main>

        <!-- Background Decoration -->
        <div class="bg-decoration bg-decoration-1"></div>
        <div class="bg-decoration bg-decoration-2"></div>
    </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watchEffect } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";

// Components
import SideNavBar from "../components/SideNavBar.vue";
import TopAppBar from "../components/TopAppBar.vue";
import MetricCard from "../components/MetricCard.vue";
import TrafficChart from "../components/TrafficChart.vue";
import LoadDistribution from "../components/LoadDistribution.vue";
import RequestTable from "../components/RequestTable.vue";

// Utils
import I18n from "../utils/i18n";
import { useTheme } from "../utils/useTheme";

// Router
const router = useRouter();

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
    hasUpdate: false,
    latestVersion: "",
    logCount: 0,
    logMaxCount: 100,
    logs: "",
    selectionStrategy: "round",
    serviceConnected: false,
    sessionErrorThreshold: 3,
    streamingMode: "fake",
});

// Sample data for recent requests
const recentRequests = ref([
    { method: "POST", path: "/api/v1/transform/canvas-data", status: "200 OK", timestamp: formatTime(new Date()) },
    {
        method: "GET",
        path: "/api/v1/health/detailed",
        status: "200 OK",
        timestamp: formatTime(new Date(Date.now() - 3000)),
    },
    {
        method: "POST",
        path: "/api/v1/auth/provision",
        status: "500 ERR",
        timestamp: formatTime(new Date(Date.now() - 6000)),
    },
    {
        method: "GET",
        path: "/api/v1/legacy/export",
        status: "404 NOT",
        timestamp: formatTime(new Date(Date.now() - 11000)),
    },
    {
        method: "POST",
        path: "/api/v1/transform/canvas-data",
        status: "200 OK",
        timestamp: formatTime(new Date(Date.now() - 14000)),
    },
]);

// i18n helper
const t = (key, options) => {
    langVersion.value; // trigger reactivity
    return I18n.t(key, options);
};

// Computed
const activeSessionCount = computed(() => sessions.value.filter(s => !s.disabledAt).length);

const wsConnectedCount = computed(() => sessions.value.filter(s => !s.disabledAt).length);

// Helper functions
function formatTime(date) {
    return date.toISOString().replace("T", " ").slice(0, 19);
}

// Navigation
const handleNavigate = itemId => {
    activeTab.value = itemId;
    if (itemId === "config") {
        router.push({ name: "settings" });
    }
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

// Export report
const handleExportReport = () => {
    ElMessage.success(t("exportReportStarted", { fallback: "Export started..." }));
};

// View logs
const handleViewLogs = () => {
    activeTab.value = "logs";
};

// Refresh requests
const handleRefreshRequests = () => {
    ElMessage.success(t("refreshed", { fallback: "Refreshed" }));
};

// Filter requests
const handleFilterRequests = () => {
    console.log("Filter requests");
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
    state.sessionErrorThreshold = Number.isFinite(Number(status.sessionErrorThreshold))
        ? Number(status.sessionErrorThreshold)
        : 3;
    state.debugMode = Boolean(status.debugMode);
    state.forceThinking = Boolean(status.forceThinking);
    state.logCount = Number(payload?.logCount || 0);
    state.logMaxCount = Number(status.logMaxCount || 100);
    state.logs = payload?.logs || "";
    state.selectionStrategy = status.selectionStrategy || "round";
    state.serviceConnected = Boolean(status.serviceConnected);
    state.streamingMode = status.streamingMode || "fake";
    state.browserWsPath = status.browserWsPath || "/ws";
    sessions.value = Array.isArray(status.browserSessions) ? status.browserSessions : [];
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
    gap: @spacing-md;
}

// Buttons
.btn-secondary {
    padding: @spacing-md @spacing-lg;
    border: none;
    border-radius: @border-radius-xl;
    background-color: @surface-container-high;
    font-family: @font-family-sans;
    font-size: @font-size-sm;
    font-weight: 500;
    color: @on-surface;
    cursor: pointer;
    transition: opacity @transition-fast;

    &:hover {
        opacity: 0.8;
    }
}

.btn-primary {
    display: flex;
    align-items: center;
    gap: @spacing-sm;
    padding: @spacing-md @spacing-lg;
    border: none;
    border-radius: @border-radius-xl;
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-container) 100%);
    font-family: @font-family-sans;
    font-size: @font-size-sm;
    font-weight: 500;
    color: @on-primary;
    cursor: pointer;
    box-shadow: @shadow-sm;
    transition: opacity @transition-fast;

    &:hover {
        opacity: 0.9;
    }
}

.btn-icon {
    font-size: 16px;
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

// Charts Grid
.charts-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: @spacing-xl;
    margin-bottom: @spacing-2xl;

    @media (max-width: 1024px) {
        grid-template-columns: 1fr;
    }
}

.chart-traffic {
    //
}

.chart-load {
    //
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
}
</style>
