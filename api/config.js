// 🔒 API ENDPOINT PARA CONFIGURAÇÃO SEGURA
export default function handler(req, res) {
    // Apenas métodos GET são permitidos
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        // Retornar apenas configurações públicas
        const publicConfig = {
            // Public Key do MercadoPago (APENAS de variáveis de ambiente)
            publicKey: process.env.MERCADOPAGO_PUBLIC_KEY || null,
            
            // Configurações gerais
            environment: process.env.NODE_ENV || 'production',
            apiVersion: '1.0.0',
            
            // URLs permitidas (para CORS)
            allowedOrigins: [
                'https://atalho.me',
                'https://www.atalho.me'
            ],
            
            // Status das configurações
            hasPublicKey: !!process.env.MERCADOPAGO_PUBLIC_KEY,
            configSource: 'environment_variables'
        };

        // Headers de segurança
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora
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