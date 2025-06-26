const admin = require('firebase-admin');

// Inicializar Firebase Admin (se ainda não foi inicializado)
if (!admin.apps.length) {
    try {
        const serviceAccount = require('../credentials/shortcut-6256b-firebase-adminsdk-afo2j-cabf738bfe.json');
        
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: 'shortcut-6256b'
        });
        
        console.log('✅ Firebase Admin inicializado para sincronização');
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
        const { email } = req.body;
        
        if (!email || email === 'sync-request') {
            // Sincronizar todos os usuários com email_verified = false
            console.log('🔄 Sincronizando todos os usuários pendentes...');
            
            const usersQuery = await db.collection('users')
                .where('email_verified', '==', false)
                .limit(50) // Limitar para evitar timeout
                .get();
            
            let syncCount = 0;
            const results = [];
            
            for (const userDoc of usersQuery.docs) {
                const userData = userDoc.data();
                try {
                    const userRecord = await admin.auth().getUser(userDoc.id);
                    
                    if (userRecord.emailVerified && !userData.email_verified) {
                        await userDoc.ref.update({
                            email_verified: true,
                            account_status: 'active',
                            email_verified_at: admin.firestore.FieldValue.serverTimestamp(),
                            updated_at: admin.firestore.FieldValue.serverTimestamp()
                        });
                        
                        syncCount++;
                        results.push({
                            uid: userDoc.id,
                            email: userData.email,
                            synced: true
                        });
                        
                        console.log(`✅ Sincronizado: ${userData.email}`);
                    }
                } catch (authError) {
                    console.warn(`⚠️ Usuário ${userDoc.id} não encontrado no Auth`);
                }
            }
            
            return res.status(200).json({
                success: true,
                message: `${syncCount} usuários sincronizados`,
                syncCount: syncCount,
                results: results
            });
        }
        
        console.log(`🔄 Sincronizando verificação de email para: ${email}`);
        
        // Buscar usuário no Firebase Auth pelo email
        const userRecord = await admin.auth().getUserByEmail(email);
        console.log(`📧 Status no Auth - emailVerified: ${userRecord.emailVerified}`);
        
        // Atualizar dados no Firestore
        const userRef = db.collection('users').doc(userRecord.uid);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'Usuário não encontrado no Firestore' });
        }
        
        const currentData = userDoc.data();
        console.log(`📊 Status atual no Firestore - email_verified: ${currentData.email_verified}`);
        
        // Só atualizar se houve mudança
        if (currentData.email_verified !== userRecord.emailVerified) {
            await userRef.update({
                email_verified: userRecord.emailVerified,
                account_status: userRecord.emailVerified ? 'active' : 'pending_verification',
                email_verified_at: userRecord.emailVerified ? admin.firestore.FieldValue.serverTimestamp() : null,
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`✅ Status sincronizado! email_verified: ${currentData.email_verified} → ${userRecord.emailVerified}`);
        } else {
            console.log(`ℹ️ Status já sincronizado - email_verified: ${userRecord.emailVerified}`);
        }
        
        res.status(200).json({ 
            success: true, 
            message: 'Status de verificação sincronizado',
            uid: userRecord.uid,
            email: email,
            emailVerified: userRecord.emailVerified,
            updated: currentData.email_verified !== userRecord.emailVerified
        });
        
    } catch (error) {
        console.error('❌ Erro na sincronização:', error);
        
        let errorMessage = 'Erro interno do servidor';
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'Usuário não encontrado';
        }
        
        res.status(500).json({ 
            error: errorMessage,
            details: error.message 
        });
    }
}; 