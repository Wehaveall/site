class MercadoPagoService {
    constructor() {
        // Apontando para o servidor local
        this.apiBaseUrl = 'http://localhost:3000/api';
        // Mantendo as credenciais para referência (não são usadas no frontend)
        this.publicKey = 'TEST-f6d0456b-ff4f-4c22-afef-53b2c4d4ec35';
        this.accessToken = 'TEST-7601417945820618-013008-87f0900af129b320e5d12f6fabe39620-231065568';
    }

    async createPaymentPreference() {
        try {
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
            console.log('Criando pagamento PIX...');

            // Chamando a rota correta no servidor local
            const response = await fetch(`${this.apiBaseUrl}/create-pix`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    // Você pode adicionar dados do cliente aqui se necessário
                    amount: 49.90,
                    description: 'Licença Anual do Atalho'
                })
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP! status: ${response.status}`);
            }

            const paymentData = await response.json();
            console.log('Resposta do pagamento PIX:', paymentData);

            if (paymentData.status === 'pending' &&
                paymentData.point_of_interaction &&
                paymentData.point_of_interaction.transaction_data) {

                const transactionData = paymentData.point_of_interaction.transaction_data;

                return {
                    success: true,
                    paymentId: paymentData.id,
                    qrCodeBase64: transactionData.qr_code_base64,
                    qrCodeText: transactionData.qr_code,
                    expirationDate: new Date(paymentData.date_of_expiration)
                };
            } else {
                console.error('Resposta inválida do servidor:', paymentData);
                return { success: false, error: 'Falha ao gerar QR code PIX' };
            }
        } catch (error) {
            console.error('Erro ao criar pagamento PIX:', error);
            return { success: false, error: error.message };
        }
    }

    async checkPaymentStatus(paymentId) {
        try {
            console.log(`Verificando status do pagamento ${paymentId}...`);

            // Chamando a rota correta no servidor local
            const response = await fetch(`${this.apiBaseUrl}/payment-status/${paymentId}`);

            if (!response.ok) {
                throw new Error(`Erro HTTP! status: ${response.status}`);
            }

            const paymentData = await response.json();
            console.log('Status atual do pagamento:', paymentData.status);

            return {
                success: true,
                paymentId: paymentData.id,
                status: paymentData.status
            };
        } catch (error) {
            console.error('Erro ao verificar status do pagamento:', error);
            return { success: false, error: error.message };
        }
    }
}