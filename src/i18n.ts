// i18n helper module for the plugin
// Supports loading localized strings based on Joplin locale

import joplin from 'api';

let currentLocale: string = 'en';
let translations: any = {};

// Load translation data
const enTranslations = require('../locales/en.json');
const zhCNTranslations = require('../locales/zh_CN.json');

const localeMap: { [key: string]: any } = {
	'en': enTranslations,
	'zh_CN': zhCNTranslations,
	'zh': zhCNTranslations, // Fallback for generic zh
};

/**
 * Initialize i18n with Joplin's current locale
 */
export async function initI18n() {
	try {
		const locale = await joplin.settings.globalValue('locale');
		currentLocale = locale || 'en';
		
		// Normalize locale code (e.g., zh-CN -> zh_CN)
		currentLocale = normalizeLocale(currentLocale);
		
		// Load the appropriate locale, fallback to English if not available
		translations = localeMap[currentLocale] || localeMap['en'];
	} catch (error) {
		console.error('Error initializing i18n:', error);
		currentLocale = 'en';
		translations = localeMap['en'];
	}
}

/**
 * Normalize locale code format
 * e.g., zh-CN -> zh_CN
 */
function normalizeLocale(locale: string): string {
	return locale.replace('-', '_');
}

/**
 * Get translated string for a given key
 * @param key Dot-separated key path (e.g., 'settings.enableInlineCode.label')
 * @param defaultValue Fallback string if key not found
 * @returns Translated string
 */
export function t(key: string, defaultValue?: string): string {
	try {
		const keys = key.split('.');
		let value = translations;
		
		for (const k of keys) {
			if (value[k] === undefined) {
				return defaultValue || key;
			}
			value = value[k];
		}
		
		if (typeof value === 'string') {
			return value;
		}
		return defaultValue || key;
	} catch (error) {
		console.error(`Error getting translation for key: ${key}`, error);
		return defaultValue || key;
	}
}

/**
 * Get current locale code
 */
export function getCurrentLocale(): string {
	return currentLocale;
}
