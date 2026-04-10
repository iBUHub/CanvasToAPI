<!--
 * File: ui/app/pages/SettingsPage.vue
 * Description: Settings configuration page with real-time logs
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
                        <h1 class="page-title">{{ t("settingsConfiguration") }}</h1>
                        <p class="page-subtitle">{{ t("systemSettingsLogs") }}</p>
                    </div>
                </div>

                <!-- Settings Section -->
                <div class="settings-section">
                    <h2 class="section-title">{{ t("serviceConfig") }}</h2>

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

                        <!-- Debug Mode -->
                        <div class="setting-item">
                            <div class="setting-info">
                                <label class="setting-label">{{ t("debug") }}</label>
                                <span class="setting-hint">{{ t("logLevel") }}</span>
                            </div>
                            <div class="setting-control">
                                <ElSwitch
                                    v-model="state.debugMode"
                                    :disabled="loading.debugMode"
                                    @change="updateDebugMode"
                                />
                            </div>
                        </div>

                        <!-- Log Max Count -->
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

                <!-- Logs Section -->
                <div class="logs-section">
                    <div class="logs-header">
                        <h2 class="section-title">{{ t("realtimeLogs") }}</h2>
                        <div class="logs-actions">
                            <ElButton size="small" @click="clearLogsView">
                                {{ t("clearViewLabel") }}
                            </ElButton>
                            <ElButton size="small" @click="downloadLogs">
                                {{ t("downloadLogs") }}
                            </ElButton>
                        </div>
                    </div>
                    <div class="logs-content">
                        <pre>{{ displayLogs }}</pre>
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
import { onBeforeUnmount, onMounted, reactive, ref, watchEffect } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";

// Components
import SideNavBar from "../components/SideNavBar.vue";
import TopAppBar from "../components/TopAppBar.vue";

// Utils
import I18n from "../utils/i18n";
import { useTheme } from "../utils/useTheme";

// Router
const router = useRouter();

// State
const activeTab = ref("config");
const langVersion = ref(I18n.state.version);
const { theme, setTheme } = useTheme();
const updateTimer = ref(null);

const state = reactive({
    debugMode: false,
    forceThinking: false,
    forceUrlContext: false,
    forceWebSearch: false,
    logMaxCount: 100,
    logs: "",
    selectionStrategy: "round",
    sessionErrorThreshold: 3,
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

const displayLogs = ref("");

// i18n helper
const t = (key, options) => {
    langVersion.value; // trigger reactivity
    return I18n.t(key, options);
};

// Navigation
const handleNavigate = itemId => {
    activeTab.value = itemId;
    if (itemId === "dashboard") {
        router.push({ name: "status" });
    } else if (itemId === "config") {
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
    state.forceUrlContext = Boolean(status.forceUrlContext);
    state.forceWebSearch = Boolean(status.forceWebSearch);
    state.logMaxCount = Number(status.logMaxCount || 100);
    state.logs = payload?.logs || "";
    state.selectionStrategy = status.selectionStrategy || "round";
    state.streamingMode = status.streamingMode || "fake";
    displayLogs.value = state.logs;
};

// API update methods
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

const updateDebugMode = async value => {
    loading.debugMode = true;
    try {
        const response = await fetch("/api/settings/debug-mode", {
            headers: { "Content-Type": "application/json" },
            method: "PUT",
        });

        const data = await response.json();
        if (response.ok) {
            ElMessage.success(t("settingUpdateSuccess", { setting: t("debug"), value: data.value }));
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

// Logs methods
const clearLogsView = () => {
    displayLogs.value = "";
};

const downloadLogs = () => {
    const logs = displayLogs.value || state.logs;
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
    updateTimer.value = setInterval(fetchStatus, 4000);

    // Apply i18n
    if (I18n.isInitialized()) {
        I18n.applyI18n();
    } else {
        I18n.init();
    }

    // Update document title
    watchEffect(() => {
        document.title = "CanvasToAPI - Settings";
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

// Section Title
.section-title {
    margin: 0 0 @spacing-lg;
    font-family: @font-family-headline;
    font-size: @font-size-xl;
    font-weight: 600;
    color: @on-surface;
}

// Settings Section
.settings-section {
    margin-bottom: @spacing-3xl;
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

// Logs Section
.logs-section {
    padding: @spacing-xl;
    background-color: @surface-container-low;
    border-radius: @border-radius-xl;
}

.logs-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: @spacing-lg;
}

.logs-actions {
    display: flex;
    gap: @spacing-sm;
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
}
</style>
