module.exports = (req, res) => {
    // Log para debug
    console.log('🔍 Verificando variáveis de ambiente do Firebase...');
    
    // Listar todas as variáveis que começam com NEXT_PUBLIC_FIREBASE_
    const envVars = Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_FIREBASE_'));
    console.log('🔍 Variáveis encontradas:', envVars);

    // Estas variáveis devem ser configuradas no seu painel da Vercel
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

    // Validação melhorada
    const missingVars = [];
    if (!firebaseConfig.apiKey) missingVars.push('NEXT_PUBLIC_FIREBASE_API_KEY');
    if (!firebaseConfig.authDomain) missingVars.push('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
    if (!firebaseConfig.projectId) missingVars.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
    if (!firebaseConfig.storageBucket) missingVars.push('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
    if (!firebaseConfig.messagingSenderId) missingVars.push('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
    if (!firebaseConfig.appId) missingVars.push('NEXT_PUBLIC_FIREBASE_APP_ID');

    if (missingVars.length > 0) {
        console.error("❌ Variáveis de ambiente do Firebase não configuradas:", missingVars);
        return res.status(500).json({ 
            error: "Configuração do servidor incompleta", 
            details: `Variáveis faltando: ${missingVars.join(', ')}`,
            help: "Configure as variáveis de ambiente no painel da Vercel",
            foundVars: envVars
        });
    }

    // Se chegou até aqui, todas as variáveis essenciais estão presentes
    console.log("✅ Todas as variáveis de ambiente do Firebase estão configuradas");

    // Configuração adicional: definir o CORS header
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    res.status(200).json(firebaseConfig);
}; 