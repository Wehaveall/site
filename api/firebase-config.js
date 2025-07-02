export default async function handler(req, res) {
    console.log('🚀 API firebase-config chamada');
    console.log('🌍 NODE_ENV:', process.env.NODE_ENV);
    console.log('🌍 VERCEL_ENV:', process.env.VERCEL_ENV);

    // Log de TODAS as variáveis de ambiente para debug
    const allEnvVars = Object.keys(process.env).filter(key => key.includes('FIREBASE'));
    console.log('🔍 QUALQUER coisa com firebase:', allEnvVars);
    
    // Verificar as específicas (SEM NEXT_PUBLIC_)
    const testVars = {
        'FIREBASE_API_KEY': process.env.FIREBASE_API_KEY,
        'FIREBASE_PROJECT_ID': process.env.FIREBASE_PROJECT_ID,
        'FIREBASE_AUTH_DOMAIN': process.env.FIREBASE_AUTH_DOMAIN,
    };
    
    console.log('🔍 Teste das 3 principais:', JSON.stringify(testVars, null, 2));

    // Configuração APENAS via variáveis de ambiente (SEM NEXT_PUBLIC_)
    const firebaseConfig = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        databaseURL: process.env.FIREBASE_DATABASE_URL,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
        measurementId: process.env.FIREBASE_MEASUREMENT_ID,
    };

    console.log('🔍 Configuração carregada:', {
        apiKey: firebaseConfig.apiKey ? firebaseConfig.apiKey.substring(0, 10) + '...' : 'MISSING',
        authDomain: firebaseConfig.authDomain || 'MISSING',
        projectId: firebaseConfig.projectId || 'MISSING'
    });

    // Verificar se as configurações críticas estão disponíveis
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        console.error('❌ Configurações críticas faltando!');
        return res.status(500).json({
            error: 'Configuração crítica faltando',
            details: 'apiKey ou projectId não disponível'
        });
    }

    // Retornar configuração
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    console.log('✅ Configuração Firebase enviada com sucesso');
    return res.status(200).json(firebaseConfig);
} 