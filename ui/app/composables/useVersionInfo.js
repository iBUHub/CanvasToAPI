/**
 * File: ui/app/composables/useVersionInfo.js
 * Description: Composable for managing version information and update checking
 *
 * Author: iBUHUB
 */

import { computed, reactive } from 'vue';

export function useVersionInfo() {
    const state = reactive({
        currentVersion: '',
        hasUpdate: false,
        latestVersion: '',
        releaseUrl: '',
    });

    // Computed
    const appVersion = computed(() => {
        // eslint-disable-next-line no-undef
        const version = state.currentVersion || (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev');
        if (/^\d/.test(version)) {
            return `v${version}`;
        }
        if (version.startsWith('preview')) {
            return version.charAt(0).toUpperCase() + version.slice(1);
        }
        return version;
    });

    const latestVersionFormatted = computed(() => {
        /* eslint-disable no-undef */
        const version =
            state.latestVersion ||
            state.currentVersion ||
            (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev');
        /* eslint-enable no-undef */
        if (/^\d/.test(version)) {
            return `v${version}`;
        }
        if (version.startsWith('preview')) {
            return version.charAt(0).toUpperCase() + version.slice(1);
        }
        return version;
    });

    // Fetch version info
    const fetchVersionInfo = async () => {
        try {
            const response = await fetch('/api/version/check');
            if (!response.ok) {
                return;
            }

            const data = await response.json();
            state.currentVersion = data.current || '';
            state.hasUpdate = Boolean(data.hasUpdate);
            state.latestVersion = data.latest || '';
            state.releaseUrl = data.releaseUrl || '';
        } catch {
            state.hasUpdate = false;
        }
    };

    return {
        appVersion,
        fetchVersionInfo,
        latestVersionFormatted,
        state,
    };
}
