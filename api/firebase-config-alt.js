// API alternativa para configuração do Firebase
// Esta API não depende das variáveis NEXT_PUBLIC_FIREBASE_* problemáticas
// Extrai as configurações do Firebase Admin SDK que já está funcionando

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
        console.log('🔥 Firebase Config Alt - Iniciando...');

        // Tentar diferentes fontes de configuração
        let firebaseConfig = null;

        // Fonte 1: Variáveis diretas (fallback)
        console.log('🔍 Tentando variáveis diretas...');
        const directConfig = {
            apiKey: process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.FIREBASE_APP_ID || process.env.NEXT_PUBLIC_FIREBASE_APP_ID
        };

        console.log('🔍 Config direto:', {
            apiKey: directConfig.apiKey ? `${directConfig.apiKey.substring(0, 10)}...` : 'MISSING',
            projectId: directConfig.projectId || 'MISSING'
        });

        if (directConfig.apiKey && directConfig.projectId) {
            firebaseConfig = directConfig;
            console.log('✅ Usando configuração direta');
        }

        // Fonte 2: Tentar extrair do Firebase Admin SDK
        if (!firebaseConfig) {
            console.log('🔍 Tentando extrair do Firebase Admin SDK...');
            try {
                const admin = require('firebase-admin');
                
                if (admin.apps.length > 0) {
                    const app = admin.app();
                    const options = app.options;
                    
                    if (options.projectId) {
                        firebaseConfig = {
                            apiKey: "AIzaSyCsIbyCkHx_E5VHQXnHZYmoZSrpnuPrPUQ", // Conhecida do projeto
                            authDomain: `${options.projectId}.firebaseapp.com`,
                            projectId: options.projectId,
                            storageBucket: `${options.projectId}.firebasestorage.app`,
                            messagingSenderId: "1003854506710", // Conhecida do projeto
                            appId: "1:1003854506710:web:ba8daa7071f8b7e8df96f9" // Conhecida do projeto
                        };
                        console.log('✅ Configuração extraída do Admin SDK');
                    }
                }
            } catch (adminError) {
                console.log('⚠️ Admin SDK não disponível:', adminError.message);
            }
        }

        // Fonte 3: Configuração fixa conhecida (última opção)
        if (!firebaseConfig) {
            console.log('🔍 Usando configuração fixa conhecida...');
            firebaseConfig = {
                apiKey: "AIzaSyCsIbyCkHx_E5VHQXnHZYmoZSrpnuPrPUQ",
                authDomain: "shortcut-6256b.firebaseapp.com",
                projectId: "shortcut-6256b",
                storageBucket: "shortcut-6256b.firebasestorage.app",
                messagingSenderId: "1003854506710",
                appId: "1:1003854506710:web:ba8daa7071f8b7e8df96f9"
            };
            console.log('✅ Usando configuração fixa');
        }

        // Validar configuração final
        if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
            throw new Error('Configuração inválida - apiKey ou projectId faltando');
        }

        console.log('✅ Configuração final validada:', {
            apiKey: `${firebaseConfig.apiKey.substring(0, 10)}...`,
            projectId: firebaseConfig.projectId,
            authDomain: firebaseConfig.authDomain
        });

        return res.status(200).json(firebaseConfig);

    } catch (error) {
        console.error('❌ Erro na API Firebase Config Alt:', error);
        return res.status(500).json({
            error: 'Falha ao obter configuração do Firebase',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
} 