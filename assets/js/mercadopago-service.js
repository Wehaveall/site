// mercadopago-service.js

class MercadoPagoService {
    constructor() {
        // Inicializa o SDK do Mercado Pago
        this.mp = new MercadoPago('TEST-f6d0456b-ff4f-4c22-afef-53b2c4d4ec35', {
            locale: 'pt-BR'
        });

        // Configuração do checkout
        this.checkoutConfig = {
            preference: {
                items: [{
                    title: 'Licença Anual - Atalho App',
                    unit_price: 49.90,
                    quantity: 1,
                }],
                payment_methods: {
                    default_payment_method_id: "pix",
                    excluded_payment_types: [{ id: "credit_card" }]
                },
                auto_return: "approved"
            }
        };
    }

    async createPixPayment() {
        try {
            // Criar checkout
            const checkout = this.mp.checkout(this.checkoutConfig);

            // Criar botão de pagamento PIX
            const pixButton = checkout.create('pix');

            return {
                success: true,
                pixButton: pixButton
            };
        } catch (error) {
            console.error('Erro ao criar pagamento:', error);
            return {
                success: false,
                error: 'Erro ao gerar pagamento PIX'
            };
        }
    }
}

// Cria uma instância global
window.mpService = new MercadoPagoService();