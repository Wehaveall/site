// VERSÃO CORRIGIDA - SUBSTITUA O ARQUIVO COMPLETAMENTE - 2025-02-28

class MercadoPagoService {
    constructor() {
        // IMPORTANTE: Log de inicialização para confirmar que estamos usando a versão correta
        console.log('🔒 Inicializando MercadoPagoService - VERSÃO SEGURA');

        // Verificar se a configuração segura está disponível
        if (!window.secureConfig) {
            throw new Error('SecureConfig não foi carregado! Inclua config.js antes deste arquivo.');
        }

        // Usar configuração segura
        this.config = window.secureConfig;
        this.apiBaseUrl = this.config.getApiBaseUrl();

        // Log para confirmar URL base (sem expor credenciais)
        console.log('🔗 API Base URL:', this.apiBaseUrl);
        console.log('🛡️ Configuração segura carregada');
    }

    async createPaymentPreference() {
        try {
            console.log('Criando preferência de pagamento...');
            console.log('URL sendo acessada:', `${this.apiBaseUrl}/create-preference`);

            const response = await fetch(`${this.apiBaseUrl}/create-preference`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    items: [
                        {
                            title: 'Licença Atalho',
                            unit_price: 49.90,
                            quantity: 1,
                            currency_id: 'BRL'
                        }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP! status: ${response.status}`);
            }

            const preferenceData = await response.json();
            return preferenceData.id;
        } catch (error) {
            console.error('Erro ao criar preferência de pagamento:', error);
            throw error;
        }
    }

    async createPixPayment() {
        try {
            console.log("🎯 Criando pagamento PIX...");

            const response = await fetch(`${this.apiBaseUrl}/create-pix`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: 49.90,
                    description: 'Licença Anual do Atalho'
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro na requisição');
            }

            const data = await response.json();
            console.log("📋 Resposta da API:", data);

            // Verifica se a resposta tem os dados necessários
            if (data.success && data.paymentId && data.qrCodeBase64) {
                return {
                    success: true,
                    paymentId: data.paymentId,
                    qrCodeBase64: data.qrCodeBase64,
                    qrCodeText: data.qrCodeText,
                    expirationDate: data.expirationDate,
                    status: data.status
                };
            } else {
                throw new Error('Resposta inválida da API');
            }
        } catch (error) {
            console.error('❌ Erro ao criar pagamento PIX:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async checkPaymentStatus(paymentId) {
        try {
            console.log(`🔍 Verificando status do pagamento ${paymentId}...`);

            const response = await fetch(`${this.apiBaseUrl}/payment-status?paymentId=${paymentId}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao verificar status');
            }

            const data = await response.json();

            return {
                success: true,
                paymentId: data.id,
                status: data.status,
                statusDetail: data.status_detail,
                dateApproved: data.date_approved,
                transactionAmount: data.transaction_amount,
                isSimulation: data.simulation || false
            };
        } catch (error) {
            console.error('❌ Erro ao verificar status:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Novo método para simular pagamento aprovado
    async simulatePaymentApproval(paymentId) {
        try {
            console.log(`🧪 Simulando aprovação do pagamento ${paymentId}...`);

            const response = await fetch(`${this.apiBaseUrl}/simulate-payment?paymentId=${paymentId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro na simulação');
            }

            const data = await response.json();

            return {
                success: true,
                paymentId: data.id,
                status: data.status,
                statusDetail: data.status_detail,
                dateApproved: data.date_approved,
                transactionAmount: data.transaction_amount,
                isSimulation: true
            };
        } catch (error) {
            console.error('❌ Erro ao simular pagamento:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Método para salvar dados do cliente antes do pagamento
    async saveCustomerData(customerData) {
        try {
            console.log("💾 Salvando dados do cliente...");

            const response = await fetch(`${this.apiBaseUrl}/save-customer-data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(customerData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao salvar dados');
            }

            const data = await response.json();

            return {
                success: true,
                customerId: data.customer_id,
                message: data.message
            };
        } catch (error) {
            console.error('❌ Erro ao salvar dados do cliente:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}