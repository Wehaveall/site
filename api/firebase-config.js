export default async function handler(req, res) {
    // Validação de origem
    const allowedOrigin = 'https://atalho.me';
    const origin = req.headers.origin;
    
    if (origin !== allowedOrigin) {
        return res.status(403).json({ error: 'Origem não autorizada' });
    }
    
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Vary', 'Origin');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    // Configuração via variáveis de ambiente
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

    // Verificar configurações críticas sem expor detalhes
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        console.error('Erro de configuração do Firebase');
        return res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }

    return res.status(200).json(firebaseConfig);
} 