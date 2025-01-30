class MercadoPagoService {
    constructor() {
        // Use your actual Mercado Pago credentials
        this.publicKey = 'TEST-f6d0456b-ff4f-4c22-afef-53b2c4d4ec35';
        this.accessToken = 'TEST-7601417945820618-013008-87f0900af129b320e5d12f6fabe39620-231065568';
    }

    async createPaymentPreference() {
        try {
            const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
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
                        success: 'https://seusite.com/success.html',
                        failure: 'https://seusite.com/failure.html',
                        pending: 'https://seusite.com/pending.html'
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
}