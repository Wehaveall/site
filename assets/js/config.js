// 🔒 CONFIGURAÇÃO SEGURA - CREDENCIAIS REMOVIDAS
class SecureConfig {
    constructor() {
        // Configuração para desenvolvimento/produção
        this.isDevelopment = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1';
        
        // URLs da API
        this.apiBaseUrl = '/api';
        
        // Credenciais serão carregadas via API
        this.credentials = {
            publicKey: null,
            accessToken: null // NUNCA no frontend
        };
    }
    
    // ✅ CARREGAMENTO SEGURO VIA API
    async loadCredentials() {
        try {
            const response = await fetch('/api/config');
            if (response.ok) {
                const config = await response.json();
                this.credentials.publicKey = config.publicKey;
                console.log('✅ Configuração carregada via API');
                return true;
            }
        } catch (error) {
            console.error('❌ Erro ao carregar configuração:', error);
        }
        return false;
    }
    
    getPublicKey() {
        return this.credentials.publicKey;
    }
    
    getApiBaseUrl() {
        return this.apiBaseUrl;
    }
    
    // Método para carregar configurações do servidor
    async loadServerConfig() {
        return await this.loadCredentials();
    }
}

// Instância global
window.secureConfig = new SecureConfig();

console.log('📋 SecureConfig carregado - Credenciais removidas do frontend'); 