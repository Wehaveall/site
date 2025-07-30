/**
 * 🌍 Sistema de Internacionalização Atalho
 * Detecção automática de idioma + traduções dinâmicas
 */

class AtalhoI18n {
    constructor() {
        this.currentLanguage = 'pt-br';
        this.translations = {};
        this.supportedLanguages = ['pt-br', 'en', 'es', 'fr', 'de', 'it'];
        this.fallbackLanguage = 'pt-br';
        this.translationCache = new Map();
        this.isInitialized = false;
        this.initializationPromise = null;

        this.clearCache();
    }

    clearCache() {
        this.translationCache.clear();
        console.log('🗑️ Cache de traduções limpo');
    }

    async init() {
        if (this.isInitialized) return;
        if (this.initializationPromise) return this.initializationPromise;

        this.initializationPromise = (async () => {
            try {
                this.currentLanguage = this.detectLanguage();
                await this.loadTranslations(true); 
                
                // DOM-dependent actions should wait for DOMContentLoaded
                if (document.readyState === 'loading') {
                    await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
                }
                
                this.applyAll();

                this.isInitialized = true;
                console.log(`🌍 Atalho I18n inicializado em: ${this.currentLanguage}`);
            } catch (error) {
                console.error('❌ Erro ao inicializar i18n:', error);
                this.currentLanguage = this.fallbackLanguage;
                await this.loadTranslations();
                if (document.readyState !== 'loading') {
                    this.applyAll();
                }
            } finally {
                this.initializationPromise = null;
            }
        })();
        
        return this.initializationPromise;
    }

    applyAll() {
        this.applyTranslations();
        this.updateMetaTags();
        if (!document.getElementById('language-select')) {
            this.setupLanguageSelector();
        } else {
            console.log('🌍 Seletor de idioma manual detectado, não criando automático');
        }
    }
    
    detectLanguage() {
        const urlParams = new URLSearchParams(window.location.search);
        const urlLang = urlParams.get('lang');
        if (urlLang && this.supportedLanguages.includes(urlLang)) {
            localStorage.setItem('atalho_language', urlLang);
            console.log(`🔗 Idioma detectado via URL: ${urlLang}`);
            return urlLang;
        }

        const savedLang = localStorage.getItem('atalho_language');
        if (savedLang && this.supportedLanguages.includes(savedLang)) {
            console.log(`💾 Idioma detectado via localStorage (escolha do usuário): ${savedLang}`);
            return savedLang;
        }

        const browserLang = this.detectBrowserLanguage();
        if (browserLang) {
            console.log(`🌐 Idioma detectado via navegador: ${browserLang}`);
            localStorage.setItem('atalho_language', browserLang);
            return browserLang;
        }

        const geoLang = this.detectByTimezone();
        if (geoLang) {
            console.log(`🌍 Idioma detectado via timezone: ${geoLang}`);
            localStorage.setItem('atalho_language', geoLang);
            return geoLang;
        }
        
        console.log(`🔄 Usando idioma padrão: ${this.fallbackLanguage}`);
        return this.fallbackLanguage;
    }

    detectBrowserLanguage() {
        const languages = navigator.languages || [navigator.language || navigator.userLanguage];
        for (const lang of languages) {
            const normalized = this.normalizeLanguageCode(lang);
            if (this.supportedLanguages.includes(normalized)) {
                return normalized;
            }
        }
        return null;
    }

    normalizeLanguageCode(langCode) {
        const langMap = {
            'pt': 'pt-br', 'pt-BR': 'pt-br', 'pt-PT': 'pt-br',
            'en': 'en', 'en-US': 'en', 'en-GB': 'en',
            'es': 'es', 'es-ES': 'es', 'es-MX': 'es', 'es-AR': 'es',
            'fr': 'fr', 'fr-FR': 'fr', 'fr-CA': 'fr',
            'de': 'de', 'de-DE': 'de', 'de-AT': 'de',
            'it': 'it', 'it-IT': 'it'
        };
        if (langMap[langCode]) return langMap[langCode];
        const mainLang = langCode.split('-')[0];
        return langMap[mainLang] || null;
    }

    detectByTimezone() {
        try {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const timezoneMap = {
                'America/Sao_Paulo': 'pt-br', 'America/Fortaleza': 'pt-br', 'America/Recife': 'pt-br',
                'America/Argentina/Buenos_Aires': 'es', 'America/Mexico_City': 'es', 'Europe/Madrid': 'es',
                'Europe/Paris': 'fr', 'Europe/Berlin': 'de', 'Europe/Rome': 'it',
                'Europe/London': 'en', 'America/New_York': 'en', 'America/Los_Angeles': 'en', 'America/Chicago': 'en'
            };
            return timezoneMap[timezone] || null;
        } catch (error) {
            console.warn('⚠️ Erro ao detectar timezone:', error);
            return null;
        }
    }

    async loadTranslations(forceReload = false) {
        const cacheKey = `translations_${this.currentLanguage}`;
        if (!forceReload && this.translationCache.has(cacheKey)) {
            this.translations = this.translationCache.get(cacheKey);
            console.log(`📦 Traduções carregadas do cache para: ${this.currentLanguage}`);
            return;
        }

        try {
            const timestamp = forceReload ? `?t=${Date.now()}` : '';
            const response = await fetch(`/assets/translations/${this.currentLanguage}.json${timestamp}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            this.translations = await response.json();
            this.translationCache.set(cacheKey, this.translations);
            
            console.log(`🔄 Traduções recarregadas para: ${this.currentLanguage}`);
            window.dispatchEvent(new CustomEvent('translationsLoaded', {
                detail: { language: this.currentLanguage, translations: this.translations }
            }));
        } catch (error) {
            console.error(`❌ Erro ao carregar traduções para ${this.currentLanguage}:`, error);
            if (this.currentLanguage !== this.fallbackLanguage) {
                console.log(`🔄 Tentando fallback para ${this.fallbackLanguage}`);
                this.currentLanguage = this.fallbackLanguage;
                await this.loadTranslations(forceReload);
            }
        }
    }

    t(key, variables = {}) {
        if (!this.translations || Object.keys(this.translations).length === 0) {
            console.warn(`⏳ Traduções ainda não prontas para: ${key}. Retornando chave.`);
            return key;
        }
        
        const value = key.split('.').reduce((acc, k) => (acc && acc[k] !== undefined) ? acc[k] : null, this.translations);

        if (value === null) {
            console.warn(`⚠️ Chave de tradução não encontrada: ${key}`);
            return key;
        }

        if (typeof value === 'string') {
            return this.interpolate(value, variables);
        }
        
        console.warn(`⚠️ Valor de tradução inválido para: ${key}`);
        return key;
    }

    interpolate(text, variables) {
        return text.replace(/\{\{(\w+)\}\}/g, (match, key) => 
            variables.hasOwnProperty(key) ? variables[key] : match
        );
    }

    applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translated = this.t(key);
            if (element.tagName === 'INPUT' && element.type === 'submit') {
                element.value = translated;
            } else if (element.hasAttribute('placeholder')) {
                element.placeholder = translated;
            } else {
                // Verificar se contém HTML (como <br/>)
                if (translated.includes('<br/>') || translated.includes('<br>')) {
                    element.innerHTML = translated;
                } else {
                    element.textContent = translated;
                }
            }
        });

        document.querySelectorAll('[data-i18n-html]').forEach(element => {
            const key = element.getAttribute('data-i18n-html');
            element.innerHTML = this.t(key);
        });

        document.documentElement.lang = this.currentLanguage;
    }

    updateMetaTags() {
        const title = this.t('meta.title');
        if (title && title !== 'meta.title') document.title = title;

        const description = this.t('meta.description');
        if (description && description !== 'meta.description') {
            let metaDesc = document.querySelector('meta[name="description"]');
            if (!metaDesc) {
                metaDesc = document.createElement('meta');
                metaDesc.name = 'description';
                document.head.appendChild(metaDesc);
            }
            metaDesc.content = description;
        }
        this.updateHreflangTags();
    }

    updateHreflangTags() {
        document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(link => link.remove());
        const currentUrl = window.location.origin + window.location.pathname;
        this.supportedLanguages.forEach(lang => {
            const link = document.createElement('link');
            link.rel = 'alternate';
            link.hreflang = lang;
            link.href = `${currentUrl}?lang=${lang}`;
            document.head.appendChild(link);
        });
        const defaultLink = document.createElement('link');
        defaultLink.rel = 'alternate';
        defaultLink.hreflang = 'x-default';
        defaultLink.href = `${currentUrl}?lang=${this.fallbackLanguage}`;
        document.head.appendChild(defaultLink);
    }

    async changeLanguage(newLang) {
        if (!this.supportedLanguages.includes(newLang) || newLang === this.currentLanguage) return;
        
        console.log(`🔄 Mudando idioma de ${this.currentLanguage} para ${newLang}`);
        this.currentLanguage = newLang;
        localStorage.setItem('atalho_language', newLang);

        await this.loadTranslations(true);
        this.applyAll();

        const url = new URL(window.location);
        url.searchParams.set('lang', newLang);
        window.history.replaceState({}, '', url);

        if (document.querySelector('#language-selector')) this.updateLanguageSelector();
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: newLang } }));
        console.log(`✅ Idioma alterado para: ${newLang}`);
    }

    setupLanguageSelector() {
        this.languageData = {
            'pt-br': { name: 'Português', flag: 'https://flagcdn.com/w40/br.png', country: 'Brasil' },
            'en': { name: 'English', flag: 'https://flagcdn.com/w40/us.png', country: 'United States' },
            'es': { name: 'Español', flag: 'https://flagcdn.com/w40/es.png', country: 'España' },
            'fr': { name: 'Français', flag: 'https://flagcdn.com/w40/fr.png', country: 'France' },
            'de': { name: 'Deutsch', flag: 'https://flagcdn.com/w40/de.png', country: 'Deutschland' },
            'it': { name: 'Italiano', flag: 'https://flagcdn.com/w40/it.png', country: 'Italia' }
        };
        this.createLanguageSelector();
        console.log('🌍 Seletor de idioma com bandeiras criado');
    }

    createLanguageSelector() {
        if (document.getElementById('language-selector') || document.querySelector('.language-selector')) return;
        const targetElement = document.querySelector('nav ul') || document.querySelector('header') || document.body;
        
        const selectorContainer = document.createElement('div');
        selectorContainer.className = 'language-selector';
        selectorContainer.id = 'language-selector';

        const dropdown = document.createElement('div');
        dropdown.className = 'language-dropdown';
        
        dropdown.innerHTML = `
            <div class="current-language">
                <img class="flag-icon" src="${this.languageData[this.currentLanguage].flag}" alt="${this.languageData[this.currentLanguage].country}">
                <span class="language-code">${this.currentLanguage.toUpperCase()}</span>
            </div>
            <span class="dropdown-arrow">▼</span>
        `;
        
        const options = document.createElement('div');
        options.className = 'language-options';

        this.supportedLanguages.forEach(lang => {
            const option = document.createElement('div');
            option.className = `language-option ${lang === this.currentLanguage ? 'selected' : ''}`;
            option.dataset.lang = lang;
            option.innerHTML = `
                <img class="flag-icon" src="${this.languageData[lang].flag}" alt="${this.languageData[lang].country}">
                <span class="language-code">${lang.toUpperCase()}</span>
            `;
            option.addEventListener('click', e => {
                e.stopPropagation();
                this.changeLanguage(option.dataset.lang);
                options.classList.remove('show');
            });
            options.appendChild(option);
        });

        dropdown.addEventListener('click', e => {
            e.stopPropagation();
            options.classList.toggle('show');
        });
        
        document.addEventListener('click', () => options.classList.remove('show'));
        
        selectorContainer.appendChild(dropdown);
        selectorContainer.appendChild(options);
        
        if (targetElement.tagName === 'UL') {
            const li = document.createElement('li');
            li.appendChild(selectorContainer);
            targetElement.appendChild(li);
        } else {
            targetElement.appendChild(selectorContainer);
        }
        console.log('🌍 Dropdown de idiomas inserido no DOM');
    }

    updateLanguageSelector() {
        const currentFlag = document.querySelector('.language-dropdown .flag-icon');
        const currentCode = document.querySelector('.language-dropdown .language-code');
        if (currentFlag && currentCode) {
            currentFlag.src = this.languageData[this.currentLanguage].flag;
            currentCode.textContent = this.currentLanguage.toUpperCase();
        }
        document.querySelectorAll('.language-option').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.lang === this.currentLanguage);
        });
    }
}

// 🚀 INICIALIZAÇÃO GLOBAL
window.atalhoI18n = new AtalhoI18n();
window.atalhoI18n.init();
window.i18nSystem = window.atalhoI18n;
window.t = (key, variables) => window.atalhoI18n.t(key, variables);
window.changeLanguage = (lang) => window.atalhoI18n.changeLanguage(lang);
window.getCurrentLanguage = () => window.atalhoI18n.getCurrentLanguage();
window.getSupportedLanguages = () => window.atalhoI18n.getSupportedLanguages();
