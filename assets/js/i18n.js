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
        
        // Limpar cache antigo ao inicializar
        this.clearCache();
        
        this.init();
    }

    /**
     * 🗑️ LIMPAR CACHE DE TRADUÇÕES
     */
    clearCache() {
        this.translationCache.clear();
        console.log('🗑️ Cache de traduções limpo');
    }

    async init() {
        try {
            // 1. Detectar idioma automaticamente
            this.currentLanguage = this.detectLanguage();
            
            // 2. Carregar traduções (forçar reload para garantir dados atualizados)
            await this.loadTranslations(true);
            
            // 3. Aplicar traduções na página
            this.applyTranslations();
            
            // 4. Atualizar meta tags
            this.updateMetaTags();
            
            // 5. Configurar seletor de idioma (apenas se não existir um manual)
            if (!document.getElementById('language-select')) {
                this.setupLanguageSelector();
            } else {
                console.log('🌍 Seletor de idioma manual detectado, não criando automático');
            }
            
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
        // 1. Verificar URL (ex: ?lang=es) - PRIORIDADE MÁXIMA
        const urlParams = new URLSearchParams(window.location.search);
        const urlLang = urlParams.get('lang');
        if (urlLang && this.supportedLanguages.includes(urlLang)) {
            localStorage.setItem('atalho_language', urlLang);
            console.log(`🔗 Idioma detectado via URL: ${urlLang}`);
            return urlLang;
        }

        // 2. Verificar localStorage PRIMEIRO (idioma selecionado pelo usuário)
        const savedLang = localStorage.getItem('atalho_language');
        if (savedLang && this.supportedLanguages.includes(savedLang)) {
            console.log(`💾 Idioma detectado via localStorage (escolha do usuário): ${savedLang}`);
            return savedLang;
        }

        // 3. Detectar idioma do navegador - APENAS na primeira visita
        const browserLang = this.detectBrowserLanguage();
        if (browserLang) {
            console.log(`🌐 Idioma detectado via navegador: ${browserLang}`);
            localStorage.setItem('atalho_language', browserLang);
            return browserLang;
        }

        // 4. Detectar por timezone/país (aproximação)
        const geoLang = this.detectByTimezone();
        if (geoLang) {
            console.log(`🌍 Idioma detectado via timezone: ${geoLang}`);
            localStorage.setItem('atalho_language', geoLang);
            return geoLang;
        }

        // 5. Padrão
        console.log(`🔄 Usando idioma padrão: ${this.fallbackLanguage}`);
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
    async loadTranslations(forceReload = false) {
        const cacheKey = `translations_${this.currentLanguage}`;
        
        // Verificar cache primeiro (apenas se não for reload forçado)
        if (!forceReload && this.translationCache.has(cacheKey)) {
            this.translations = this.translationCache.get(cacheKey);
            console.log(`📦 Traduções carregadas do cache para: ${this.currentLanguage}`);
            return;
        }

        try {
            // Adicionar timestamp para evitar cache do browser
            const timestamp = forceReload ? `?t=${Date.now()}` : '';
            const response = await fetch(`/assets/translations/${this.currentLanguage}.json${timestamp}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            this.translations = await response.json();
            
            // Verificar se as novas chaves 'register' existem
            if (this.translations.register) {
                console.log(`✅ Traduções 'register' encontradas para ${this.currentLanguage}`);
            } else {
                console.warn(`⚠️ Seção 'register' não encontrada para ${this.currentLanguage}`);
            }
            
            // Salvar no cache
            this.translationCache.set(cacheKey, this.translations);
            console.log(`🔄 Traduções recarregadas para: ${this.currentLanguage}`);
            
        } catch (error) {
            console.error(`❌ Erro ao carregar traduções para ${this.currentLanguage}:`, error);
            
            // Fallback para português se não conseguir carregar
            if (this.currentLanguage !== this.fallbackLanguage) {
                console.log(`🔄 Tentando fallback para ${this.fallbackLanguage}`);
                this.currentLanguage = this.fallbackLanguage;
                await this.loadTranslations(forceReload);
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
                // Verificar se contém HTML (como <br/>)
                if (translated.includes('<br/>') || translated.includes('<br>')) {
                    element.innerHTML = translated;
                } else {
                    element.textContent = translated;
                }
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

        // Carregar novas traduções (forçar reload para garantir dados atualizados)
        await this.loadTranslations(true);
        
        // Aplicar traduções
        this.applyTranslations();
        
        // Atualizar meta tags
        this.updateMetaTags();

        // Atualizar URL sem recarregar página
        const url = new URL(window.location);
        url.searchParams.set('lang', newLang);
        window.history.replaceState({}, '', url);

        // Atualizar seletor visual se existir
        if (document.querySelector('#language-selector')) {
            this.updateLanguageSelector();
        }

        // Disparar evento customizado
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: newLang }
        }));

        console.log(`✅ Idioma alterado para: ${newLang}`);
    }

    /**
     * 🌍 CONFIGURAR SELETOR DE IDIOMA COM BANDEIRAS
     */
    setupLanguageSelector() {
        // Dados dos idiomas com bandeiras (nomes curtos)
        this.languageData = {
            'pt-br': { 
                name: 'Português', 
                flag: 'https://flagcdn.com/w40/br.png',
                country: 'Brasil'
            },
            'en': { 
                name: 'English', 
                flag: 'https://flagcdn.com/w40/us.png',
                country: 'United States'
            },
            'es': { 
                name: 'Español', 
                flag: 'https://flagcdn.com/w40/es.png',
                country: 'España'
            },
            'fr': { 
                name: 'Français', 
                flag: 'https://flagcdn.com/w40/fr.png',
                country: 'France'
            },
            'de': { 
                name: 'Deutsch', 
                flag: 'https://flagcdn.com/w40/de.png',
                country: 'Deutschland'
            },
            'it': { 
                name: 'Italiano', 
                flag: 'https://flagcdn.com/w40/it.png',
                country: 'Italia'
            }
        };

        this.createLanguageSelector();
        console.log('🌍 Seletor de idioma com bandeiras criado');
    }

    createLanguageSelector() {
        // Verificar se já existe um seletor de idioma
        if (document.getElementById('language-selector') || 
            document.querySelector('.language-selector') ||
            document.querySelector('.language-dropdown')) {
            console.log('🌍 Seletor de idioma já existe, não criando duplicado');
            return;
        }

        // Procurar onde inserir o seletor (no header)
        const targetElement = document.querySelector('nav ul') || 
                             document.querySelector('header') || 
                             document.querySelector('.header') ||
                             document.body;

        // Criar container do seletor
        const selectorContainer = document.createElement('div');
        selectorContainer.className = 'language-selector';
        selectorContainer.id = 'language-selector';

        // Dropdown principal
        const dropdown = document.createElement('div');
        dropdown.className = 'language-dropdown';
        
        // Idioma atual
        const currentLang = document.createElement('div');
        currentLang.className = 'current-language';
        
        const currentFlag = document.createElement('img');
        currentFlag.className = 'flag-icon';
        currentFlag.src = this.languageData[this.currentLanguage].flag;
        currentFlag.alt = this.languageData[this.currentLanguage].country;
        
        const currentCode = document.createElement('span');
        currentCode.className = 'language-code';
        currentCode.textContent = this.currentLanguage.toUpperCase();
        
        const arrow = document.createElement('span');
        arrow.className = 'dropdown-arrow';
        arrow.innerHTML = '▼';
        
        currentLang.appendChild(currentFlag);
        currentLang.appendChild(currentCode);
        dropdown.appendChild(currentLang);
        dropdown.appendChild(arrow);
        
        // Lista de opções
        const options = document.createElement('div');
        options.className = 'language-options';
        
        this.supportedLanguages.forEach(lang => {
            const option = document.createElement('div');
            option.className = 'language-option';
            option.dataset.lang = lang;
            
            if (lang === this.currentLanguage) {
                option.classList.add('selected');
            }
            
            const flag = document.createElement('img');
            flag.className = 'flag-icon';
            flag.src = this.languageData[lang].flag;
            flag.alt = this.languageData[lang].country;
            
            const code = document.createElement('span');
            code.className = 'language-code';
            code.textContent = lang.toUpperCase();
            
            option.appendChild(flag);
            option.appendChild(code);
            
            // Event listener para mudança de idioma
            option.addEventListener('click', async (e) => {
                e.stopPropagation();
                const selectedLang = option.dataset.lang;
                
                if (selectedLang !== this.currentLanguage) {
                    await this.changeLanguage(selectedLang);
                    this.updateLanguageSelector();
                }
                
                // Fechar dropdown
                dropdown.classList.remove('active');
                options.classList.remove('show');
            });
            
            options.appendChild(option);
        });
        
        // Event listeners para abrir/fechar dropdown
        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
            options.classList.toggle('show');
        });
        
        // Fechar dropdown ao clicar fora
        document.addEventListener('click', () => {
            dropdown.classList.remove('active');
            options.classList.remove('show');
        });
        
        // Montar estrutura
        selectorContainer.appendChild(dropdown);
        selectorContainer.appendChild(options);
        
        // Inserir no DOM
        if (targetElement.tagName === 'UL') {
            // Se for uma lista de navegação, criar um item de lista
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
            currentFlag.alt = this.languageData[this.currentLanguage].country;
            currentCode.textContent = this.currentLanguage.toUpperCase();
        }
        
        // Atualizar opções selecionadas
        document.querySelectorAll('.language-option').forEach(option => {
            option.classList.toggle('selected', option.dataset.lang === this.currentLanguage);
        });
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
window.i18nSystem = window.atalhoI18n; // Alias para compatibilidade

// 📤 EXPORTAR PARA USO EM OUTROS SCRIPTS
window.t = (key, variables) => window.atalhoI18n.t(key, variables);
window.changeLanguage = (lang) => window.atalhoI18n.changeLanguage(lang);

// 🎯 FUNÇÕES HELPER GLOBAIS
window.getCurrentLanguage = () => window.atalhoI18n.getCurrentLanguage();
window.getSupportedLanguages = () => window.atalhoI18n.getSupportedLanguages(); 