const admin = require('firebase-admin');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

// Rate limiting para criação de conta
const createAccountLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 5, // limite de 5 contas por IP por hora
    message: 'Muitas contas criadas a partir deste IP. Tente novamente em 1 hora.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Função para sanitizar dados de entrada com validação mais rigorosa
function sanitizeInput(input, type = 'text') {
    if (typeof input !== 'string') return input;
    
    const patterns = {
        email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        name: /^[a-zA-ZÀ-ÿ\s'-]{2,100}$/,
        phone: /^\+?[\d\s-()]{8,20}$/
    };
    
    if (patterns[type]) {
        if (!patterns[type].test(input)) {
            throw new Error(`Formato inválido para ${type}`);
        }
        return input.trim();
    }
    
    // Sanitização padrão para texto
    return input
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .replace(/['"]/g, '')
        .trim()
        .substring(0, 255);
}

// Função para validar senha de forma mais segura
function validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const errors = [];
    if (password.length < minLength) errors.push('A senha deve ter pelo menos 8 caracteres');
    if (!hasUpperCase) errors.push('A senha deve conter pelo menos uma letra maiúscula');
    if (!hasLowerCase) errors.push('A senha deve conter pelo menos uma letra minúscula');
    if (!hasNumbers) errors.push('A senha deve conter pelo menos um número');
    if (!hasSpecialChar) errors.push('A senha deve conter pelo menos um caractere especial');
    
    return errors;
}

// Função para inicializar o Firebase Admin SDK de forma segura
function initializeFirebaseAdmin() {
    if (!admin.apps.length) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: process.env.FIREBASE_DATABASE_URL
            });
        } catch (error) {
            console.error('Erro na inicialização do Firebase Admin');
            throw new Error('Erro interno do servidor');
        }
    }
    return admin;
}

export default async function handler(req, res) {
    // Headers CORS mais restritivos
    const allowedOrigin = 'https://atalho.me';
    const origin = req.headers.origin;
    
    if (origin !== allowedOrigin) {
        return res.status(403).json({ error: 'Origem não autorizada' });
    }
    
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Vary', 'Origin');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Aplicar rate limiting
    try {
        await createAccountLimiter(req, res);
    } catch (error) {
        return res.status(429).json({ error: error.message });
    }
    
    // Garante que só aceitamos requisições POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { email, password, name, phone, company, language = 'pt-br' } = req.body;

    try {
        // Validação e sanitização dos dados
        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Dados insuficientes' });
        }

        // Validar email
        const sanitizedEmail = sanitizeInput(email, 'email').toLowerCase();
        
        // Validar senha
        const passwordErrors = validatePassword(password);
        if (passwordErrors.length > 0) {
            return res.status(400).json({ error: 'Senha inválida', details: passwordErrors });
        }

        // Sanitizar outros campos
        const sanitizedName = sanitizeInput(name, 'name');
        const sanitizedPhone = phone ? sanitizeInput(phone, 'phone') : null;
        const sanitizedCompany = company ? sanitizeInput(company) : null;

        // Inicializa o admin
        const adminInstance = initializeFirebaseAdmin();
        const db = adminInstance.firestore();

        // Criar usuário com dados sanitizados
        const userRecord = await adminInstance.auth().createUser({
            email: sanitizedEmail,
            password: password,
            displayName: sanitizedName,
            emailVerified: false,
        });

        // Preparar dados para Firestore
        const customerData = {
            Nome: sanitizedName,
            email: sanitizedEmail,
            phone: sanitizedPhone,
            country: sanitizedCompany || "Brasil",
            
            user: {
                uid: userRecord.uid,
                email: sanitizedEmail,
                displayName: sanitizedName
            },
            
            terms_accepted: true,
            terms_accepted_at: new Date().toISOString(),
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            email_verified: false,
            account_status: 'pending_verification',
            preferred_language: language,
            
            license_active: false,
            license_type: null,
            payment_status: 'pending',
            pay_method: null,
            sub_start: null,
            sub_end: null,
            last_payment_date: null,
            active_machines: 0,
            
            id: userRecord.uid
        };

        // Salvar no Firestore
        await db.collection('users').doc(userRecord.uid).set(customerData);

        // Gerar link de verificação de email
        const actionCodeSettings = {
            url: `https://atalho.me/emailHandler.html?email=${sanitizedEmail}`,
            handleCodeInApp: true
        };

        const emailLink = await adminInstance.auth().generateEmailVerificationLink(
            sanitizedEmail,
            actionCodeSettings
        );

        return res.status(201).json({
            success: true,
            uid: userRecord.uid,
            verificationLink: emailLink
        });

    } catch (error) {
        console.error('Erro ao criar usuário:', error.code || 'unknown_error');
        
        if (error.code === 'auth/email-already-exists') {
            return res.status(409).json({ error: 'Email já cadastrado' });
        }
        
        return res.status(500).json({ error: 'Erro ao criar usuário' });
    }
} 