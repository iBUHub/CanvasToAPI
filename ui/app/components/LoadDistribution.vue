<!--
 * File: ui/app/components/LoadDistribution.vue
 * Description: Account load distribution progress bars component
 *
 * Author: iBUHUB
-->

<template>
    <div class="load-distribution">
        <!-- Header -->
        <div class="distribution-header">
            <h3 class="distribution-title">{{ title }}</h3>
            <p class="distribution-subtitle">{{ subtitle }}</p>
        </div>

        <!-- Progress Bars -->
        <div class="distribution-bars">
            <div v-for="item in items" :key="item.id" class="bar-item">
                <div class="bar-label-row">
                    <span class="bar-label">{{ item.label }}</span>
                    <span class="bar-value">{{ item.value }}%</span>
                </div>
                <div class="bar-track">
                    <div
                        class="bar-fill"
                        :style="{
                            width: item.value + '%',
                            backgroundColor: item.color,
                        }"
                    ></div>
                </div>
            </div>
        </div>

        <!-- Footer Link -->
        <div class="distribution-footer">
            <button class="footer-link" @click="handleViewLogs">View Detailed Balancer Logs</button>
        </div>
    </div>
</template>

<script setup>
import { defineProps, defineEmits } from "vue";

// Props
defineProps({
    items: {
        default: () => [
            { color: "var(--color-primary)", id: "account-01", label: "account-01", value: 42 },
            { color: "var(--color-secondary)", id: "account-02", label: "account-02", value: 28 },
            { color: "var(--color-tertiary-container)", id: "account-03", label: "account-03", value: 15 },
            { color: "var(--color-outline)", id: "account-04", label: "account-04", value: 15 },
        ],
        required: false,
        type: Array,
    },
    subtitle: {
        default: "Requests per account unit",
        required: false,
        type: String,
    },
    title: {
        default: "Load Distribution",
        required: false,
        type: String,
    },
});

// Emits
const emit = defineEmits(["view-logs"]);

// Methods
const handleViewLogs = () => {
    emit("view-logs");
};
</script>

<style lang="less" scoped>
@import "../styles/variables.less";

.load-distribution {
    padding: @spacing-xl;
    background-color: @surface-container-low;
    border: 1px solid rgba(195, 198, 215, 0.15);
    border-radius: @border-radius-2xl;
}

.distribution-header {
    margin-bottom: @spacing-2xl;
}

.distribution-title {
    margin: 0;
    font-family: @font-family-headline;
    font-size: @font-size-lg;
    font-weight: 700;
    color: @on-surface;
}

.distribution-subtitle {
    margin: @spacing-xs 0 0;
    font-size: @font-size-xs;
    color: @on-surface-variant;
}

.distribution-bars {
    display: flex;
    flex-direction: column;
    gap: @spacing-xl;
}

.bar-item {
    //
}

.bar-label-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: @spacing-sm;
    font-size: @font-size-xs;
}

.bar-label {
    font-family: @font-family-mono;
    color: @on-surface;
}

.bar-value {
    color: @on-surface-variant;
}

.bar-track {
    height: 8px;
    background-color: @surface-container-highest;
    border-radius: @border-radius-full;
    overflow: hidden;
}

.bar-fill {
    height: 100%;
    border-radius: @border-radius-full;
    transition: width @transition-normal;
}

.distribution-footer {
    margin-top: @spacing-2xl;
    padding-top: @spacing-xl;
    border-top: 1px solid rgba(195, 198, 215, 0.1);
    text-align: center;
}

.footer-link {
    background: none;
    border: none;
    font-family: @font-family-sans;
    font-size: @font-size-xs;
    font-weight: 700;
    color: var(--color-primary);
    cursor: pointer;
    transition: opacity @transition-fast;

    &:hover {
        opacity: 0.8;
        text-decoration: underline;
    }
}

// Dark mode adjustments
[data-theme="dark"] & {
    background-color: var(--color-surface-container-low);

    .bar-track {
        background-color: var(--color-surface-container-highest);
    }
}
</style>
