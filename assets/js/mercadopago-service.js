// mercadopago-service.js

class MercadoPagoService {
    constructor() {
        // Substitua pela sua Public Key
        this.publicKey = 'TEST-f6d0456b-ff4f-4c22-afef-53b2c4d4ec35';

        // Substitua pelo seu Access Token
        this.accessToken = 'TEST-7601417945820618-013008-87f0900af129b320e5d12f6fabe39620-231065568';

        // Inicializa o SDK do Mercado Pago
        this.mercadopago = new MercadoPago(this.publicKey, {
            locale: 'pt-BR'
        });
    }

    async createPixPayment() {
        try {
            const response = await fetch('https://api.mercadopago.com/v1/payments', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    transaction_amount: 49.90,
                    payment_method_id: 'pix',
                    payer: {
                        email: 'test@test.com'
                    },
                    description: 'Licença Anual - Atalho App'
                })
            });

            const paymentData = await response.json();

            if (paymentData.id && paymentData.point_of_interaction) {
                return {
                    success: true,
                    qrCode: paymentData.point_of_interaction.transaction_data.qr_code,
                    qrCodeBase64: paymentData.point_of_interaction.transaction_data.qr_code_base64,
                    paymentId: paymentData.id
                };
            } else {
                throw new Error('Dados do pagamento inválidos');
            }
        } catch (error) {
            console.error('Erro ao criar pagamento PIX:', error);
            return {
                success: false,
                error: 'Erro ao gerar QR Code PIX'
            };
        }
    }

    async checkPaymentStatus(paymentId) {
        try {
            const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            const paymentData = await response.json();
            return {
                success: true,
                status: paymentData.status
            };
        } catch (error) {
            console.error('Erro ao verificar status do pagamento:', error);
            return {
                success: false,
                error: 'Erro ao verificar status do pagamento'
            };
        }
    }
}

// Cria uma instância global
window.mpService = new MercadoPagoService();