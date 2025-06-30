module.exports = (req, res) => {
    // Log para debug detalhado
    console.log('🔍 === DEBUG DA API FIREBASE CONFIG ===');
    console.log('🔍 NODE_ENV:', process.env.NODE_ENV);
    console.log('🔍 Vercel Environment:', process.env.VERCEL_ENV);
    
    // Listar TODAS as variáveis de ambiente para debug
    console.log('🔍 Total de variáveis de ambiente:', Object.keys(process.env).length);
    
    // Verificar especificamente as variáveis do Firebase
    const firebaseVars = Object.keys(process.env).filter(key => key.includes('FIREBASE'));
    console.log('🔍 Variáveis com FIREBASE:', firebaseVars);
    
    // Verificar as específicas que esperamos
    const expectedVars = [
        'NEXT_PUBLIC_FIREBASE_API_KEY',
        'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
        'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
        'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
        'NEXT_PUBLIC_FIREBASE_APP_ID'
    ];
    
    expectedVars.forEach(varName => {
        const value = process.env[varName];
        console.log(`🔍 ${varName}: ${value ? 'DEFINIDA' : 'UNDEFINED'}`);
    });

    // Configuração APENAS via variáveis de ambiente (sem fallbacks hardcoded)
    const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    };

    // Log das variáveis (sem mostrar valores completos por segurança)
    console.log('🔍 Configuração carregada:', {
        apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : 'MISSING',
        authDomain: firebaseConfig.authDomain || 'MISSING',
        projectId: firebaseConfig.projectId || 'MISSING',
        // Outras propriedades também podem ser logadas se necessário
    });

    // Validação básica (agora com fallbacks, sempre deve funcionar)
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        console.error("❌ Configuração do Firebase com falha crítica");
        return res.status(500).json({ 
            error: "Configuração crítica faltando", 
            details: "apiKey ou projectId não disponível"
        });
    }

    // Log de status
    const usingFallbacks = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    console.log(`✅ Configuração Firebase ${usingFallbacks ? 'usando fallbacks' : 'via variáveis de ambiente'}`);

    // Configuração adicional: definir o CORS header
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    res.status(200).json(firebaseConfig);
}; 