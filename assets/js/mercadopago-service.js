// VERSÃO CORRIGIDA - SUBSTITUA O ARQUIVO COMPLETAMENTE - 2025-02-28

class MercadoPagoService {
    constructor() {
        // IMPORTANTE: Log de inicialização para confirmar que estamos usando a versão correta
        console.log('Inicializando MercadoPagoService - VERSÃO CORRIGIDA');

        // Apontando para o servidor local
        this.apiBaseUrl = 'http://localhost:3000/api';

        // Credenciais de PRODUÇÃO (apenas para referência, o backend usa o Access Token)
        this.publicKey = 'APP_USR-eb7579bb-3460-43d1-83eb-1010a62d1bd2';
        this.accessToken = 'APP_USR-7601417945820618-013008-5b2554be4b9451d02eaed17ed992b76b-231065568';

        // Log para confirmar URL base
        console.log('API Base URL:', this.apiBaseUrl);
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

            if (data.point_of_interaction && data.point_of_interaction.transaction_data) {
                return {
                    success: true,
                    paymentId: data.id,
                    qrCodeBase64: data.point_of_interaction.transaction_data.qr_code_base64,
                    qrCodeText: data.point_of_interaction.transaction_data.qr_code,
                    expirationDate: data.date_of_expiration,
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

            const response = await fetch(`${this.apiBaseUrl}/payment-status/${paymentId}`);

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

            const response = await fetch(`${this.apiBaseUrl}/simulate-payment/${paymentId}`, {
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