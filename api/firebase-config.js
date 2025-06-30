module.exports = (req, res) => {
    // SUPER DEBUG - descobrir por que variáveis não são lidas
    console.log('🔍 === SUPER DEBUG VARIÁVEIS AMBIENTE ===');
    console.log('🔍 NODE_ENV:', process.env.NODE_ENV);
    console.log('🔍 VERCEL_ENV:', process.env.VERCEL_ENV);
    console.log('🔍 VERCEL_REGION:', process.env.VERCEL_REGION);
    
    // Listar TUDO que tem no process.env
    console.log('🔍 Total variáveis:', Object.keys(process.env).length);
    console.log('🔍 Primeiras 10 variáveis:', Object.keys(process.env).slice(0, 10));
    
    // Buscar QUALQUER variável que tenha 'firebase' (case insensitive)
    const anyFirebase = Object.keys(process.env).filter(key => key.toLowerCase().includes('firebase'));
    console.log('🔍 QUALQUER coisa com firebase:', anyFirebase);
    
    // Buscar por NEXT_PUBLIC
    const nextPublic = Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC'));
    console.log('🔍 Variáveis NEXT_PUBLIC:', nextPublic);
    
    // Verificar as específicas
    const testVars = {
        'NEXT_PUBLIC_FIREBASE_API_KEY': process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID': process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN': process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    };
    
    console.log('🔍 Teste das 3 principais:', JSON.stringify(testVars, null, 2));

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