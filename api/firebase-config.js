// API única e simplificada para configuração do Firebase
// Sempre usa o Firebase Admin SDK como fonte confiável, nunca depende de variáveis do Vercel

export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-client-info, apikey, X-CSRF-Token');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        console.log('🔥 Firebase Config - Método simplificado');
        
        let firebaseConfig = null;

        // Método 1: Tentar extrair do Firebase Admin SDK (fonte confiável)
        try {
            console.log('🔍 Extraindo configuração do Firebase Admin SDK...');
            const admin = require('firebase-admin');
            
            if (admin.apps.length > 0) {
                const app = admin.app();
                const options = app.options;
                
                if (options.projectId) {
                    firebaseConfig = {
                        apiKey: "AIzaSyCsIbyCkHx_E5VHQXnHZYmoZSrpnuPrPUQ",
                        authDomain: `${options.projectId}.firebaseapp.com`,
                        projectId: options.projectId,
                        storageBucket: `${options.projectId}.firebasestorage.app`,
                        messagingSenderId: "1003854506710",
                        appId: "1:1003854506710:web:ba8daa7071f8b7e8df96f9"
                    };
                    console.log('✅ Configuração extraída do Admin SDK');
                }
            }
        } catch (adminError) {
            console.log('⚠️ Admin SDK não disponível:', adminError.message);
        }

        // Método 2: Configuração conhecida do projeto (fallback confiável)
        if (!firebaseConfig) {
            console.log('🔍 Usando configuração conhecida do projeto...');
            firebaseConfig = {
                apiKey: "AIzaSyCsIbyCkHx_E5VHQXnHZYmoZSrpnuPrPUQ",
                authDomain: "shortcut-6256b.firebaseapp.com",
                projectId: "shortcut-6256b",
                storageBucket: "shortcut-6256b.firebasestorage.app",
                messagingSenderId: "1003854506710",
                appId: "1:1003854506710:web:ba8daa7071f8b7e8df96f9"
            };
            console.log('✅ Usando configuração conhecida');
        }

        // Validação final
        if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
            throw new Error('Configuração inválida - dados críticos faltando');
        }

        console.log('✅ Configuração validada:', {
            projectId: firebaseConfig.projectId,
            authDomain: firebaseConfig.authDomain
        });

        return res.status(200).json(firebaseConfig);

    } catch (error) {
        console.error('❌ Erro na API Firebase Config:', error);
        return res.status(500).json({
            error: 'Falha ao obter configuração do Firebase',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
} 