class MercadoPagoService {
    constructor() {
        // Use your actual Mercado Pago credentials
        this.publicKey = 'TEST-f6d0456b-ff4f-4c22-afef-53b2c4d4ec35';
        this.accessToken = 'TEST-7601417945820618-013008-87f0900af129b320e5d12f6fabe39620-231065568';
        this.apiBaseUrl = 'https://api.mercadopago.com';
    }

    async createPaymentPreference() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/checkout/preferences`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
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
                    ],
                    back_urls: {
                        success: window.location.origin + '/success.html',
                        failure: window.location.origin + '/failure.html',
                        pending: window.location.origin + '/pending.html'
                    },
                    auto_return: 'approved'
                })
            });

            const preferenceData = await response.json();
            return preferenceData.id;
        } catch (error) {
            console.error('Erro ao criar preferência de pagamento:', error);
            throw error;
        }
    }

    // Novo método para criar pagamento PIX
    async createPixPayment() {
        try {
            console.log('Criando pagamento PIX...');

            // Em um ambiente real, esta chamada seria para o seu backend
            // que utilizaria o SDK do Mercado Pago para gerar o pagamento
            // Aqui estamos simulando com uma chamada direta à API

            const response = await fetch(`${this.apiBaseUrl}/v1/payments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    transaction_amount: 49.90,
                    description: 'Licença Anual do Atalho',
                    payment_method_id: 'pix',
                    payer: {
                        email: 'cliente@email.com',
                        first_name: 'Cliente',
                        last_name: 'Teste'
                    }
                })
            });

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
                console.error('Resposta inválida do Mercado Pago:', paymentData);
                return { success: false, error: 'Falha ao gerar QR code PIX' };
            }
        } catch (error) {
            console.error('Erro ao criar pagamento PIX:', error);
            return { success: false, error: error.message };
        }
    }

    // Método para verificar o status do pagamento
    async checkPaymentStatus(paymentId) {
        try {
            console.log(`Verificando status do pagamento ${paymentId}...`);

            const response = await fetch(`${this.apiBaseUrl}/v1/payments/${paymentId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

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