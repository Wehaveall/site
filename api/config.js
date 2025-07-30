// 🔒 API ENDPOINT PARA CONFIGURAÇÃO SEGURA
module.exports = async (req, res) => {
    // Apenas métodos GET são permitidos
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        // DEBUG: Log das variáveis (sem expor valores)
        console.log('🔍 DEBUG API Config:', {
            hasMercadoPago: !!process.env.MERCADOPAGO_PUBLIC_KEY,
            hasStripe: !!process.env.STRIPE_PUBLIC_KEY,
            timestamp: new Date().toISOString()
        });

        // Retornar apenas configurações públicas
        const publicConfig = {
            // Public Key do MercadoPago (APENAS de variáveis de ambiente)
            publicKey: process.env.MERCADOPAGO_PUBLIC_KEY || null,
            
            // Public Key do Stripe (APENAS de variáveis de ambiente)
            stripePublicKey: process.env.STRIPE_PUBLIC_KEY || null,
            
            // Configurações gerais
            environment: process.env.NODE_ENV || 'production',
            apiVersion: '1.0.2', // Incrementado para forçar cache bust
            
            // URLs permitidas (para CORS)
            allowedOrigins: [
                'https://atalho.me',
                'https://www.atalho.me'
            ],
            
            // Status das configurações
            hasPublicKey: !!process.env.MERCADOPAGO_PUBLIC_KEY,
            hasStripePublicKey: !!process.env.STRIPE_PUBLIC_KEY,
            configSource: 'environment_variables',
            timestamp: new Date().toISOString()
        };

        // Headers de segurança - SEM CACHE para debug
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

        res.status(200).json(publicConfig);
    } catch (error) {
        console.error('Erro ao fornecer configuração:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
} 