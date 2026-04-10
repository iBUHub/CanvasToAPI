<!--
 * File: ui/app/components/TopAppBar.vue
 * Description: Fixed top application bar with search and actions
 *
 * Author: iBUHUB
-->

<template>
    <header class="topbar">
        <!-- Search Input -->
        <div class="search-container">
            <span class="material-symbols-outlined search-icon">search</span>
            <input
                v-model="searchQuery"
                type="text"
                class="search-input"
                placeholder="Search system resources..."
                @input="handleSearch"
            />
        </div>

        <!-- Action Buttons -->
        <div class="topbar-actions">
            <button class="action-btn" title="Health Metrics" @click="handleAction('health')">
                <span class="material-symbols-outlined">health_metrics</span>
            </button>
            <button class="action-btn" title="Network" @click="handleAction('network')">
                <span class="material-symbols-outlined">lan</span>
            </button>
            <button class="action-btn" :title="themeTitle" @click="toggleTheme">
                <span class="material-symbols-outlined">{{ themeIcon }}</span>
            </button>
            <button class="action-btn" :title="languageTitle" @click="toggleLanguage">
                <span class="material-symbols-outlined">translate</span>
            </button>
        </div>
    </header>
</template>

<script setup>
import { ref, computed, defineEmits } from "vue";
import I18n from "../utils/i18n";

// Emits
const emit = defineEmits(["search", "action", "toggle-theme", "toggle-language"]);

// State
const searchQuery = ref("");

// Computed
const isDark = computed(() => {
    return document.documentElement.getAttribute("data-theme") === "dark";
});

const themeIcon = computed(() => {
    return isDark.value ? "light_mode" : "dark_mode";
});

const themeTitle = computed(() => {
    return isDark.value ? "Switch to Light Mode" : "Switch to Dark Mode";
});

const languageTitle = computed(() => {
    return I18n.locale.value === "en" ? "切换到中文" : "Switch to English";
});

// Methods
const handleSearch = () => {
    emit("search", searchQuery.value);
};

const handleAction = action => {
    emit("action", action);
};

const toggleTheme = () => {
    emit("toggle-theme");
};

const toggleLanguage = () => {
    emit("toggle-language");
};
</script>

<style lang="less" scoped>
@import "../styles/variables.less";

.topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: fixed;
    top: 0;
    right: 0;
    left: @sidebar-width;
    z-index: @z-index-sticky;
    height: @topbar-height;
    padding: 0 @spacing-2xl;
    background-color: var(--affix-bg);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid @outline-variant;
    font-family: @font-family-headline;
}

.search-container {
    display: flex;
    align-items: center;
    gap: @spacing-sm;
    width: 384px;
    padding: @spacing-sm @spacing-lg;
    background-color: @surface-container-low;
    border-radius: @border-radius-full;
}

.search-icon {
    font-size: 16px;
    color: @outline;
}

.search-input {
    flex: 1;
    border: none;
    background: transparent;
    font-family: @font-family-sans;
    font-size: @font-size-sm;
    color: @on-surface-variant;
    outline: none;

    &::placeholder {
        color: @outline;
    }
}

.topbar-actions {
    display: flex;
    align-items: center;
    gap: @spacing-sm;
}

.action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: @border-radius-lg;
    background: transparent;
    color: @text-secondary;
    cursor: pointer;
    transition: all @transition-fast;

    &:hover {
        background-color: @surface-container;
        color: var(--color-primary);
    }

    .material-symbols-outlined {
        font-size: 24px;
    }
}

// Dark mode adjustments
[data-theme="dark"] & {
    background-color: var(--affix-bg);

    .search-container {
        background-color: var(--color-surface-container-low);
    }
}
</style>
