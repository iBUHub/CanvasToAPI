<!--
 * File: ui/app/components/SideNavBar.vue
 * Description: Fixed left sidebar navigation component
 *
 * Author: iBUHUB
-->

<template>
    <aside class="sidebar">
        <!-- Logo Section -->
        <div class="sidebar-logo">
            <h1 class="logo-text">CanvasToAPI</h1>
            <p class="logo-subtitle">Technical Proxy</p>
        </div>

        <!-- Navigation Menu -->
        <nav class="sidebar-nav">
            <button
                v-for="item in navItems"
                :key="item.id"
                class="nav-item"
                :class="{ active: activeItem === item.id }"
                :title="item.label"
                @click="handleNavClick(item.id)"
            >
                <span class="material-symbols-outlined nav-icon">{{ item.icon }}</span>
                <span class="nav-label">{{ item.label }}</span>
            </button>
        </nav>

        <!-- User Profile -->
        <div class="sidebar-footer">
            <div class="user-avatar">
                <span class="material-symbols-outlined">person</span>
            </div>
            <div class="user-info">
                <p class="user-name">Admin User</p>
                <p class="user-email">admin@canvastoapi.io</p>
            </div>
        </div>
    </aside>
</template>

<script setup>
import { ref, defineProps, defineEmits } from "vue";

// Props
defineProps({
    activeItem: {
        default: "dashboard",
        required: false,
        type: String,
    },
});

// Emits
const emit = defineEmits(["navigate"]);

// Navigation items - aligned with original tab structure
const navItems = ref([
    { icon: "dashboard", id: "dashboard", label: "Dashboard" },
    { icon: "settings_input_component", id: "settings", label: "Settings" },
    { icon: "terminal", id: "logs", label: "System Logs" },
]);

// Methods
const handleNavClick = itemId => {
    emit("navigate", itemId);
};
</script>

<style lang="less" scoped>
@import "../styles/variables.less";

.sidebar {
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0;
    left: 0;
    z-index: @z-index-fixed;
    width: @sidebar-width;
    height: 100vh;
    padding: @spacing-xl;
    background-color: @surface-container-low;
    border-right: 1px solid @outline-variant;
    font-family: @font-family-headline;
    font-size: @font-size-sm;
    font-weight: 500;
}

.sidebar-logo {
    margin-bottom: @spacing-2xl;
    padding: 0 @spacing-sm;
}

.logo-text {
    margin: 0;
    font-size: @font-size-xl;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--color-primary);
}

.logo-subtitle {
    margin: @spacing-xs 0 0;
    font-size: @font-size-xs;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: @text-secondary;
}

.sidebar-nav {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: @spacing-xs;
}

.nav-item {
    display: flex;
    align-items: center;
    gap: @spacing-md;
    width: 100%;
    padding: @spacing-md @spacing-lg;
    border: none;
    border-radius: @border-radius-xl;
    background: transparent;
    color: @text-secondary;
    font-family: inherit;
    font-size: inherit;
    font-weight: inherit;
    text-align: left;
    cursor: pointer;
    transition: all @transition-normal;

    &:hover {
        background-color: @surface-container;
    }

    &.active {
        background-color: @surface-container-high;
        color: var(--color-primary);
        font-weight: 600;
        transform: translateX(4px);
    }
}

.nav-icon {
    font-size: 20px;
}

.nav-label {
    white-space: nowrap;
}

.sidebar-footer {
    display: flex;
    align-items: center;
    gap: @spacing-md;
    margin-top: auto;
    padding-top: @spacing-xl;
    border-top: 1px solid @outline-variant;
}

.user-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: @border-radius-circle;
    background-color: var(--color-primary-container);
    color: @on-primary;

    .material-symbols-outlined {
        font-size: 16px;
    }
}

.user-info {
    flex: 1;
    min-width: 0;
    overflow: hidden;
}

.user-name {
    margin: 0;
    font-size: @font-size-xs;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: @text-primary;
}

.user-email {
    margin: 2px 0 0;
    font-size: 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: @text-secondary;
}

// Dark mode adjustments
[data-theme="dark"] & {
    background-color: var(--color-surface-container-low);
}
</style>
