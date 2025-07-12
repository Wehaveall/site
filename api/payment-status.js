// api/payment-status.js - Vercel Serverless Function SEGURA
const { MercadoPagoConfig, Payment } = require('mercadopago');

// ✅ CONFIGURAÇÃO SEGURA - Token APENAS via variável de ambiente
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN;

if (!accessToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN não está definido nas variáveis de ambiente.');
}

const client = new MercadoPagoConfig({
    accessToken: accessToken,
    options: {
        timeout: 10000
    }
});

const payment = new Payment(client);

// ✅ VERIFICAÇÃO DE AUTENTICAÇÃO (ADICIONADO)
const admin = require('firebase-admin');

// Inicializar Firebase Admin se não foi inicializado
function initializeFirebaseAdmin() {
    if (!admin.apps.length) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: "https://shortcut-6256b-default-rtdb.firebaseio.com"
            });
        } catch (error) {
            console.error('Falha na inicialização do Firebase Admin SDK:', error);
            // Lançar o erro impede que a função continue se o Firebase não puder ser inicializado
            throw new Error('Não foi possível inicializar a autenticação.');
        }
    }
    return admin;
}

async function verifyAuthToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Token de autenticação não fornecido ou mal formatado');
    }

    const idToken = authHeader.split('Bearer ')[1];
    const adminInstance = initializeFirebaseAdmin();

    try {
        const decodedToken = await adminInstance.auth().verifyIdToken(idToken);
        return decodedToken;
    } catch (error) {
        console.error(`Erro ao verificar token: ${error.message}`);
        throw new Error('Token de autenticação inválido');
    }
}

// ✅ DOMÍNIOS PERMITIDOS (CORS SEGURO)
const ALLOWED_ORIGINS = [
    'https://atalho.me',
    'https://www.atalho.me',
    'http://localhost:3000',
    'https://atalho.vercel.app'
];

// ✅ RATE LIMITING PERSISTENTE (FIRESTORE)
// Removida a inicialização duplicada do admin
async function checkRateLimit(ip) {
    try {
        const adminInstance = initializeFirebaseAdmin();
        const db = adminInstance.firestore();

        const now = Date.now();
        const windowStart = Math.floor(now / (15 * 60 * 1000)) * (15 * 60 * 1000); // 15 min window
        const rateLimitRef = db.collection('rate_limits').doc(ip);

        const doc = await rateLimitRef.get();
        const data = doc.exists ? doc.data() : {};

        // Limpar dados antigos
        if (data.windowStart && data.windowStart < windowStart - (15 * 60 * 1000)) {
            data.count = 0;
        }

        const count = data.windowStart === windowStart ? (data.count || 0) : 0;

        if (count >= 20) { // Máximo 20 verificações por 15 minutos
            return false;
        }

        // Atualizar contagem
        await rateLimitRef.set({
            count: count + 1,
            windowStart: windowStart,
            lastRequest: now
        });

        return true;
    } catch (error) {
        console.error('Erro no rate limiting:', error);
        return true; // Falha segura - permite requisição em caso de erro
    }
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
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, Authorization'); // Adicionar Authorization
        res.setHeader('Access-Control-Max-Age', '86400'); // Cache CORS por 24h

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        if (req.method !== 'GET') {
            return res.status(405).json({ error: 'Método não permitido' });
        }

        // ✅ VERIFICAÇÃO DE AUTENTICAÇÃO OBRIGATÓRIA
        let decodedToken;
        try {
            decodedToken = await verifyAuthToken(req.headers.authorization);
        } catch (authError) {
            console.warn(`🚫 Tentativa de acesso não autenticada para verificação de status: ${authError.message}`);
            return res.status(401).json({
                success: false,
                error: 'Autenticação necessária'
            });
        }

        // ✅ RATE LIMITING
        const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
        if (!(await checkRateLimit(clientIP))) {
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

        console.log(`🔍 VERCEL SEGURO: Verificando status do pagamento ${paymentId} para usuário ${decodedToken.uid}`);

        // ✅ BUSCAR PAGAMENTO COM TIMEOUT
        const result = await payment.get({ id: paymentId });

        // ✅ AUTORIZAÇÃO: VERIFICAR SE O PAGAMENTO PERTENCE AO USUÁRIO
        if (!result.metadata || result.metadata.user_id !== decodedToken.uid) {
            console.warn(`🚫 Acesso negado: Usuário ${decodedToken.uid} tentou ver o pagamento ${paymentId} que pertence a outro usuário.`);
            // Retornar 404 para não vazar a informação de que o pagamento existe.
            return res.status(404).json({
                success: false,
                error: 'Pagamento não encontrado'
            });
        }

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