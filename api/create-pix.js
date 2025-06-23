// api/create-pix.js - Vercel Serverless Function
const { MercadoPagoConfig, Payment } = require('mercadopago');

// Configuração do Mercado Pago (PRODUÇÃO)
const client = new MercadoPagoConfig({
    accessToken: 'APP_USR-7601417945820618-013008-5b2554be4b9451d02eaed17ed992b76b-231065568',
    options: {
        timeout: 5000,
        idempotencyKey: 'abc'
    }
});

const payment = new Payment(client);

module.exports = async (req, res) => {
    // Configura CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('🎯 VERCEL: Criando pagamento PIX...');

        const body = {
            transaction_amount: 49.90,
            description: 'Licença Anual do Atalho - Software de Expansão de Texto',
            payment_method_id: 'pix',
            payer: {
                email: 'cliente@atalho.me',
                first_name: 'Cliente',
                last_name: 'Atalho',
                identification: {
                    type: 'CPF',
                    number: '12345678901'
                }
            },
            notification_url: `${req.headers.origin || 'https://atalho.me'}/api/webhook`
        };

        const result = await payment.create({ body });
        
        console.log('✅ VERCEL: Pagamento PIX criado:', result.id);

        if (result.point_of_interaction?.transaction_data) {
            const qrData = result.point_of_interaction.transaction_data;
            
            return res.status(200).json({
                success: true,
                paymentId: result.id,
                qrCodeBase64: qrData.qr_code_base64,
                qrCodeText: qrData.qr_code,
                expirationDate: result.date_of_expiration,
                status: result.status
            });
        } else {
            console.error('❌ VERCEL: QR Code não gerado');
            return res.status(400).json({
                success: false,
                error: 'QR Code não foi gerado pelo Mercado Pago'
            });
        }

    } catch (error) {
        console.error('❌ VERCEL: Erro ao criar pagamento:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor: ' + error.message
        });
    }
}; 