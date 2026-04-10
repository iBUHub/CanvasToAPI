<!--
 * File: ui/app/components/RequestTable.vue
 * Description: Recent API requests data table component
 *
 * Author: iBUHUB
-->

<template>
    <div class="request-table">
        <!-- Header -->
        <div class="table-header">
            <h3 class="table-title">{{ title }}</h3>
            <div class="table-actions">
                <button class="action-btn" title="Filter" @click="handleFilter">
                    <span class="material-symbols-outlined">filter_list</span>
                </button>
                <button class="action-btn" title="Refresh" @click="handleRefresh">
                    <span class="material-symbols-outlined">refresh</span>
                </button>
            </div>
        </div>

        <!-- Table -->
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th v-for="col in columns" :key="col.key" class="table-th">
                            {{ col.label }}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(row, index) in requests" :key="index" class="table-row">
                        <td class="table-td">
                            <span class="method-badge" :class="getMethodClass(row.method)">
                                {{ row.method }}
                            </span>
                        </td>
                        <td class="table-td">
                            <span class="path-text">{{ row.path }}</span>
                        </td>
                        <td class="table-td">
                            <span class="status-badge" :class="getStatusClass(row.status)">
                                {{ row.status }}
                            </span>
                        </td>
                        <td class="table-td text-right">
                            <span class="timestamp-text">{{ row.timestamp }}</span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup>
import { defineProps, defineEmits } from "vue";

// Props
defineProps({
    requests: {
        default: () => [
            {
                method: "POST",
                path: "/api/v1/transform/canvas-data",
                status: "200 OK",
                timestamp: "2023-10-24 14:32:01.442",
            },
            {
                method: "GET",
                path: "/api/v1/health/detailed",
                status: "200 OK",
                timestamp: "2023-10-24 14:31:58.210",
            },
            {
                method: "POST",
                path: "/api/v1/auth/provision",
                status: "500 ERR",
                timestamp: "2023-10-24 14:31:55.992",
            },
            {
                method: "GET",
                path: "/api/v1/legacy/export",
                status: "404 NOT",
                timestamp: "2023-10-24 14:31:50.125",
            },
            {
                method: "POST",
                path: "/api/v1/transform/canvas-data",
                status: "200 OK",
                timestamp: "2023-10-24 14:31:48.001",
            },
        ],
        required: false,
        type: Array,
    },
    title: {
        default: "Recent API Requests",
        required: false,
        type: String,
    },
});

// Emits
const emit = defineEmits(["filter", "refresh"]);

// Columns definition
const columns = [
    { key: "method", label: "Method" },
    { key: "path", label: "Path" },
    { key: "status", label: "Status" },
    { key: "timestamp", label: "Timestamp" },
];

// Methods
const handleFilter = () => {
    emit("filter");
};

const handleRefresh = () => {
    emit("refresh");
};

const getMethodClass = method => {
    const methodMap = {
        DELETE: "method-delete",
        GET: "method-get",
        PATCH: "method-patch",
        POST: "method-post",
        PUT: "method-put",
    };
    return methodMap[method] || "method-get";
};

const getStatusClass = status => {
    if (status.startsWith("2")) return "status-success";
    if (status.startsWith("4")) return "status-warning";
    if (status.startsWith("5")) return "status-error";
    return "";
};
</script>

<style lang="less" scoped>
@import "../styles/variables.less";

.request-table {
    background-color: @surface-container-low;
    border: 1px solid rgba(195, 198, 215, 0.15);
    border-radius: @border-radius-2xl;
    overflow: hidden;
}

.table-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: @spacing-xl;
    border-bottom: 1px solid rgba(195, 198, 215, 0.1);
}

.table-title {
    margin: 0;
    font-family: @font-family-headline;
    font-size: @font-size-lg;
    font-weight: 700;
    color: @on-surface;
}

.table-actions {
    display: flex;
    gap: @spacing-sm;
}

.action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: @border-radius-lg;
    background: transparent;
    color: @on-surface-variant;
    cursor: pointer;
    transition: background-color @transition-fast;

    &:hover {
        background-color: @surface-container-high;
    }

    .material-symbols-outlined {
        font-size: 18px;
    }
}

.table-container {
    overflow-x: auto;
}

.data-table {
    width: 100%;
    border-collapse: collapse;
}

.table-th {
    padding: @spacing-lg @spacing-xl;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: @on-surface-variant;
    text-align: left;
    background-color: rgba(231, 231, 243, 0.3);

    &:last-child {
        text-align: right;
    }
}

.table-row {
    transition: background-color @transition-fast;

    &:hover {
        background-color: rgba(25, 27, 35, 0.04);
    }
}

.table-td {
    padding: @spacing-lg @spacing-xl;
    border-top: 1px solid rgba(195, 198, 215, 0.05);

    &.text-right {
        text-align: right;
    }
}

.method-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: @border-radius-lg;
    font-family: @font-family-mono;
    font-size: @font-size-xs;
    font-weight: 700;

    &.method-get {
        background-color: rgba(67, 70, 85, 0.1);
        color: @text-secondary;
    }

    &.method-post {
        background-color: rgba(0, 74, 198, 0.1);
        color: var(--color-primary);
    }

    &.method-put {
        background-color: rgba(217, 119, 6, 0.1);
        color: var(--color-warning);
    }

    &.method-delete {
        background-color: rgba(186, 26, 26, 0.1);
        color: var(--color-error);
    }

    &.method-patch {
        background-color: rgba(148, 55, 0, 0.1);
        color: var(--color-tertiary);
    }
}

.path-text {
    font-family: @font-family-mono;
    font-size: @font-size-sm;
    color: @on-surface-variant;
}

.status-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: @border-radius-full;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;

    &.status-success {
        background-color: var(--color-success-container);
        color: var(--color-on-success-container);
    }

    &.status-warning {
        background-color: var(--color-warning-container);
        color: var(--color-on-warning-container);
    }

    &.status-error {
        background-color: var(--color-error-container);
        color: var(--color-on-error-container);
    }
}

.timestamp-text {
    font-size: @font-size-xs;
    font-weight: 500;
    color: @on-surface-variant;
}

// Dark mode adjustments
[data-theme="dark"] & {
    background-color: var(--color-surface-container-low);
}
</style>
