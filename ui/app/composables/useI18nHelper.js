/**
 * File: ui/app/composables/useI18nHelper.js
 * Description: Composable for internationalization helper functions
 *
 * Author: iBUHUB
 */

import { ref } from 'vue';
import I18n from '../utils/i18n';

export function useI18nHelper() {
    const langVersion = ref(I18n.state.version);

    // i18n helper with reactivity trigger
    const t = (key, options) => {
        langVersion.value; // trigger reactivity
        return I18n.t(key, options);
    };

    // Get current language
    const getCurrentLang = () => I18n.getLang();

    // Toggle language
    const toggleLanguage = () => {
        I18n.toggleLang();
        langVersion.value++;
    };

    // Handle language change from select
    const handleLanguageChange = lang => {
        I18n.setLang(lang);
        langVersion.value++;
    };

    return {
        getCurrentLang,
        handleLanguageChange,
        langVersion,
        t,
        toggleLanguage,
    };
}
