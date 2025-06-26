// api/register-user.js - Registro via servidor (sem CORS)
const admin = require('firebase-admin');

// Inicializar Firebase Admin (apenas uma vez)
if (!admin.apps.length) {
    try {
        // Carregar credenciais do arquivo diretamente
        const serviceAccount = require('../credentials/shortcut-6256b-firebase-adminsdk-afo2j-cabf738bfe.json');
        
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: 'shortcut-6256b'
        });
        
        console.log('✅ Firebase Admin inicializado com credenciais do arquivo');
    } catch (error) {
        console.error('❌ Erro ao inicializar Firebase Admin:', error);
        throw error;
    }
}

module.exports = async function handler(req, res) {
    console.log('🚀 API register-user chamada:', req.method);
    
    // Permitir CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        console.log('✅ Preflight request - retornando 200');
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        console.log('❌ Método não permitido:', req.method);
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        console.log('📝 Body recebido:', req.body);
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
        console.error('❌ Stack trace:', error.stack);
        
        // Tratar erros específicos do Firebase
        let errorMessage = 'Erro interno do servidor';
        let statusCode = 500;
        
        if (error.code === 'auth/email-already-exists') {
            errorMessage = 'Este email já está cadastrado';
            statusCode = 400;
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Email inválido';
            statusCode = 400;
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Senha muito fraca (mínimo 6 caracteres)';
            statusCode = 400;
        } else if (error.message.includes('credentials')) {
            errorMessage = 'Erro de configuração do servidor';
            statusCode = 500;
        }

        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            code: error.code || 'unknown',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
} 