export default async function handler(req, res) {
    console.log('🚀 API firebase-config chamada');
    console.log('🌍 NODE_ENV:', process.env.NODE_ENV);
    console.log('🌍 VERCEL_ENV:', process.env.VERCEL_ENV);

    // ✅ LOGS SEGUROS (CORRIGIDO: sem vazar informações sensíveis)
    console.log('🔍 Verificando disponibilidade das configurações Firebase...');

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

    // ✅ LOG SEGURO (CORRIGIDO: sem vazar chaves)
    console.log('🔍 Configuração carregada:', {
        hasApiKey: !!firebaseConfig.apiKey,
        hasAuthDomain: !!firebaseConfig.authDomain,
        hasProjectId: !!firebaseConfig.projectId
    });

    // Verificar se as configurações críticas estão disponíveis
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        console.error('❌ Configurações críticas faltando!');
        return res.status(500).json({
            error: 'Configuração crítica faltando',
            details: 'apiKey ou projectId não disponível'
        });
    }

    // ✅ CORS SEGURO (CORRIGIDO: apenas domínios permitidos)
    const origin = req.headers.origin;
    const allowedOrigins = ['https://atalho.me', 'https://www.atalho.me'];
    
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', 'https://atalho.me');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    console.log('✅ Configuração Firebase enviada com sucesso');
    return res.status(200).json(firebaseConfig);
} 