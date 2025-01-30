// mercadopago-service.js

class MercadoPagoService {
    constructor() {
        // Inicializa o SDK do Mercado Pago
        this.mp = new MercadoPago('TEST-f6d0456b-ff4f-4c22-afef-53b2c4d4ec35');

        // Configuração da preferência
        this.preferenceId = null;
        this.bricks = null;
    }

    async createPixPayment() {
        try {
            // Criar o Brick de pagamento
            const bricksBuilder = await this.mp.bricks();

            // Container para o QR Code
            const renderComponent = async (preferenceId) => {
                await bricksBuilder.create("wallet", "pix-container", {
                    initialization: {
                        preferenceId: preferenceId,
                        redirectMode: "modal"
                    },
                    callbacks: {
                        onReady: () => {
                            console.log('Brick pronto');
                        },
                        onSubmit: () => {
                            console.log('Pagamento enviado');
                        },
                        onError: (error) => {
                            console.error('Erro no brick:', error);
                        }
                    }
                });
            };

            // Simula a criação de uma preferência (em produção, isso viria do seu backend)
            const preference = {
                id: 'TEST_PREFERENCE_ID',
                init_point: 'https://www.mercadopago.com.br/test-qr'
            };

            this.preferenceId = preference.id;

            return {
                success: true,
                preferenceId: preference.id,
                renderFunction: renderComponent
            };
        } catch (error) {
            console.error('Erro ao criar pagamento:', error);
            return {
                success: false,
                error: 'Erro ao iniciar pagamento PIX'
            };
        }
    }

    async checkPaymentStatus() {
        // Em produção, isso seria implementado com webhooks
        return {
            success: true,
            status: 'pending'
        };
    }
}

// Cria uma instância global
window.mpService = new MercadoPagoService();