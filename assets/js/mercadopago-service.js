// VERSÃO CORRIGIDA - SUBSTITUA O ARQUIVO COMPLETAMENTE - 2025-02-28

class MercadoPagoService {
    constructor() {
        // IMPORTANTE: Log de inicialização para confirmar que estamos usando a versão correta
        console.log('Inicializando MercadoPagoService - VERSÃO CORRIGIDA');

        // Apontando para o servidor local
        this.apiBaseUrl = 'http://localhost:3000/api';

        // Credenciais de PRODUÇÃO (apenas para referência, o backend usa o Access Token)
        this.publicKey = 'APP_USR-eb7579bb-3460-43d1-83eb-1010a62d1bd2';
        this.accessToken = 'APP_USR-7601417945820618-013008-5b2554be4b9451d02eaed17ed992b76b-231065568';

        // Log para confirmar URL base
        console.log('API Base URL:', this.apiBaseUrl);
    }

    async createPaymentPreference() {
        try {
            console.log('Criando preferência de pagamento...');
            console.log('URL sendo acessada:', `${this.apiBaseUrl}/create-preference`);

            const response = await fetch(`${this.apiBaseUrl}/create-preference`, {
                method: 'POST',
                headers: {
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
                    ]
                })
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP! status: ${response.status}`);
            }

            const preferenceData = await response.json();
            return preferenceData.id;
        } catch (error) {
            console.error('Erro ao criar preferência de pagamento:', error);
            throw error;
        }
    }

    async createPixPayment() {
        try {
            console.log('Criando pagamento PIX...');

            // ATENÇÃO: Log exato da URL - isso ajudará a diagnosticar o problema
            const pixUrl = `${this.apiBaseUrl}/create-pix`;
            console.log('URL EXATA sendo acessada:', pixUrl);

            const response = await fetch(pixUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: 49.90,
                    description: 'Licença Anual do Atalho'
                })
            });

            console.log('Resposta recebida do servidor:', response.status, response.statusText);

            if (!response.ok) {
                throw new Error(`Erro HTTP! status: ${response.status}`);
            }

            const paymentData = await response.json();
            console.log('Dados do pagamento PIX:', paymentData);

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
                console.error('Resposta inválida do servidor:', paymentData);
                return { success: false, error: 'Falha ao gerar QR code PIX' };
            }
        } catch (error) {
            console.error('Erro ao criar pagamento PIX:', error);
            return { success: false, error: error.message };
        }
    }

    async checkPaymentStatus(paymentId) {
        try {
            console.log(`Verificando status do pagamento ${paymentId}...`);

            // ATENÇÃO: Log exato da URL
            const statusUrl = `${this.apiBaseUrl}/payment-status/${paymentId}`;
            console.log('URL EXATA sendo acessada:', statusUrl);

            const response = await fetch(statusUrl);

            console.log('Resposta recebida do servidor:', response.status, response.statusText);

            if (!response.ok) {
                throw new Error(`Erro HTTP! status: ${response.status}`);
            }

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