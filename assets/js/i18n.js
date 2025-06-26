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
        
        // Cache para performance
        this.translationCache = new Map();
        
        this.init();
    }

    async init() {
        try {
            // 1. Detectar idioma automaticamente
            this.currentLanguage = this.detectLanguage();
            
            // 2. Carregar traduções
            await this.loadTranslations();
            
            // 3. Aplicar traduções na página
            this.applyTranslations();
            
            // 4. Atualizar meta tags
            this.updateMetaTags();
            
            // 5. Configurar seletor de idioma
            this.setupLanguageSelector();
            
            console.log(`🌍 Atalho I18n inicializado em: ${this.currentLanguage}`);
            
        } catch (error) {
            console.error('❌ Erro ao inicializar i18n:', error);
            // Fallback para português
            this.currentLanguage = this.fallbackLanguage;
            await this.loadTranslations();
            this.applyTranslations();
        }
    }

    /**
     * 🎯 DETECÇÃO AUTOMÁTICA DE IDIOMA
     * Prioridade: URL → localStorage → navegador → geolocalização → padrão
     */
    detectLanguage() {
        // 1. Verificar URL (ex: ?lang=es)
        const urlParams = new URLSearchParams(window.location.search);
        const urlLang = urlParams.get('lang');
        if (urlLang && this.supportedLanguages.includes(urlLang)) {
            localStorage.setItem('atalho_language', urlLang);
            return urlLang;
        }

        // 2. Verificar localStorage (preferência salva)
        const savedLang = localStorage.getItem('atalho_language');
        if (savedLang && this.supportedLanguages.includes(savedLang)) {
            return savedLang;
        }

        // 3. Detectar idioma do navegador
        const browserLang = this.detectBrowserLanguage();
        if (browserLang) {
            localStorage.setItem('atalho_language', browserLang);
            return browserLang;
        }

        // 4. Detectar por timezone/país (aproximação)
        const geoLang = this.detectByTimezone();
        if (geoLang) {
            localStorage.setItem('atalho_language', geoLang);
            return geoLang;
        }

        // 5. Padrão
        return this.fallbackLanguage;
    }

    detectBrowserLanguage() {
        const languages = navigator.languages || [navigator.language || navigator.userLanguage];
        
        for (const lang of languages) {
            // Mapear códigos de idioma para nossos suportados
            const normalized = this.normalizeLanguageCode(lang);
            if (this.supportedLanguages.includes(normalized)) {
                return normalized;
            }
        }
        
        return null;
    }

    normalizeLanguageCode(langCode) {
        const langMap = {
            'pt': 'pt-br',
            'pt-BR': 'pt-br',
            'pt-PT': 'pt-br', // Português de Portugal → Brasil
            'en': 'en',
            'en-US': 'en',
            'en-GB': 'en',
            'es': 'es',
            'es-ES': 'es',
            'es-MX': 'es',
            'es-AR': 'es',
            'fr': 'fr',
            'fr-FR': 'fr',
            'fr-CA': 'fr',
            'de': 'de',
            'de-DE': 'de',
            'de-AT': 'de',
            'it': 'it',
            'it-IT': 'it'
        };

        // Primeiro tenta o código completo
        if (langMap[langCode]) {
            return langMap[langCode];
        }

        // Depois tenta apenas a primeira parte (ex: 'pt-BR' → 'pt')
        const mainLang = langCode.split('-')[0];
        return langMap[mainLang] || null;
    }

    detectByTimezone() {
        try {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            
            const timezoneMap = {
                'America/Sao_Paulo': 'pt-br',
                'America/Fortaleza': 'pt-br',
                'America/Recife': 'pt-br',
                'America/Argentina/Buenos_Aires': 'es',
                'America/Mexico_City': 'es',
                'Europe/Madrid': 'es',
                'Europe/Paris': 'fr',
                'Europe/Berlin': 'de',
                'Europe/Rome': 'it',
                'Europe/London': 'en',
                'America/New_York': 'en',
                'America/Los_Angeles': 'en',
                'America/Chicago': 'en'
            };
            
            return timezoneMap[timezone] || null;
        } catch (error) {
            console.warn('⚠️ Erro ao detectar timezone:', error);
            return null;
        }
    }

    /**
     * 📁 CARREGAMENTO DE TRADUÇÕES
     */
    async loadTranslations() {
        const cacheKey = `translations_${this.currentLanguage}`;
        
        // Verificar cache primeiro
        if (this.translationCache.has(cacheKey)) {
            this.translations = this.translationCache.get(cacheKey);
            return;
        }

        try {
            const response = await fetch(`/translations/${this.currentLanguage}.json`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            this.translations = await response.json();
            
            // Salvar no cache
            this.translationCache.set(cacheKey, this.translations);
            
        } catch (error) {
            console.error(`❌ Erro ao carregar traduções para ${this.currentLanguage}:`, error);
            
            // Fallback para português se não conseguir carregar
            if (this.currentLanguage !== this.fallbackLanguage) {
                console.log(`🔄 Tentando fallback para ${this.fallbackLanguage}`);
                this.currentLanguage = this.fallbackLanguage;
                await this.loadTranslations();
            }
        }
    }

    /**
     * 🔤 FUNÇÃO DE TRADUÇÃO
     */
    t(key, variables = {}) {
        try {
            const keys = key.split('.');
            let value = this.translations;
            
            // Navegar pela estrutura do JSON
            for (const k of keys) {
                if (value && typeof value === 'object' && k in value) {
                    value = value[k];
                } else {
                    console.warn(`⚠️ Chave de tradução não encontrada: ${key}`);
                    return key; // Retorna a chave se não encontrar tradução
                }
            }
            
            // Se chegou aqui, encontrou o valor
            if (typeof value === 'string') {
                return this.interpolate(value, variables);
            }
            
            console.warn(`⚠️ Valor de tradução inválido para: ${key}`);
            return key;
            
        } catch (error) {
            console.error(`❌ Erro ao traduzir "${key}":`, error);
            return key;
        }
    }

    /**
     * 🔄 INTERPOLAÇÃO DE VARIÁVEIS
     */
    interpolate(text, variables) {
        return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return variables[key] !== undefined ? variables[key] : match;
        });
    }

    /**
     * 🎨 APLICAR TRADUÇÕES NA PÁGINA
     */
    applyTranslations() {
        // Aplicar traduções em elementos com data-i18n
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translated = this.t(key);
            
            if (element.tagName === 'INPUT' && element.type === 'submit') {
                element.value = translated;
            } else if (element.hasAttribute('placeholder')) {
                element.placeholder = translated;
            } else {
                element.textContent = translated;
            }
        });

        // Aplicar traduções em elementos com data-i18n-html (permite HTML)
        document.querySelectorAll('[data-i18n-html]').forEach(element => {
            const key = element.getAttribute('data-i18n-html');
            const translated = this.t(key);
            element.innerHTML = translated;
        });

        // Atualizar atributo lang do HTML
        document.documentElement.lang = this.currentLanguage;
    }

    /**
     * 📄 ATUALIZAR META TAGS
     */
    updateMetaTags() {
        // Title
        const title = this.t('meta.title');
        if (title && title !== 'meta.title') {
            document.title = title;
        }

        // Description
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

        // hreflang tags
        this.updateHreflangTags();
    }

    /**
     * 🌐 ATUALIZAR HREFLANG TAGS
     */
    updateHreflangTags() {
        // Remover hreflang existentes
        document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(link => {
            link.remove();
        });

        const currentUrl = window.location.origin + window.location.pathname;

        // Adicionar hreflang para cada idioma suportado
        this.supportedLanguages.forEach(lang => {
            const link = document.createElement('link');
            link.rel = 'alternate';
            link.hreflang = lang;
            link.href = `${currentUrl}?lang=${lang}`;
            document.head.appendChild(link);
        });

        // Adicionar x-default
        const defaultLink = document.createElement('link');
        defaultLink.rel = 'alternate';
        defaultLink.hreflang = 'x-default';
        defaultLink.href = `${currentUrl}?lang=${this.fallbackLanguage}`;
        document.head.appendChild(defaultLink);
    }

    /**
     * 🔄 MUDAR IDIOMA
     */
    async changeLanguage(newLang) {
        if (!this.supportedLanguages.includes(newLang)) {
            console.error(`❌ Idioma não suportado: ${newLang}`);
            return;
        }

        if (newLang === this.currentLanguage) {
            return; // Já está no idioma correto
        }

        console.log(`🔄 Mudando idioma de ${this.currentLanguage} para ${newLang}`);

        this.currentLanguage = newLang;
        localStorage.setItem('atalho_language', newLang);

        // Carregar novas traduções
        await this.loadTranslations();
        
        // Aplicar traduções
        this.applyTranslations();
        
        // Atualizar meta tags
        this.updateMetaTags();

        // Atualizar URL sem recarregar página
        const url = new URL(window.location);
        url.searchParams.set('lang', newLang);
        window.history.replaceState({}, '', url);

        // Disparar evento customizado
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: newLang }
        }));

        console.log(`✅ Idioma alterado para: ${newLang}`);
    }

    /**
     * 🎛️ CONFIGURAR SELETOR DE IDIOMA
     */
    setupLanguageSelector() {
        // Criar seletor se não existir
        if (!document.getElementById('language-selector')) {
            this.createLanguageSelector();
        }

        // Configurar eventos
        const selector = document.getElementById('language-selector');
        if (selector) {
            selector.value = this.currentLanguage;
            selector.addEventListener('change', (e) => {
                this.changeLanguage(e.target.value);
            });
        }
    }

    createLanguageSelector() {
        const languageNames = {
            'pt-br': '🇧🇷 Português',
            'en': '🇺🇸 English',
            'es': '🇪🇸 Español',
            'fr': '🇫🇷 Français',
            'de': '🇩🇪 Deutsch',
            'it': '🇮🇹 Italiano'
        };

        const selector = document.createElement('select');
        selector.id = 'language-selector';
        selector.className = 'language-selector';
        
        this.supportedLanguages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang;
            option.textContent = languageNames[lang] || lang.toUpperCase();
            selector.appendChild(option);
        });

        // Adicionar CSS básico
        const style = document.createElement('style');
        style.textContent = `
            .language-selector {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: white;
                font-size: 14px;
                z-index: 1000;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
        `;
        document.head.appendChild(style);

        // Adicionar ao corpo da página
        document.body.appendChild(selector);
    }

    /**
     * 📊 GETTERS ÚTEIS
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    getSupportedLanguages() {
        return [...this.supportedLanguages];
    }

    isRTL() {
        const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
        return rtlLanguages.includes(this.currentLanguage);
    }

    /**
     * 🧪 MÉTODO PARA TESTES
     */
    getTranslationStats() {
        const count = (obj) => {
            let total = 0;
            for (const key in obj) {
                if (typeof obj[key] === 'object') {
                    total += count(obj[key]);
                } else {
                    total++;
                }
            }
            return total;
        };

        return {
            language: this.currentLanguage,
            totalTranslations: count(this.translations),
            cacheSize: this.translationCache.size
        };
    }
}

// 🚀 INICIALIZAÇÃO GLOBAL
window.atalhoI18n = new AtalhoI18n();

// 📤 EXPORTAR PARA USO EM OUTROS SCRIPTS
window.t = (key, variables) => window.atalhoI18n.t(key, variables);
window.changeLanguage = (lang) => window.atalhoI18n.changeLanguage(lang);

// 🎯 FUNÇÕES HELPER GLOBAIS
window.getCurrentLanguage = () => window.atalhoI18n.getCurrentLanguage();
window.getSupportedLanguages = () => window.atalhoI18n.getSupportedLanguages(); 