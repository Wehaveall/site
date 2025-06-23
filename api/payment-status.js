// api/payment-status.js - Vercel Serverless Function
const { MercadoPagoConfig, Payment } = require('mercadopago');

// Configuração do Mercado Pago (PRODUÇÃO)
const client = new MercadoPagoConfig({
    accessToken: 'APP_USR-7601417945820618-013008-5b2554be4b9451d02eaed17ed992b76b-231065568',
    options: {
        timeout: 5000
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

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { paymentId } = req.query;

    if (!paymentId) {
        return res.status(400).json({
            success: false,
            error: 'Payment ID é obrigatório'
        });
    }

    try {
        console.log(`🔍 VERCEL: Verificando status do pagamento ${paymentId}`);

        const result = await payment.get({ id: paymentId });
        
        console.log(`📊 VERCEL: Status do pagamento ${paymentId}: ${result.status}`);

        return res.status(200).json({
            success: true,
            paymentId: result.id,
            status: result.status,
            statusDetail: result.status_detail,
            amount: result.transaction_amount,
            dateCreated: result.date_created,
            dateApproved: result.date_approved
        });

    } catch (error) {
        console.error(`❌ VERCEL: Erro ao verificar pagamento ${paymentId}:`, error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao verificar status do pagamento: ' + error.message
        });
    }
}; 