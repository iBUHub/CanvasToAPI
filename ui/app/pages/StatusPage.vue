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
                </div>

                <!-- Metrics Grid -->
                <div class="metrics-grid">
                    <MetricCard
                        :label="t('activeSessions')"
                        :value="activeSessionCount"
                        :subtitle="t('connectedViaWs', { count: wsConnectedCount })"
                        icon="groups"
                        icon-color="var(--color-primary)"
                    />
                </div>

                <!-- Load Distribution -->
                <div v-if="loadDistributionItems.length > 0" class="load-distribution-wrapper">
                    <LoadDistribution :items="loadDistributionItems" @view-logs="handleViewLogs" />
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
import { useRouter } from "vue-router";

// Components
import SideNavBar from "../components/SideNavBar.vue";
import TopAppBar from "../components/TopAppBar.vue";
import MetricCard from "../components/MetricCard.vue";
import LoadDistribution from "../components/LoadDistribution.vue";

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

// i18n helper
const t = (key, options) => {
    langVersion.value; // trigger reactivity
    return I18n.t(key, options);
};

// Computed
const activeSessionCount = computed(() => sessions.value.filter(s => !s.disabledAt).length);

const wsConnectedCount = computed(() => sessions.value.filter(s => !s.disabledAt).length);

// Transform sessions data for LoadDistribution component
const loadDistributionItems = computed(() => {
    const activeSessions = sessions.value.filter(s => !s.disabledAt);
    const totalUsage = activeSessions.reduce((sum, s) => sum + (s.usageCount || 0), 0);

    if (totalUsage === 0) {
        return [];
    }

    const colors = [
        "var(--color-primary)",
        "var(--color-secondary)",
        "var(--color-tertiary-container)",
        "var(--color-outline)",
    ];

    return activeSessions.map((session, index) => ({
        color: colors[index % colors.length],
        id: session.sessionId || session.connectionId,
        label: session.sessionId || session.connectionId,
        value: totalUsage > 0 ? Math.round(((session.usageCount || 0) / totalUsage) * 100) : 0,
    }));
});

// Navigation
const handleNavigate = itemId => {
    activeTab.value = itemId;
    if (itemId === "config") {
        router.push({ name: "settings" });
    }
};

// Search
const handleSearch = () => {
    // TODO: Implement search functionality
};

// Actions
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

// View logs
const handleViewLogs = () => {
    activeTab.value = "logs";
    router.push({ name: "settings" });
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
    justify-content: flex-start;
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
    grid-template-columns: 1fr;
    gap: @spacing-xl;
    margin-bottom: @spacing-2xl;

    @media (max-width: 768px) {
        grid-template-columns: 1fr;
    }
}

// Load Distribution
.load-distribution-wrapper {
    margin-bottom: @spacing-2xl;
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
