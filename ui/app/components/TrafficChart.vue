<!--
 * File: ui/app/components/TrafficChart.vue
 * Description: Real-time traffic bar chart component
 *
 * Author: iBUHUB
-->

<template>
    <div class="traffic-chart">
        <!-- Header -->
        <div class="chart-header">
            <div class="chart-title-group">
                <h3 class="chart-title">{{ title }}</h3>
                <p class="chart-subtitle">{{ subtitle }}</p>
            </div>
            <div class="chart-toggle">
                <span class="toggle-label">60m</span>
                <div class="toggle-switch">
                    <span class="toggle-thumb"></span>
                </div>
            </div>
        </div>

        <!-- Chart Area -->
        <div class="chart-area">
            <div class="bar-container">
                <div
                    v-for="(bar, index) in chartData"
                    :key="index"
                    class="bar"
                    :style="{
                        height: bar.height + '%',
                        backgroundColor: bar.color,
                    }"
                ></div>
            </div>
            <!-- Overlay line (optional) -->
            <svg class="chart-overlay" viewBox="0 0 100 40" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.2" />
                        <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0" />
                    </linearGradient>
                </defs>
                <path :d="linePath" fill="url(#chartGradient)" stroke="var(--color-primary)" stroke-width="0.5" />
            </svg>
        </div>
    </div>
</template>

<script setup>
import { computed, defineProps } from "vue";

// Props
const props = defineProps({
    data: {
        default: () => [],
        required: false,
        type: Array,
    },
    subtitle: {
        default: "Global request volume (per minute)",
        required: false,
        type: String,
    },
    title: {
        default: "Real-time Traffic",
        required: false,
        type: String,
    },
});

// Generate sample data if none provided
const chartData = computed(() => {
    if (props.data && props.data.length > 0) {
        return props.data.map(value => ({
            color: `rgba(0, 74, 198, ${0.1 + (value / 100) * 0.7})`,
            height: value,
        }));
    }

    // Default sample data - simulating traffic pattern
    const sampleHeights = [20, 35, 45, 60, 55, 75, 70, 90, 85, 95, 80, 100, 90, 70, 60, 40, 30, 25, 20, 15];
    return sampleHeights.map(height => ({
        color: `rgba(0, 74, 198, ${0.1 + (height / 100) * 0.7})`,
        height,
    }));
});

// Generate smooth line path
const linePath = computed(() => {
    const points = chartData.value;
    const step = 100 / (points.length - 1);

    // Create smooth curve through points
    let path = `M0 ${40 - points[0].height * 0.35}`;

    for (let i = 1; i < points.length; i++) {
        const x = i * step;
        const y = 40 - points[i].height * 0.35;
        path += ` L${x} ${y}`;
    }

    // Close the path for fill
    path += ` L100 40 L0 40 Z`;

    return path;
});
</script>

<style lang="less" scoped>
@import "../styles/variables.less";

.traffic-chart {
    padding: @spacing-xl;
    background-color: @surface-container-low;
    border: 1px solid rgba(195, 198, 215, 0.15);
    border-radius: @border-radius-2xl;
}

.chart-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: @spacing-2xl;
}

.chart-title-group {
    //
}

.chart-title {
    margin: 0;
    font-family: @font-family-headline;
    font-size: @font-size-lg;
    font-weight: 700;
    color: @on-surface;
}

.chart-subtitle {
    margin: @spacing-xs 0 0;
    font-size: @font-size-xs;
    color: @on-surface-variant;
}

.chart-toggle {
    display: flex;
    align-items: center;
    gap: @spacing-sm;
}

.toggle-label {
    font-size: @font-size-xs;
    font-weight: 700;
    color: @on-surface-variant;
}

.toggle-switch {
    position: relative;
    width: 32px;
    height: 16px;
    background-color: rgba(0, 74, 198, 0.2);
    border-radius: @border-radius-full;

    .toggle-thumb {
        position: absolute;
        top: 2px;
        right: 2px;
        width: 10px;
        height: 10px;
        background-color: var(--color-primary);
        border-radius: @border-radius-circle;
        transition: transform @transition-fast;
    }
}

.chart-area {
    position: relative;
    height: 256px;
}

.bar-container {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    height: 100%;
    padding: 0 @spacing-sm;
    gap: 2px;
}

.bar {
    flex: 1;
    max-width: 3%;
    border-radius: 2px 2px 0 0;
    transition: height @transition-normal;
}

.chart-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
}

// Dark mode adjustments
[data-theme="dark"] & {
    background-color: var(--color-surface-container-low);
}
</style>
