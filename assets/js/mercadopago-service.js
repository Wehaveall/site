// mercadopago-service.js - Cliente para PIX via API do Mercado Pago
class MercadoPagoService {
    constructor() {
        this.baseURL = window.location.origin;
        this.initialized = false;
        this.isLoading = false;
        console.log('🏦 MercadoPagoService inicializado para PIX');
    }

    // Inicialização assíncrona
    async initialize() {
        if (this.initialized || this.isLoading) {
            return this.initialized;
        }

        this.isLoading = true;
        try {
            // Aguardar configuração estar disponível
            if (window.secureConfig) {
                console.log('✅ Configuração disponível para PIX');
                this.initialized = true;
            } else {
                console.log('⚠️ Aguardando configuração para PIX...');
                // Aguardar até 5 segundos pela configuração
                let attempts = 0;
                while (!window.secureConfig && attempts < 50) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }
                this.initialized = !!window.secureConfig;
            }
            
            if (this.initialized) {
                console.log('✅ MercadoPagoService pronto para PIX');
            } else {
                console.warn('⚠️ MercadoPagoService sem configuração, mas continuando...');
                this.initialized = true; // Permitir uso mesmo sem config para fallback
            }
        } catch (error) {
            console.error('❌ Erro na inicialização do MercadoPagoService:', error);
            this.initialized = true; // Permitir uso mesmo com erro
        } finally {
            this.isLoading = false;
        }

        return this.initialized;
    }

    // Criar pagamento PIX
    async createPixPayment() {
        try {
            await this.initialize();

            console.log('🔄 Solicitando criação de pagamento PIX...');

            // Obter dados do usuário autenticado se disponível
            let userData = {};
            if (firebase && firebase.auth && firebase.auth().currentUser) {
                const user = firebase.auth().currentUser;
                userData = {
                    email: user.email,
                    firstName: user.displayName?.split(' ')[0] || 'Cliente',
                    lastName: user.displayName?.split(' ').slice(1).join(' ') || 'Atalho'
                };
            }

            const response = await fetch(`${this.baseURL}/api/create-pix`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(userData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Erro HTTP: ${response.status}`);
            }

            if (result.success) {
                console.log('✅ Pagamento PIX criado com sucesso:', result.paymentId);
                return {
                    success: true,
                    paymentId: result.paymentId,
                    qrCodeBase64: result.qrCodeBase64,
                    qrCodeText: result.qrCodeText,
                    expirationDate: new Date(result.expirationDate),
                    status: result.status
                };
            } else {
                throw new Error(result.error || 'Erro desconhecido na criação do PIX');
            }

        } catch (error) {
            console.error('❌ Erro ao criar pagamento PIX:', error);
            return {
                success: false,
                error: error.message || 'Erro ao criar pagamento PIX'
            };
        }
    }

    // Verificar status do pagamento
    async checkPaymentStatus(paymentId) {
        try {
            if (!paymentId) {
                throw new Error('ID do pagamento é obrigatório');
            }

            console.log(`🔍 Verificando status do pagamento: ${paymentId}`);

            const response = await fetch(`${this.baseURL}/api/payment-status?paymentId=${encodeURIComponent(paymentId)}`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Erro HTTP: ${response.status}`);
            }

            if (result.success) {
                console.log(`📊 Status do pagamento ${paymentId}: ${result.status}`);
                return {
                    success: true,
                    paymentId: result.paymentId,
                    status: result.status,
                    statusDetail: result.statusDetail,
                    amount: result.amount,
                    dateCreated: result.dateCreated,
                    dateApproved: result.dateApproved
                };
            } else {
                throw new Error(result.error || 'Erro desconhecido na verificação do status');
            }

        } catch (error) {
            console.error(`❌ Erro ao verificar status do pagamento ${paymentId}:`, error);
            return {
                success: false,
                error: error.message || 'Erro ao verificar status do pagamento'
            };
        }
    }

    // Simular aprovação de pagamento (para testes)
    async simulatePaymentApproval(paymentId) {
        try {
            if (!paymentId) {
                throw new Error('ID do pagamento é obrigatório');
            }

            console.log(`🧪 Simulando aprovação do pagamento: ${paymentId}`);

            const response = await fetch(`${this.baseURL}/api/simulate-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ paymentId })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Erro HTTP: ${response.status}`);
            }

            if (result.success) {
                console.log(`✅ Pagamento ${paymentId} simulado como aprovado`);
                return {
                    success: true,
                    paymentId: result.paymentId,
                    status: 'approved'
                };
            } else {
                throw new Error(result.error || 'Erro desconhecido na simulação');
            }

        } catch (error) {
            console.error(`❌ Erro ao simular aprovação do pagamento ${paymentId}:`, error);
            return {
                success: false,
                error: error.message || 'Erro ao simular aprovação do pagamento'
            };
        }
    }

    // Verificar se o serviço está disponível
    async isAvailable() {
        try {
            await this.initialize();
            return this.initialized;
        } catch (error) {
            console.error('❌ Erro ao verificar disponibilidade:', error);
            return false;
        }
    }

    // Obter configuração pública
    getPublicConfig() {
        if (window.secureConfig?.mercadopago_public_key) {
            return {
                publicKey: window.secureConfig.mercadopago_public_key
            };
        }
        return null;
    }
}

// Disponibilizar globalmente
if (typeof window !== 'undefined') {
    window.MercadoPagoService = MercadoPagoService;
}

console.log('📦 MercadoPagoService carregado - Pronto para PIX'); 