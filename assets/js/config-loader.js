// 🔒 CARREGADOR DE CONFIGURAÇÃO SEGURA
// Este script carrega as configurações da API e cria o objeto secureConfig global

class ConfigLoader {
    constructor() {
        this.config = null;
        this.loaded = false;
    }

    async loadConfig() {
        try {
            console.log('🔧 Carregando configuração segura...');
            
            const response = await fetch('/api/config');
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            
            const configData = await response.json();
            console.log('✅ Configuração carregada:', {
                hasPublicKey: configData.hasPublicKey,
                environment: configData.environment,
                apiVersion: configData.apiVersion
            });
            
            // Criar objeto secureConfig global
            window.secureConfig = {
                publicKey: configData.publicKey,
                environment: configData.environment,
                apiVersion: configData.apiVersion,
                allowedOrigins: configData.allowedOrigins,
                
                // Método para obter URL base da API
                getApiBaseUrl: () => {
                    return window.location.origin + '/api';
                }
            };
            
            this.config = window.secureConfig;
            this.loaded = true;
            
            console.log('🔗 API Base URL configurada:', this.config.getApiBaseUrl());
            
            // Disparar evento customizado para notificar que a configuração foi carregada
            window.dispatchEvent(new CustomEvent('configLoaded', { 
                detail: { config: this.config } 
            }));
            
            return this.config;
            
        } catch (error) {
            console.error('❌ Erro ao carregar configuração:', error);
            
            // Fallback de configuração
            console.log('🔄 Usando configuração de fallback...');
            window.secureConfig = {
                publicKey: null,
                environment: 'production',
                apiVersion: '1.0.0',
                allowedOrigins: ['https://atalho.me'],
                
                getApiBaseUrl: () => {
                    return window.location.origin + '/api';
                }
            };
            
            this.config = window.secureConfig;
            this.loaded = true;
            
            window.dispatchEvent(new CustomEvent('configLoaded', { 
                detail: { config: this.config, fallback: true } 
            }));
            
            return this.config;
        }
    }

    // Método para aguardar carregamento da configuração
    static async waitForConfig(timeout = 10000) {
        return new Promise((resolve, reject) => {
            // Se já estiver carregado, retornar imediatamente
            if (window.secureConfig) {
                resolve(window.secureConfig);
                return;
            }
            
            // Aguardar evento de carregamento
            const timeoutId = setTimeout(() => {
                reject(new Error('Timeout ao aguardar configuração'));
            }, timeout);
            
            window.addEventListener('configLoaded', (event) => {
                clearTimeout(timeoutId);
                resolve(event.detail.config);
            }, { once: true });
        });
    }
}

// Inicializar carregamento automático
const configLoader = new ConfigLoader();

// Carregar configuração assim que o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        configLoader.loadConfig();
    });
} else {
    // DOM já está pronto
    configLoader.loadConfig();
}

// Exportar para uso global
window.ConfigLoader = ConfigLoader;
window.configLoader = configLoader;

console.log('📋 Config Loader inicializado'); 