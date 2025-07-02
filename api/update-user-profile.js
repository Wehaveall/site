const admin = require('firebase-admin');

// Função para inicializar o Firebase Admin SDK de forma segura
function initializeFirebaseAdmin() {
    if (!admin.apps.length) {
        try {
            // Usar variáveis de ambiente (mesma abordagem do create-user.js)
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: "https://shortcut-6256b-default-rtdb.firebaseio.com"
            });
            console.log('Firebase Admin SDK inicializado com sucesso.');
        } catch (error) {
            console.error('Falha na inicialização do Firebase Admin SDK:', error);
            throw error;
        }
    }
    return admin;
}

// Função para validar e extrair UID do token de autenticação
async function validateAuthToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Token de autorização não fornecido');
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    
    try {
        const adminInstance = initializeFirebaseAdmin();
        const decodedToken = await adminInstance.auth().verifyIdToken(idToken);
        return decodedToken.uid;
    } catch (error) {
        console.error('Erro ao verificar token:', error);
        throw new Error('Token de autorização inválido');
    }
}

// Função para sanitizar dados de entrada
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    // Remove caracteres perigosos que podem ser usados para XSS
    return input
        .replace(/[<>]/g, '') // Remove < e >
        .replace(/javascript:/gi, '') // Remove javascript:
        .replace(/on\w+=/gi, '') // Remove event handlers como onclick=
        .trim()
        .substring(0, 255); // Limita o tamanho
}

export default async function handler(req, res) {
    // Headers CORS mais restritivos
    res.setHeader('Access-Control-Allow-Origin', 'https://atalho.me');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }
    
    try {
        // CORREÇÃO CRÍTICA: Verificar token de autenticação ao invés de confiar no UID do cliente
        const authHeader = req.headers.authorization;
        const authenticatedUid = await validateAuthToken(authHeader);
        
        const { name, phone, company } = req.body;
        
        console.log(`[API] Atualizando perfil para usuário autenticado: ${authenticatedUid}`);
        
        // Inicializar admin e obter referência do Firestore
        const adminInstance = initializeFirebaseAdmin();
        const db = adminInstance.firestore();
        const userRef = db.collection('users').doc(authenticatedUid);
        
        // Preparar dados para atualização com sanitização
        const updateData = {
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        };
        
        if (name) updateData.Nome = sanitizeInput(name); // Mantendo campo "Nome" para compatibilidade
        if (phone) updateData.phone = sanitizeInput(phone);
        if (company) updateData.country = sanitizeInput(company); // Mantendo "country" para compatibilidade
        
        // Atualizar apenas o documento do usuário autenticado
        await userRef.set(updateData, { merge: true });
        
        console.log(`✅ Perfil atualizado com sucesso para usuário ${authenticatedUid}`);
        
        res.status(200).json({ 
            success: true, 
            message: 'Perfil atualizado com sucesso',
            uid: authenticatedUid
        });
        
    } catch (error) {
        console.error('❌ Erro ao atualizar perfil:', error);
        
        // Retornar erro apropriado baseado no tipo de erro
        if (error.message.includes('Token') || error.message.includes('autorização')) {
            return res.status(401).json({ 
                error: 'Não autorizado',
                details: error.message 
            });
        }
        
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: 'Erro ao processar solicitação'
        });
    }
}; 