// api/create-pix.js - Vercel Serverless Function SEGURA
const { MercadoPagoConfig, Payment } = require('mercadopago');
const admin = require('firebase-admin');

// ✅ CONFIGURAÇÃO SEGURA - Token via variável de ambiente
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

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

// ✅ INICIALIZAR FIREBASE ADMIN (PARA VERIFICAÇÃO DE AUTENTICAÇÃO)
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
        }
    }
    return admin;
}

// ✅ VERIFICAÇÃO DE AUTENTICAÇÃO
async function verifyAuthToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Token de autenticação não fornecido');
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    const adminInstance = initializeFirebaseAdmin();
    
    try {
        const decodedToken = await adminInstance.auth().verifyIdToken(idToken);
        return decodedToken;
    } catch (error) {
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

// ✅ RATE LIMITING SIMPLES
const requestCounts = new Map();

function checkRateLimit(ip) {
    const now = Date.now();
    const windowStart = Math.floor(now / (15 * 60 * 1000)) * (15 * 60 * 1000); // 15 min window
    const key = `${ip}-${windowStart}`;
    
    const count = requestCounts.get(key) || 0;
    if (count >= 10) { // Máximo 10 tentativas por 15 minutos
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

// ✅ VALIDAÇÃO DE EMAIL
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
}

// ✅ DETECÇÃO DE CONTEÚDO SUSPEITO
function containsSuspiciousContent(value) {
    if (typeof value !== 'string') return false;
    
    const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /eval\s*\(/i,
        /document\./i,
        /window\./i,
        /bitcoin|crypto|btc|eth/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(value));
}

// Função para gerar CPF válido para testes
function generateValidCPF() {
    return '11144477735';
}

// ✅ GERAÇÃO DE CHAVE DE IDEMPOTÊNCIA SEGURA
function generateSecureIdempotencyKey() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `atalho-${timestamp}-${random}`;
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
        
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');
        res.setHeader('Access-Control-Max-Age', '86400'); // Cache CORS por 24h

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Método não permitido' });
        }

        // ✅ VERIFICAÇÃO DE AUTENTICAÇÃO (CORRIGIDO: obrigatória)
        let decodedToken;
        try {
            decodedToken = await verifyAuthToken(req.headers.authorization);
        } catch (authError) {
            console.warn(`🚫 Tentativa de acesso não autenticada: ${authError.message}`);
            return res.status(401).json({
                success: false,
                error: 'Autenticação necessária para criar pagamento'
            });
        }

        // ✅ RATE LIMITING
        const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
        if (!checkRateLimit(clientIP)) {
            console.warn(`🚫 Rate limit excedido para IP: ${clientIP}`);
            return res.status(429).json({
                success: false,
                error: 'Muitas tentativas. Aguarde 15 minutos.'
            });
        }

        // ✅ DADOS DO USUÁRIO AUTENTICADO (não mais do body da requisição)
        const userEmail = decodedToken.email;
        const userName = decodedToken.name || 'Cliente';
        const userId = decodedToken.uid;
        
        console.log(`🔒 VERCEL SEGURO: Criando pagamento PIX para usuário: ${userId} (${userEmail})`);

        // ✅ CONFIGURAR EXPIRAÇÃO (20 MINUTOS)
        const expirationDate = new Date();
        expirationDate.setMinutes(expirationDate.getMinutes() + 20);

        // ✅ DADOS DO PAGAMENTO (USANDO DADOS DO USUÁRIO AUTENTICADO)
        const paymentBody = {
            transaction_amount: 49.90, // Valor fixo (não vem do cliente)
            description: 'Licença Anual do Atalho - Software de Expansão de Texto',
            payment_method_id: 'pix',
            date_of_expiration: expirationDate.toISOString(),
            payer: {
                email: userEmail,
                first_name: userName.split(' ')[0] || 'Cliente',
                last_name: userName.split(' ').slice(1).join(' ') || 'Atalho',
                identification: {
                    type: 'CPF',
                    number: generateValidCPF()
                }
            },
            notification_url: `${origin || 'https://atalho.me'}/api/webhook`,
            metadata: {
                user_id: userId // Associar pagamento ao usuário
            }
        };

        // ✅ CRIAR PAGAMENTO COM IDEMPOTÊNCIA
        const result = await payment.create({ 
            body: paymentBody,
            requestOptions: {
                idempotencyKey: generateSecureIdempotencyKey()
            }
        });
        
        console.log(`✅ VERCEL SEGURO: Pagamento PIX criado: ${result.id}`);

        // ✅ RESPOSTA SEGURA (APENAS DADOS NECESSÁRIOS)
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
            console.error('❌ VERCEL SEGURO: QR Code não gerado');
            return res.status(400).json({
                success: false,
                error: 'Erro na geração do QR Code'
            });
        }

    } catch (error) {
        console.error('❌ VERCEL SEGURO: Erro ao criar pagamento:', error.message);
        
        // ✅ NÃO VAZAR DETALHES DO ERRO
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
}; 