// API de Configuração Segura para Chaves Públicas
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

export default async function handler(req, res) {
    // Configurar CORS
    res.set(corsHeaders);

    // Tratar preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Apenas aceitar GET
    if (req.method !== 'GET') {
        return res.status(405).json({
            error: 'Método não permitido',
            details: 'Esta API aceita apenas requisições GET'
        });
    }

    try {
        // Configurações públicas (apenas chaves públicas, nunca secretas)
        const config = {
            // URLs da API
            api_base_url: process.env.API_BASE_URL || 'https://atalho.me/api',
            
            // Firebase Config (público)
            firebase_config: {
                apiKey: process.env.FIREBASE_API_KEY || '',
                authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
                projectId: process.env.FIREBASE_PROJECT_ID || '',
                storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
                messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
                appId: process.env.FIREBASE_APP_ID || ''
            },
            
            // Stripe (apenas chave pública)
            stripe_public_key: process.env.STRIPE_PUBLIC_KEY || '',
            
            // PayPal (apenas client ID público)
            paypal_client_id: process.env.PAYPAL_CLIENT_ID || '',
            paypal_mode: process.env.PAYPAL_MODE || 'sandbox', // 'sandbox' ou 'live'
            
            // Mercado Pago (para compatibilidade com PIX)
            mercadopago_public_key: process.env.MERCADOPAGO_PUBLIC_KEY || '',
            
            // Configurações gerais
            environment: process.env.NODE_ENV || 'development',
            version: '2.0.0',
            last_updated: new Date().toISOString()
        };

        // Verificar se as configurações essenciais estão presentes
        const missingConfigs = [];
        
        if (!config.firebase_config.apiKey) {
            missingConfigs.push('FIREBASE_API_KEY');
        }
        
        if (!config.stripe_public_key) {
            missingConfigs.push('STRIPE_PUBLIC_KEY');
        }
        
        if (!config.paypal_client_id) {
            missingConfigs.push('PAYPAL_CLIENT_ID');
        }

        // Log de configurações carregadas (sem expor dados sensíveis)
        console.log('📊 Configurações carregadas:', {
            api_base_url: config.api_base_url,
            firebase_project_id: config.firebase_config.projectId,
            stripe_configured: !!config.stripe_public_key,
            paypal_configured: !!config.paypal_client_id,
            paypal_mode: config.paypal_mode,
            environment: config.environment,
            missing_configs: missingConfigs
        });

        // Aviso sobre configurações faltando (não bloqueante)
        if (missingConfigs.length > 0) {
            console.warn('⚠️ Configurações faltando:', missingConfigs);
        }

        // Resposta de sucesso
        return res.status(200).json({
            success: true,
            config: config,
            warnings: missingConfigs.length > 0 ? `Configurações faltando: ${missingConfigs.join(', ')}` : null
        });

    } catch (error) {
        console.error('❌ Erro ao carregar configurações:', error);

        // Retorna configuração de fallback em caso de erro
        const fallbackConfig = {
            api_base_url: '/api',
            firebase_config: {
                apiKey: '',
                authDomain: '',
                projectId: '',
                storageBucket: '',
                messagingSenderId: '',
                appId: ''
            },
            stripe_public_key: '',
            paypal_client_id: '',
            paypal_mode: 'sandbox',
            mercadopago_public_key: '',
            environment: 'development',
            version: '2.0.0-fallback',
            last_updated: new Date().toISOString()
        };

        return res.status(200).json({
            success: false,
            error: 'Erro ao carregar configurações',
            config: fallbackConfig,
            fallback: true
        });
    }
} 