const admin = require('firebase-admin');
const path = require('path');

// Inicializar Firebase Admin (se ainda não foi inicializado)
if (!admin.apps.length) {
    try {
        // Tentar usar variáveis de ambiente primeiro (Vercel)
        if (process.env.FIREBASE_PRIVATE_KEY) {
            console.log('🔧 Usando configuração via variáveis de ambiente');
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
                }),
                projectId: process.env.FIREBASE_PROJECT_ID
            });
        } else {
            // Fallback para arquivo local (desenvolvimento)
            console.log('🔧 Usando configuração via arquivo local');
            const serviceAccount = require('../credentials/shortcut-6256b-firebase-adminsdk-afo2j-cabf738bfe.json');
            
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: 'shortcut-6256b'
            });
        }
    } catch (error) {
        console.error('❌ Erro ao inicializar Firebase Admin:', error);
        throw error;
    }
}

const db = admin.firestore();

module.exports = async (req, res) => {
    // Headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }
    
    try {
        const { uid, name, phone, company } = req.body;
        
        if (!uid) {
            return res.status(400).json({ error: 'UID do usuário é obrigatório' });
        }
        
        // Atualizar dados do usuário no Firestore
        const userRef = db.collection('users').doc(uid);
        
        const updateData = {
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        };
        
        if (name) updateData.name = name;
        if (phone) updateData.phone = phone;
        if (company) updateData.company = company;
        
        await userRef.set(updateData, { merge: true });
        
        console.log(`✅ Perfil atualizado para usuário ${uid}`);
        
        res.status(200).json({ 
            success: true, 
            message: 'Perfil atualizado com sucesso',
            uid: uid
        });
        
    } catch (error) {
        console.error('❌ Erro ao atualizar perfil:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: error.message 
        });
    }
}; 