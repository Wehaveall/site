/**
 * API endpoint para servir configurações públicas
 * Permite gerenciar configurações sem hardcode no frontend
 */

module.exports = (req, res) => {
    // Permitir apenas GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Verificar se todas as variáveis obrigatórias estão definidas
        const requiredEnvVars = [
            'NEXT_PUBLIC_FIREBASE_API_KEY',
            'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
            'NEXT_PUBLIC_FIREBASE_DATABASE_URL',
            'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
            'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
            'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
            'NEXT_PUBLIC_FIREBASE_APP_ID',
            'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID'
        ];

        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            console.error('❌ Variáveis de ambiente obrigatórias não definidas:', missingVars);
            return res.status(500).json({ 
                error: 'Configuração incompleta',
                message: 'Variáveis de ambiente não configuradas no servidor'
            });
        }

        // Configurações carregadas APENAS de variáveis de ambiente
        const publicConfig = {
            firebase: {
                apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
                authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
                databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
                messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
                appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
                measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
            },
            
            // Outras configurações públicas
            app: {
                name: "Atalho",
                version: "1.0.0",
                environment: process.env.NODE_ENV || "development"
            },
            
            // URLs de serviços
            services: {
                cloudFunctions: {
                    syncEmailVerification: process.env.SYNC_EMAIL_VERIFICATION_URL
                }
            }
        };

        // Headers de cache para otimização
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora
        res.setHeader('Content-Type', 'application/json');

        res.status(200).json(publicConfig);

    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            message: 'Não foi possível carregar as configurações'
        });
    }
}; 