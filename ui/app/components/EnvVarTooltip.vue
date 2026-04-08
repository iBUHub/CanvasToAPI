<!--
 * File: ui/app/components/EnvVarTooltip.vue
 * Description: Reusable tooltip component for environment variable documentation
 *
 * Author: iBUHUB
-->

<template>
    <el-tooltip placement="top" popper-class="env-var-tooltip custom-theme-tooltip" effect="light">
        <template #content>
            <div class="env-tooltip-content">
                <a :href="docUrl" target="_blank" class="env-doc-link">{{ linkText }}</a>
                <span class="colon">: </span>
                <code class="env-var-code" :title="copyTitle" @click="copyEnvVar">{{ envVar }}</code>
            </div>
        </template>
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="env-tooltip-icon"
        >
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
    </el-tooltip>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { ElMessage } from "element-plus";
import I18n from "../utils/i18n";

const props = defineProps({
    docSection: {
        required: true,
        type: String,
    },
    envVar: {
        required: true,
        type: String,
    },
});

// Map semantic keys to language-specific doc sections
const docSectionMap = {
    "app-config": {
        en: "-application-configuration",
        zh: "-应用配置",
    },
    "other-config": {
        en: "%EF%B8%8F-other-configuration",
        zh: "%EF%B8%8F-其他配置",
    },
    "proxy-config": {
        en: "-proxy-configuration",
        zh: "-代理配置",
    },
};

const currentLang = ref(I18n.state.lang);
const langVersion = ref(I18n.state.version);

const handleLangChange = lang => {
    currentLang.value = lang;
    langVersion.value = I18n.state.version;
};

onMounted(() => {
    I18n.onChange(handleLangChange);
});

onUnmounted(() => {
    // Note: I18n doesn't provide a way to remove listeners, but this is fine for this use case
});

const t = (key, options) => {
    langVersion.value;
    return I18n.t(key, options);
};

const isZh = computed(() => currentLang.value === "zh");
const baseUrl = computed(() =>
    isZh.value
        ? "https://github.com/iBUHub/CanvasToAPI"
        : "https://github.com/iBUHub/CanvasToAPI/blob/main/README_EN.md"
);

const docUrl = computed(() => {
    const lang = isZh.value ? "zh" : "en";
    const docSection = docSectionMap[props.docSection]?.[lang] || props.docSection;
    return `${baseUrl.value}#${docSection}`;
});

const linkText = computed(() => t("envVar"));
const copyTitle = computed(() => t("copy"));

const copyEnvVar = () => {
    if (window.__copyEnvVar) {
        window.__copyEnvVar(props.envVar);
    } else {
        const tempInput = document.createElement("input");
        tempInput.value = props.envVar;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
        const msg = `${t("copySuccess")}: ${props.envVar}`;
        ElMessage.success(msg);
    }
};
</script>

<style>
.el-popper.custom-theme-tooltip.is-light {
    background-color: var(--el-bg-color-overlay, #ffffff);
    border: 1px solid var(--el-border-color-light, #e4e7ed);
    color: var(--el-text-color-primary, #303133);
    box-shadow: var(--el-box-shadow-light, 0 2px 12px 0 rgba(0, 0, 0, 0.1));
}

.el-popper.custom-theme-tooltip.is-light .el-popper__arrow::before {
    background-color: var(--el-bg-color-overlay, #ffffff);
    border: 1px solid var(--el-border-color-light, #e4e7ed);
}

.el-popper.is-dark.custom-theme-tooltip {
    background-color: #2b2d30;
    border: 1px solid #414243;
    color: #cfd3d8;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.5);
}

.el-popper.is-dark.custom-theme-tooltip .el-popper__arrow::before {
    background-color: #2b2d30;
    border: 1px solid #414243;
}

.el-popper.env-var-tooltip .env-var-code {
    cursor: pointer;
    padding: 3px 6px;
    background-color: var(--el-fill-color-light, rgba(128, 128, 128, 0.1));
    border: 1px solid var(--el-border-color-lighter, rgba(128, 128, 128, 0.2));
    border-radius: 4px;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
    color: var(--el-text-color-primary, inherit);
    transition: all 0.2s ease;
}

.el-popper.env-var-tooltip .env-var-code:hover {
    background-color: var(--el-fill-color-dark, rgba(128, 128, 128, 0.2));
    border-color: var(--el-border-color, rgba(128, 128, 128, 0.3));
    color: var(--el-color-primary, #409eff);
}

.el-popper.is-dark.env-var-tooltip .env-var-code {
    background-color: #3b3d41;
    border-color: #525457;
    color: #e6a23c;
}

.el-popper.is-dark.env-var-tooltip .env-var-code:hover {
    background-color: #494c50;
    border-color: #616467;
    color: #a0cfff;
}

.el-popper.is-dark.env-var-tooltip .colon {
    color: #a3a6ad;
}
</style>

<style scoped>
.env-tooltip-icon {
    margin-left: 4px;
    opacity: 0.6;
    cursor: help;
    transition: opacity 0.2s;
    vertical-align: middle;
    transform: translateY(-2px);
}

.env-tooltip-icon:hover {
    opacity: 1;
}

.env-tooltip-content {
    display: flex;
    align-items: center;
    font-size: 13px;
    line-height: 1.5;
}

.env-doc-link {
    color: #409eff;
    text-decoration: none;
    font-weight: 500;
}

.env-doc-link:hover {
    text-decoration: underline;
}

.colon {
    margin: 0 4px;
    color: inherit;
}
</style>
