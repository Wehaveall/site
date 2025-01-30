// mercadopago-service.js

class MercadoPagoService {
    constructor() {
        // Inicializa o SDK do Mercado Pago
        this.mp = new MercadoPago('TEST-f6d0456b-ff4f-4c22-afef-53b2c4d4ec35', {
            locale: 'pt-BR'
        });
    }

    createPixButton(container) {
        const pixButton = this.mp.bricks().create('pix', container, {
            initialization: {
                amount: 49.90
            },
            callbacks: {
                onReady: () => {
                    console.log('Brick pronto');
                },
                onSubmit: ({ selectedPaymentMethod, formData }) => {
                    return new Promise((resolve, reject) => {
                        console.log('Pagamento iniciado');
                        resolve();
                    });
                },
                onError: (error) => {
                    console.error(error);
                }
            },
            locale: 'pt-BR',
            customization: {
                paymentMethods: {
                    pix: 'all'
                },
                visual: {
                    style: {
                        theme: 'default'
                    }
                }
            }
        });

        return pixButton;
    }
}

// Cria uma instância global
window.mpService = new MercadoPagoService();