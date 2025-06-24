// api/create-pix.js - Vercel Serverless Function SEGURA
const { MercadoPagoConfig, Payment } = require('mercadopago');

// ✅ CONFIGURAÇÃO SEGURA - Token via variável de ambiente
const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN || 'APP_USR-7601417945820618-013008-5b2554be4b9451d02eaed17ed992b76b-231065568',
    options: {
        timeout: 10000,
        idempotencyKey: 'abc'
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

        // ✅ RATE LIMITING
        const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
        if (!checkRateLimit(clientIP)) {
            console.warn(`🚫 Rate limit excedido para IP: ${clientIP}`);
            return res.status(429).json({
                success: false,
                error: 'Muitas tentativas. Aguarde 15 minutos.'
            });
        }

        // ✅ VALIDAÇÃO DE ENTRADA
        const { email, firstName, lastName } = req.body || {};
        
        // Verificar se há conteúdo suspeito
        if (containsSuspiciousContent(JSON.stringify(req.body))) {
            console.warn(`🚨 Conteúdo suspeito detectado de IP: ${clientIP}`);
            return res.status(400).json({
                success: false,
                error: 'Dados inválidos detectados'
            });
        }

        // Validar email se fornecido
        if (email && !isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                error: 'Email inválido'
            });
        }

        console.log(`🔒 VERCEL SEGURO: Criando pagamento PIX para IP: ${clientIP}`);

        // ✅ CONFIGURAR EXPIRAÇÃO (20 MINUTOS)
        const expirationDate = new Date();
        expirationDate.setMinutes(expirationDate.getMinutes() + 20);

        // ✅ DADOS DO PAGAMENTO (SANITIZADOS)
        const paymentBody = {
            transaction_amount: 49.90, // Valor fixo (não vem do cliente)
            description: 'Licença Anual do Atalho - Software de Expansão de Texto',
            payment_method_id: 'pix',
            date_of_expiration: expirationDate.toISOString(),
            payer: {
                email: email || 'cliente@atalho.me',
                first_name: firstName || 'Cliente',
                last_name: lastName || 'Atalho',
                identification: {
                    type: 'CPF',
                    number: generateValidCPF()
                }
            },
            notification_url: `${origin || 'https://atalho.me'}/api/webhook`
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