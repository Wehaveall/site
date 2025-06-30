// API de debug para listar variáveis de ambiente
export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        // Listar TODAS as variáveis de ambiente
        const allEnvVars = Object.keys(process.env);
        
        // Separar por categorias
        const firebaseVars = allEnvVars.filter(key => key.includes('FIREBASE'));
        const nextPublicVars = allEnvVars.filter(key => key.startsWith('NEXT_PUBLIC_'));
        const vercelVars = allEnvVars.filter(key => key.startsWith('VERCEL_'));
        const otherVars = allEnvVars.filter(key => 
            !key.includes('FIREBASE') && 
            !key.startsWith('NEXT_PUBLIC_') && 
            !key.startsWith('VERCEL_')
        );

        // Criar resposta detalhada
        const response = {
            summary: {
                total: allEnvVars.length,
                firebase: firebaseVars.length,
                nextPublic: nextPublicVars.length,
                vercel: vercelVars.length,
                other: otherVars.length
            },
            details: {
                firebase: firebaseVars.map(key => ({
                    key: key,
                    hasValue: !!process.env[key],
                    valueLength: process.env[key] ? process.env[key].length : 0
                })),
                nextPublic: nextPublicVars.map(key => ({
                    key: key,
                    hasValue: !!process.env[key],
                    valueLength: process.env[key] ? process.env[key].length : 0
                })),
                vercel: vercelVars.slice(0, 10), // Mostrar apenas os primeiros 10
                other: otherVars.slice(0, 10) // Mostrar apenas os primeiros 10
            },
            specificChecks: {
                'NEXT_PUBLIC_FIREBASE_API_KEY': {
                    exists: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
                    value: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'FOUND' : 'NOT_FOUND'
                },
                'NEXT_PUBLIC_FIREBASE_PROJECT_ID': {
                    exists: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                    value: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'FOUND' : 'NOT_FOUND'
                },
                'FIREBASE_SERVICE_ACCOUNT_JSON': {
                    exists: !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
                    value: process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? 'FOUND' : 'NOT_FOUND'
                }
            },
            timestamp: new Date().toISOString()
        };

        return res.status(200).json(response);

    } catch (error) {
        console.error('Erro no debug de variáveis:', error);
        return res.status(500).json({ 
            error: 'Erro interno',
            details: error.message 
        });
    }
} 