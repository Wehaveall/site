// mercadopago-service.js

class MercadoPagoService {
    constructor() {
        this.publicKey = 'TEST-f6d0456b-ff4f-4c22-afef-53b2c4d4ec35';
        this.accessToken = 'TEST-7601417945820618-013008-87f0900af129b320e5d12f6fabe39620-231065568';

        // Inicializa o SDK do Mercado Pago
        this.mercadopago = new MercadoPago(this.publicKey, {
            locale: 'pt-BR'
        });
    }

    async createPixPayment() {
        try {
            // Gerar preferência de pagamento
            const preferenceData = {
                transaction_amount: 49.90,
                payment_method_id: 'pix',
                description: 'Licença Anual - Atalho App',
                payer: {
                    email: 'test@test.com',
                    first_name: 'Test',
                    last_name: 'User'
                }
            };

            // Criar pagamento
            const response = await fetch('https://api.mercadopago.com/v1/payments', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(preferenceData)
            });

            if (!response.ok) {
                throw new Error('Erro na resposta do Mercado Pago');
            }

            const paymentData = await response.json();

            // Verificar se temos os dados do QR Code
            if (paymentData.point_of_interaction &&
                paymentData.point_of_interaction.transaction_data) {
                const transactionData = paymentData.point_of_interaction.transaction_data;

                return {
                    success: true,
                    qrCode: transactionData.qr_code,
                    qrCodeBase64: transactionData.qr_code_base64,
                    paymentId: paymentData.id
                };
            } else {
                throw new Error('QR Code não encontrado na resposta');
            }
        } catch (error) {
            console.error('Erro ao criar pagamento:', error);
            return {
                success: false,
                error: 'Erro ao gerar QR Code PIX'
            };
        }
    }

    async checkPaymentStatus(paymentId) {
        if (!paymentId) return { success: false, error: 'ID do pagamento não fornecido' };

        try {
            const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Erro ao verificar status do pagamento');
            }

            const paymentData = await response.json();
            return {
                success: true,
                status: paymentData.status
            };
        } catch (error) {
            console.error('Erro ao verificar status:', error);
            return {
                success: false,
                error: 'Erro ao verificar status do pagamento'
            };
        }
    }
}

// Cria uma instância global
window.mpService = new MercadoPagoService();