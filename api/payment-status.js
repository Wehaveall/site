// api/payment-status.js - Vercel Serverless Function SEGURA
const { MercadoPagoConfig, Payment } = require('mercadopago');

// ✅ CONFIGURAÇÃO SEGURA - Token via variável de ambiente
const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN || 'APP_USR-7601417945820618-013008-5b2554be4b9451d02eaed17ed992b76b-231065568',
    options: {
        timeout: 10000
    }
});

const payment = new Payment(client);

// ✅ DOMÍNIOS PERMITIDOS (CORS SEGURO)
const ALLOWED_ORIGINS = [
    'https://atalho.me',
    'https://www.atalho.me',
    'http://localhost:3000',
    'https://atalho.vercel.app'
];

// ✅ RATE LIMITING SIMPLES
const requestCounts = new Map();

function checkRateLimit(ip) {
    const now = Date.now();
    const windowStart = Math.floor(now / (15 * 60 * 1000)) * (15 * 60 * 1000); // 15 min window
    const key = `${ip}-${windowStart}`;
    
    const count = requestCounts.get(key) || 0;
    if (count >= 20) { // Máximo 20 verificações por 15 minutos
        return false;
    }
    
    requestCounts.set(key, count + 1);
    
    // Limpar entradas antigas
    for (const [k, v] of requestCounts.entries()) {
        if (k.split('-')[1] < windowStart - (15 * 60 * 1000)) {
            requestCounts.delete(k);
        }
    }
    
    return true;
}

// ✅ VALIDAÇÃO DE ID DE PAGAMENTO
function isValidPaymentId(paymentId) {
    // IDs do Mercado Pago são números com até 20 dígitos
    return /^\d{1,20}$/.test(paymentId);
}

module.exports = async (req, res) => {
    try {
        // ✅ CORS SEGURO - Apenas domínios permitidos
        const origin = req.headers.origin;
        if (origin && ALLOWED_ORIGINS.includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        } else {
            res.setHeader('Access-Control-Allow-Origin', 'https://atalho.me');
        }
        
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');
        res.setHeader('Access-Control-Max-Age', '86400'); // Cache CORS por 24h

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        if (req.method !== 'GET') {
            return res.status(405).json({ error: 'Método não permitido' });
        }

        // ✅ RATE LIMITING
        const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
        if (!checkRateLimit(clientIP)) {
            console.warn(`🚫 Rate limit excedido para verificação de status - IP: ${clientIP}`);
            return res.status(429).json({
                success: false,
                error: 'Muitas verificações. Aguarde 15 minutos.'
            });
        }

        // ✅ VALIDAÇÃO DE ENTRADA
        const { paymentId } = req.query;

        if (!paymentId) {
            return res.status(400).json({
                success: false,
                error: 'ID do pagamento é obrigatório'
            });
        }

        // ✅ VALIDAR FORMATO DO ID
        if (!isValidPaymentId(paymentId)) {
            console.warn(`🚨 ID de pagamento inválido de IP: ${clientIP} - ID: ${paymentId}`);
            return res.status(400).json({
                success: false,
                error: 'ID do pagamento inválido'
            });
        }

        console.log(`🔍 VERCEL SEGURO: Verificando status do pagamento ${paymentId} para IP: ${clientIP}`);

        // ✅ BUSCAR PAGAMENTO COM TIMEOUT
        const result = await payment.get({ id: paymentId });
        
        console.log(`📊 VERCEL SEGURO: Status do pagamento ${paymentId}: ${result.status}`);

        // ✅ RESPOSTA SEGURA (APENAS DADOS NECESSÁRIOS)
        return res.status(200).json({
            success: true,
            paymentId: result.id,
            status: result.status,
            statusDetail: result.status_detail,
            amount: result.transaction_amount,
            dateCreated: result.date_created,
            dateApproved: result.date_approved,
            // Não retornar dados sensíveis como emails, CPFs, etc.
        });

    } catch (error) {
        console.error(`❌ VERCEL SEGURO: Erro ao verificar pagamento ${req.query.paymentId}:`, error.message);
        
        // ✅ TRATAMENTO SEGURO DE ERROS
        if (error.status === 404) {
            return res.status(404).json({
                success: false,
                error: 'Pagamento não encontrado'
            });
        }
        
        // ✅ NÃO VAZAR DETALHES DO ERRO
        return res.status(500).json({
            success: false,
            error: 'Erro ao verificar status do pagamento'
        });
    }
}; 