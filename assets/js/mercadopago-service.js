// mercadopago-service.js

class MercadoPagoService {
    constructor() {
        // Public Key do Mercado Pago
        this.publicKey = 'TEST-f6d0456b-ff4f-4c22-afef-53b2c4d4ec35';

        // Access Token do Mercado Pago
        this.accessToken = 'TEST-7601417945820618-013008-87f0900af129b320e5d12f6fabe39620-231065568';

        // Inicializa o SDK do Mercado Pago
        this.mercadopago = new MercadoPago(this.publicKey, {
            locale: 'pt-BR'
        });

        // Preferências do checkout
        this.preference = {
            items: [{
                title: 'Licença Anual - Atalho App',
                unit_price: 49.90,
                quantity: 1,
            }],
            payment_methods: {
                default_payment_method_id: "pix",
                excluded_payment_types: [
                    { id: "credit_card" },
                    { id: "debit_card" },
                    { id: "bank_transfer" }
                ]
            }
        };
    }

    async createPixPayment() {
        try {
            // Criar uma preferência de pagamento
            const preference = await this.mercadopago.preferences.create(this.preference);

            // Criar o checkout
            const checkout = await this.mercadopago.checkout({
                preference: {
                    id: preference.id
                }
            });

            // Simular um QR Code para teste
            // Em produção, você deve pegar isso da resposta do checkout
            const qrCodeBase64 = await this.getQRCodeBase64();

            return {
                success: true,
                qrCodeBase64: qrCodeBase64,
                qrCode: checkout.init_point,
                paymentId: preference.id
            };
        } catch (error) {
            console.error('Erro ao criar pagamento:', error);
            return {
                success: false,
                error: 'Erro ao gerar QR Code PIX'
            };
        }
    }

    // Método auxiliar para gerar QR Code de teste
    async getQRCodeBase64() {
        // Simulação de QR Code para teste
        // Em produção, você deve pegar o QR Code real da API do Mercado Pago
        const qrCodeImage = 'iVBORw0KGgoAAAANSUhEUgAA...'; // Base64 do QR Code
        return qrCodeImage;
    }

    async checkPaymentStatus(paymentId) {
        try {
            // Em produção, você deve implementar a verificação real do status
            // Por enquanto, vamos simular um status
            return {
                success: true,
                status: 'pending' // ou 'approved' quando o pagamento for confirmado
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