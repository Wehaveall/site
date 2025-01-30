// mercadopago-service.js

class MercadoPagoService {
    constructor() {
        // Inicializa o SDK do Mercado Pago com sua chave pública
        this.publicKey = 'TEST-f6d0456b-ff4f-4c22-afef-53b2c4d4ec35';
        this.mercadopago = new MercadoPago(this.publicKey, {
            locale: 'pt-BR'
        });

        // Configuração de preferência de pagamento
        this.preference = {
            items: [{
                id: 'atalho-app-license',
                title: 'Licença Anual - Atalho App',
                quantity: 1,
                unit_price: 49.90,
                currency_id: 'BRL'
            }],
            payment_methods: {
                default_payment_method_id: 'pix',
                excluded_payment_methods: [
                    { id: 'credit_card' },
                    { id: 'debit_card' },
                    { id: 'bank_transfer' }
                ],
                installments: 1
            },
            back_urls: {
                success: window.location.origin + '/success.html',
                failure: window.location.origin + '/failure.html'
            },
            auto_return: 'approved'
        };
    }

    async createPixPayment() {
        try {
            // Criar preferência de pagamento
            const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer TEST-7601417945820618-013008-87f0900af129b320e5d12f6fabe39620-231065568',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.preference)
            });

            const preference = await response.json();

            // Criar pagamento PIX
            const pixResponse = await fetch('https://api.mercadopago.com/v1/payments', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer TEST-7601417945820618-013008-87f0900af129b320e5d12f6fabe39620-231065568',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    transaction_amount: 49.90,
                    payment_method_id: 'pix',
                    description: 'Licença Anual - Atalho App',
                    payer: {
                        email: 'test@test.com'
                    }
                })
            });

            const pixData = await pixResponse.json();

            if (pixData.point_of_interaction?.transaction_data?.qr_code_base64) {
                return {
                    success: true,
                    qrCodeBase64: pixData.point_of_interaction.transaction_data.qr_code_base64,
                    qrCode: pixData.point_of_interaction.transaction_data.qr_code,
                    paymentId: pixData.id
                };
            } else {
                throw new Error('Dados do QR Code não encontrados');
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
        try {
            const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: {
                    'Authorization': 'Bearer TEST-7601417945820618-013008-87f0900af129b320e5d12f6fabe39620-231065568'
                }
            });

            const data = await response.json();
            return {
                success: true,
                status: data.status
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