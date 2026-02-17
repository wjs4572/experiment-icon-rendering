/**
 * Internationalization (i18n) System for Icon Rendering Performance Test Suite
 * Supports multiple languages and automatic localization
 */

class I18n {
    constructor() {
        this.currentLanguage = 'en';
        this.translations = {};
        this.fallbackLanguage = 'en';
        
        this.init();
    }

    async init() {
        console.log('🌍 Initializing i18n system...');
        
        // Detect user's preferred language
        this.currentLanguage = this.detectLanguage();
        console.log('🌍 Detected language:', this.currentLanguage);
        
        // Load translation files
        await this.loadTranslations();
        console.log('🌍 Translations loaded:', Object.keys(this.translations).length, 'keys');
        
        // Apply translations to the page
        this.translatePage();
        console.log('🌍 Page translated');
        
        // Set up language selector if available
        this.setupLanguageSelector();
        console.log('🌍 Language selector setup complete');
        
        // Store language preference
        localStorage.setItem('preferredLanguage', this.currentLanguage);
    }

    detectLanguage() {
        // Check localStorage first
        const stored = localStorage.getItem('preferredLanguage');
        if (stored && this.isLanguageSupported(stored)) {
            return stored;
        }
        
        // Check browser language with regional support
        const browserLang = navigator.language || navigator.userLanguage;
        const fullLangCode = browserLang.toLowerCase();
        const baseLangCode = fullLangCode.split('-')[0];
        
        // Check for specific regional variants first
        if (this.isLanguageSupported(fullLangCode)) {
            return fullLangCode;
        }
        
        // Fall back to base language code
        return this.isLanguageSupported(baseLangCode) ? baseLangCode : 'en';
    }

    isLanguageSupported(langCode) {
        const supportedLanguages = [
            'en', 'en-us', 'en-gb', 
            'es', 'fr', 'de', 'ja', 
            'zh', 'zh-tw',
            'pt', 'pt-br', 'pt-pt'
        ];
        return supportedLanguages.includes(langCode);
    }

    async loadTranslations() {
        try {
            console.log('🌍 Loading translations for:', this.currentLanguage);
            const response = await fetch(`locales/${this.currentLanguage}.json`);
            if (response.ok) {
                this.translations = await response.json();
                console.log('🌍 Successfully loaded translations:', this.currentLanguage);
            } else {
                console.warn('🌍 Translation file not found:', this.currentLanguage, 'Status:', response.status);
                // Fallback to English if language file not found
                if (this.currentLanguage !== this.fallbackLanguage) {
                    console.log('🌍 Falling back to:', this.fallbackLanguage);
                    const fallbackResponse = await fetch(`locales/${this.fallbackLanguage}.json`);
                    this.translations = await fallbackResponse.json();
                }
            }
        } catch (error) {
            console.warn(`🌍 Failed to load translations for ${this.currentLanguage}:`, error);
            // Use inline fallback translations
            this.translations = this.getFallbackTranslations();
        }
    }

    getFallbackTranslations() {
        return {
            // Basic fallback translations
            "app.title": "Icon Rendering Performance Test Suite",
            "app.subtitle": "Comprehensive testing platform for comparing rendering performance across different icon formats",
            "nav.back_to_suite": "← Back to Test Suite",
            "export.csv": "Export CSV",
            "export.json": "Export JSON",
            "data.clear": "Clear All Data"
        };
    }

    translate(key, params = {}) {
        let translation = this.translations[key];
        
        if (!translation) {
            console.warn(`Translation missing for key: ${key}`);
            return key;
        }

        // Replace parameters in translation
        Object.keys(params).forEach(param => {
            const placeholder = `{{${param}}}`;
            translation = translation.replace(new RegExp(placeholder, 'g'), params[param]);
        });

        return translation;
    }

    translatePage() {
        // Translate elements with data-i18n attribute
        const elements = document.querySelectorAll('[data-i18n]');
        console.log('🌍 Found', elements.length, 'elements with data-i18n attributes');
        
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.translate(key);
            
            console.log('🌍 Translating:', key, '→', translation);
            
            // Handle different content types
            if (element.hasAttribute('data-i18n-html')) {
                element.innerHTML = translation;
            } else if (element.tagName === 'INPUT' && element.type === 'submit') {
                element.value = translation;
            } else if (element.hasAttribute('placeholder')) {
                element.placeholder = translation;
            } else if (element.hasAttribute('title')) {
                element.title = translation;
            } else {
                element.textContent = translation;
            }
        });

        // Update document title if specified
        const titleKey = document.documentElement.getAttribute('data-i18n-title');
        if (titleKey) {
            document.title = this.translate(titleKey);
            console.log('🌍 Updated document title to:', document.title);
        }

        // Update HTML lang attribute
        document.documentElement.lang = this.currentLanguage;
        console.log('🌍 Updated HTML lang attribute to:', this.currentLanguage);
    }

    async setLanguage(langCode) {
        if (!this.isLanguageSupported(langCode) || langCode === this.currentLanguage) {
            return;
        }

        this.currentLanguage = langCode;
        localStorage.setItem('preferredLanguage', langCode);
        
        await this.loadTranslations();
        this.translatePage();
        
        // Update language selector
        this.updateLanguageSelector();
        
        // Emit language change event
        const event = new CustomEvent('languageChanged', {
            detail: { language: langCode }
        });
        document.dispatchEvent(event);
    }

    setupLanguageSelector() {
        const selector = document.getElementById('languageSelector');
        if (!selector) return;

        selector.value = this.currentLanguage;
        
        selector.addEventListener('change', (e) => {
            this.setLanguage(e.target.value);
        });
    }

    updateLanguageSelector() {
        const selector = document.getElementById('languageSelector');
        if (selector) {
            selector.value = this.currentLanguage;
        }
    }

    getCurrentLanguage() {
        return this.currentLanguage;
    }

    getSupportedLanguages() {
        return [
            { code: 'en', name: 'English', native: 'English' },
            { code: 'en-us', name: 'English (United States)', native: 'English (United States)' },
            { code: 'en-gb', name: 'English (United Kingdom)', native: 'English (United Kingdom)' },
            { code: 'es', name: 'Spanish', native: 'Español' },
            { code: 'fr', name: 'French', native: 'Français' },
            { code: 'de', name: 'German', native: 'Deutsch' },
            { code: 'ja', name: 'Japanese', native: '日本語' },
            { code: 'zh', name: 'Chinese', native: '中文' },
            { code: 'zh-tw', name: 'Chinese (Traditional)', native: '中文 (繁體)' },
            { code: 'pt', name: 'Portuguese', native: 'Português' },
            { code: 'pt-br', name: 'Portuguese (Brazil)', native: 'Português (Brasil)' },
            { code: 'pt-pt', name: 'Portuguese (Portugal)', native: 'Português (Portugal)' }
        ];
    }

    // Format numbers according to locale
    formatNumber(number, options = {}) {
        return new Intl.NumberFormat(this.currentLanguage, options).format(number);
    }

    // Format dates according to locale
    formatDate(date, options = {}) {
        return new Intl.DateTimeFormat(this.currentLanguage, options).format(date);
    }

    // Format relative time (e.g., "2 hours ago")
    formatRelativeTime(date) {
        const rtf = new Intl.RelativeTimeFormat(this.currentLanguage, { numeric: 'auto' });
        const diff = date - new Date();
        const diffInSeconds = Math.floor(diff / 1000);
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);

        if (Math.abs(diffInDays) > 0) {
            return rtf.format(diffInDays, 'day');
        } else if (Math.abs(diffInHours) > 0) {
            return rtf.format(diffInHours, 'hour');
        } else if (Math.abs(diffInMinutes) > 0) {
            return rtf.format(diffInMinutes, 'minute');
        } else {
            return rtf.format(diffInSeconds, 'second');
        }
    }
}

// Global i18n instance
window.i18n = new I18n();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize i18n system when DOM is ready
        window.i18n.init();
    });
} else {
    // DOM already loaded
    setTimeout(() => window.i18n.init(), 0);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = I18n;
}