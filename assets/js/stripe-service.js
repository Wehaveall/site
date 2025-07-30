// 🔵 STRIPE SERVICE - Integração Frontend com Stripe
class StripeService {
    constructor() {
        console.log('🔵 Inicializando StripeService');
        
        this.stripe = null;
        this.config = null;
        this.apiBaseUrl = null;
        this.initialized = false;
        this.publicKey = null;
    }

    async initialize() {
        try {
            console.log('🔵 [STRIPE] Inicializando serviço...');
            
            // Aguardar configuração ser carregada
            if (!window.secureConfig) {
                console.log('⏳ Aguardando configuração ser carregada...');
                await ConfigLoader.waitForConfig();
            }

            // Usar configuração segura
            this.config = window.secureConfig;
            this.apiBaseUrl = this.config.getApiBaseUrl();
            
            // Buscar chave pública do Stripe
            this.publicKey = await this.getStripePublicKey();
            
            if (!this.publicKey) {
                throw new Error('Chave pública do Stripe não encontrada');
            }

            // Inicializar Stripe.js
            if (typeof Stripe === 'undefined') {
                console.log('🔵 [STRIPE] Carregando Stripe.js...');
                await this.loadStripeJS();
            }

            this.stripe = Stripe(this.publicKey);
            this.initialized = true;

            console.log('✅ [STRIPE] Serviço inicializado com sucesso');
            return true;
            
        } catch (error) {
            console.error('❌ [STRIPE] Erro ao inicializar:', error);
            
            // Fallback de emergência
            this.apiBaseUrl = window.location.origin + '/api';
            console.log('🔄 [STRIPE] Usando URL de fallback:', this.apiBaseUrl);
            
            return false;
        }
    }

    async loadStripeJS() {
        return new Promise((resolve, reject) => {
            if (typeof Stripe !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://js.stripe.com/v3/';
            script.onload = () => {
                console.log('✅ [STRIPE] Stripe.js carregado');
                resolve();
            };
            script.onerror = () => {
                console.error('❌ [STRIPE] Erro ao carregar Stripe.js');
                reject(new Error('Falha ao carregar Stripe.js'));
            };
            
            document.head.appendChild(script);
        });
    }

    async getStripePublicKey() {
        try {
            // Tentar buscar da configuração local primeiro
            if (this.config && this.config.stripePublicKey) {
                return this.config.stripePublicKey;
            }

            // Buscar do endpoint de configuração
            const response = await fetch(`${this.apiBaseUrl}/config`);
            if (response.ok) {
                const config = await response.json();
                return config.stripePublicKey || null;
            }

            // Fallback - tentar variáveis de ambiente expostas
            return process.env.STRIPE_PUBLIC_KEY || null;
            
        } catch (error) {
            console.error('❌ [STRIPE] Erro ao buscar chave pública:', error);
            return null;
        }
    }

    async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
        
        if (!this.stripe) {
            throw new Error('Stripe não inicializado');
        }
    }

    async createCheckoutSession(options = {}) {
        await this.ensureInitialized();
        
        try {
            console.log('🔵 [STRIPE] Criando sessão de checkout...');
            
            // Validar dados obrigatórios
            if (!options.licenseType || !options.userEmail) {
                throw new Error('Tipo de licença e email são obrigatórios');
            }

            // Obter idioma atual
            const currentLanguage = window.getCurrentLanguage ? window.getCurrentLanguage() : 'pt-br';
            
            // Obter token de autenticação
            let authToken = null;
            if (window.auth && window.auth.currentUser) {
                authToken = await window.auth.currentUser.getIdToken();
            } else {
                throw new Error('Usuário não autenticado');
            }

            const requestBody = {
                license_type: options.licenseType,
                user_email: options.userEmail,
                user_name: options.userName || '',
                language: currentLanguage
            };

            console.log('🔵 [STRIPE] Dados da requisição:', {
                ...requestBody,
                language: currentLanguage
            });

            const response = await fetch(`${this.apiBaseUrl}/create-checkout-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const sessionData = await response.json();
            
            if (!sessionData.success || !sessionData.sessionId) {
                throw new Error('Resposta inválida da API');
            }

            console.log('✅ [STRIPE] Sessão criada:', sessionData.sessionId);
            
            return {
                success: true,
                sessionId: sessionData.sessionId,
                url: sessionData.url,
                mode: sessionData.mode,
                licenseType: sessionData.licenseType
            };
            
        } catch (error) {
            console.error('❌ [STRIPE] Erro ao criar sessão:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async redirectToCheckout(sessionId) {
        await this.ensureInitialized();
        
        try {
            console.log('🔵 [STRIPE] Redirecionando para checkout:', sessionId);
            
            const result = await this.stripe.redirectToCheckout({
                sessionId: sessionId
            });

            if (result.error) {
                throw new Error(result.error.message);
            }

            return { success: true };
            
        } catch (error) {
            console.error('❌ [STRIPE] Erro no redirecionamento:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async processPayment(options = {}) {
        try {
            console.log('🔵 [STRIPE] Iniciando processo de pagamento...');
            
            // Criar sessão de checkout
            const sessionResult = await this.createCheckoutSession(options);
            
            if (!sessionResult.success) {
                throw new Error(sessionResult.error);
            }

            // Redirecionar para checkout
            const redirectResult = await this.redirectToCheckout(sessionResult.sessionId);
            
            if (!redirectResult.success) {
                throw new Error(redirectResult.error);
            }

            return { success: true };
            
        } catch (error) {
            console.error('❌ [STRIPE] Erro no processo de pagamento:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Método para verificar se o Stripe está disponível para o idioma atual
    isAvailableForCurrentLanguage() {
        const currentLanguage = window.getCurrentLanguage ? window.getCurrentLanguage() : 'pt-br';
        
        // Stripe está disponível para todos os idiomas
        return true;
    }

    // Método para obter informações de preço baseado no idioma
    getPriceInfo(licenseType = 'anual') {
        const currentLanguage = window.getCurrentLanguage ? window.getCurrentLanguage() : 'pt-br';
        
        const priceInfo = {
            'pt-br': {
                anual: { amount: 'R$ 49,90', currency: 'BRL' },
                vitalicia: { amount: 'R$ 299,00', currency: 'BRL' }
            },
            'en': {
                anual: { amount: '$19.90', currency: 'USD' },
                vitalicia: { amount: '$99.00', currency: 'USD' }
            },
            'es': {
                anual: { amount: '$19.90', currency: 'USD' },
                vitalicia: { amount: '$99.00', currency: 'USD' }
            },
            'fr': {
                anual: { amount: '€17.90', currency: 'EUR' },
                vitalicia: { amount: '€89.00', currency: 'EUR' }
            },
            'de': {
                anual: { amount: '€17.90', currency: 'EUR' },
                vitalicia: { amount: '€89.00', currency: 'EUR' }
            },
            'it': {
                anual: { amount: '€17.90', currency: 'EUR' },
                vitalicia: { amount: '€89.00', currency: 'EUR' }
            }
        };

        const langPrices = priceInfo[currentLanguage] || priceInfo['en'];
        return langPrices[licenseType] || langPrices['anual'];
    }

    // Método para obter status de pagamento/sessão
    async getSessionStatus(sessionId) {
        await this.ensureInitialized();
        
        try {
            const session = await this.stripe.checkout.sessions.retrieve(sessionId);
            return {
                success: true,
                status: session.payment_status,
                customerEmail: session.customer_details?.email
            };
        } catch (error) {
            console.error('❌ [STRIPE] Erro ao buscar status da sessão:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Inicializar instância global
window.stripeService = new StripeService();

// Export para compatibilidade
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StripeService;
}

console.log('🔵 StripeService carregado e disponível globalmente');