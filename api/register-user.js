// api/register-user.js - Registro via servidor (sem CORS)
const admin = require('firebase-admin');

// Inicializar Firebase Admin (apenas uma vez)
if (!admin.apps.length) {
    try {
        // Tentar usar credenciais do ambiente primeiro
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: 'shortcut-6256b'
        });
    } catch (error) {
        console.log('Usando credenciais padrão...');
        // Fallback para credenciais padrão
        admin.initializeApp({
            projectId: 'shortcut-6256b'
        });
    }
}

export default async function handler(req, res) {
    // Permitir CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        const { email, password, language = 'pt-br' } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Email e senha são obrigatórios' 
            });
        }

        // Criar usuário via Firebase Admin SDK
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            emailVerified: false
        });

        console.log('✅ Usuário criado:', userRecord.uid);

        // Salvar dados adicionais no Firestore
        await admin.firestore().collection('users').doc(userRecord.uid).set({
            email: email,
            preferred_language: language,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            email_verified: false
        });

        // Gerar link de verificação de email
        const actionCodeSettings = {
            url: `https://atalho.me/email-verified?lang=${language}`,
            handleCodeInApp: false
        };

        const emailVerificationLink = await admin.auth()
            .generateEmailVerificationLink(email, actionCodeSettings);

        console.log('📧 Link de verificação gerado');

        // Resposta de sucesso
        res.status(200).json({
            success: true,
            message: 'Usuário criado com sucesso',
            uid: userRecord.uid,
            emailVerificationLink: emailVerificationLink,
            language: language
        });

    } catch (error) {
        console.error('❌ Erro no registro:', error);
        
        // Tratar erros específicos do Firebase
        let errorMessage = 'Erro interno do servidor';
        
        if (error.code === 'auth/email-already-exists') {
            errorMessage = 'Este email já está cadastrado';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Email inválido';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Senha muito fraca (mínimo 6 caracteres)';
        }

        res.status(400).json({
            success: false,
            error: errorMessage,
            code: error.code || 'unknown'
        });
    }
} 