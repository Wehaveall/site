// api/simulate-payment.js - Vercel Serverless Function
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

    const { paymentId } = req.query;

    if (!paymentId) {
        return res.status(400).json({
            success: false,
            error: 'Payment ID é obrigatório'
        });
    }

    try {
        console.log(`🧪 VERCEL: Simulando aprovação do pagamento ${paymentId}`);

        // Simula resposta de pagamento aprovado
        const simulatedResponse = {
            success: true,
            paymentId: paymentId,
            status: 'approved',
            statusDetail: 'accredited',
            amount: 49.90,
            dateCreated: new Date().toISOString(),
            dateApproved: new Date().toISOString(),
            isSimulation: true
        };

        console.log(`✅ VERCEL: Pagamento ${paymentId} simulado como aprovado`);

        return res.status(200).json(simulatedResponse);

    } catch (error) {
        console.error(`❌ VERCEL: Erro na simulação do pagamento ${paymentId}:`, error);
        return res.status(500).json({
            success: false,
            error: 'Erro na simulação: ' + error.message
        });
    }
}; 