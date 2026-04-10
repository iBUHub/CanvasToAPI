<!--
 * File: ui/app/components/MetricCard.vue
 * Description: Reusable metric card component for dashboard stats
 *
 * Author: iBUHUB
-->

<template>
    <div class="metric-card">
        <!-- Header -->
        <div class="metric-header">
            <span class="metric-label">{{ label }}</span>
            <div v-if="status" class="metric-status" :class="statusClass">
                <span class="status-dot"></span>
                <span class="status-text">{{ status }}</span>
            </div>
            <span v-if="icon" class="material-symbols-outlined metric-icon" :style="{ color: iconColor }">
                {{ icon }}
            </span>
        </div>

        <!-- Value -->
        <div class="metric-value-container">
            <div class="metric-value">{{ formattedValue }}</div>
            <div class="metric-subtitle" :class="subtitleClass">{{ subtitle }}</div>
        </div>

        <!-- Sparkline (optional) -->
        <div v-if="showSparkline" class="metric-sparkline">
            <svg class="sparkline-svg" viewBox="0 0 100 40" preserveAspectRatio="none">
                <path :d="sparklinePath" fill="none" :stroke="sparklineColor" stroke-width="2" />
            </svg>
        </div>
    </div>
</template>

<script setup>
import { computed, defineProps } from "vue";

// Props
const props = defineProps({
    icon: {
        default: "",
        required: false,
        type: String,
    },
    iconColor: {
        default: "var(--color-primary)",
        required: false,
        type: String,
    },
    label: {
        required: true,
        type: String,
    },
    showSparkline: {
        default: false,
        required: false,
        type: Boolean,
    },
    sparklineData: {
        default: () => [],
        required: false,
        type: Array,
    },
    status: {
        default: "",
        required: false,
        type: String,
    },
    statusType: {
        default: "success",
        required: false,
        type: String, // success, warning, error
    },
    subtitle: {
        default: "",
        required: false,
        type: String,
    },
    trend: {
        default: "",
        required: false,
        type: String, // up, down, neutral
    },
    value: {
        required: true,
        type: [String, Number],
    },
});

// Computed
const formattedValue = computed(() => {
    if (typeof props.value === "number") {
        return props.value.toLocaleString();
    }
    return props.value;
});

const statusClass = computed(() => {
    return `status-${props.statusType}`;
});

const subtitleClass = computed(() => {
    if (props.trend === "up") return "trend-up";
    if (props.trend === "down") return "trend-down";
    return "";
});

const sparklineColor = computed(() => {
    return props.iconColor || "var(--color-primary)";
});

const sparklinePath = computed(() => {
    if (!props.sparklineData || props.sparklineData.length === 0) {
        return "M0 20 L100 20";
    }

    const data = props.sparklineData;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const step = 100 / (data.length - 1);

    return data
        .map((val, i) => {
            const x = i * step;
            const y = 40 - ((val - min) / range) * 35;
            return `${i === 0 ? "M" : "L"}${x} ${y}`;
        })
        .join(" ");
});
</script>

<style lang="less" scoped>
@import "../styles/variables.less";

.metric-card {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 128px;
    padding: @spacing-xl;
    background-color: @surface-container-lowest;
    border: 1px solid rgba(195, 198, 215, 0.15);
    border-radius: @border-radius-2xl;
    overflow: hidden;
    transition: box-shadow @transition-normal;

    &:hover {
        box-shadow: @shadow-md;
    }
}

.metric-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.metric-label {
    font-size: @font-size-xs;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: @on-surface-variant;
}

.metric-status {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px;
    border-radius: @border-radius-full;
    font-size: 10px;
    font-weight: 700;

    &.status-success {
        background-color: var(--color-success-container);
        color: var(--color-on-success-container);

        .status-dot {
            background-color: var(--color-success);
        }
    }

    &.status-warning {
        background-color: var(--color-warning-container);
        color: var(--color-on-warning-container);

        .status-dot {
            background-color: var(--color-warning);
        }
    }

    &.status-error {
        background-color: var(--color-error-container);
        color: var(--color-on-error-container);

        .status-dot {
            background-color: var(--color-error);
        }
    }
}

.status-dot {
    width: 6px;
    height: 6px;
    border-radius: @border-radius-circle;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%,
    100% {
        opacity: 1;
    }
    50% {
        opacity: 0.5;
    }
}

.status-text {
    text-transform: uppercase;
}

.metric-icon {
    font-size: 18px;
}

.metric-value-container {
    margin-top: @spacing-sm;
}

.metric-value {
    font-family: @font-family-headline;
    font-size: @font-size-3xl;
    font-weight: 700;
    color: @on-surface;
}

.metric-subtitle {
    margin-top: 2px;
    font-size: 10px;
    color: @on-surface-variant;

    &.trend-up {
        color: var(--color-success);
        font-weight: 500;
    }

    &.trend-down {
        color: var(--color-error);
        font-weight: 500;
    }
}

.metric-sparkline {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 96px;
    height: 48px;
    opacity: 0.2;
    pointer-events: none;
}

.sparkline-svg {
    width: 100%;
    height: 100%;
}

// Dark mode adjustments
[data-theme="dark"] & {
    background-color: var(--color-surface-container-lowest);
}
</style>
