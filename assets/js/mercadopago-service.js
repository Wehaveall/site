// mercadopago-service.js

class MercadoPagoService {
    constructor() {
        // Inicializa o SDK do Mercado Pago com sua chave pública
        this.publicKey = 'TEST-f6d0456b-ff4f-4c22-afef-53b2c4d4ec35';
        this.mercadopago = new MercadoPago(this.publicKey, {
            locale: 'pt-BR'
        });
    }

    async createPixPayment() {
        try {
            // Cria uma nova ordem de pagamento via API
            const orderData = {
                transaction_amount: 49.90,
                description: 'Licença Anual - Atalho App',
                payment_method_id: 'pix',
                payer: {
                    email: 'test@test.com'
                }
            };

            // Simulação do retorno do PIX (para testes)
            // Em produção, isso viria da API real do Mercado Pago
            return {
                success: true,
                qrCodeBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
                qrCode: 'Código PIX de exemplo'
            };
        } catch (error) {
            console.error('Erro ao criar pagamento:', error);
            return {
                success: false,
                error: 'Erro ao gerar QR Code PIX'
            };
        }
    }

    async checkPaymentStatus(paymentId) {
        try {
            // Em produção, você implementaria a verificação real do status
            return {
                success: true,
                status: 'pending'
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