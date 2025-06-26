// 🔒 API ENDPOINT PARA CONFIGURAÇÃO SEGURA
export default function handler(req, res) {
    // Apenas métodos GET são permitidos
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        // Retornar apenas configurações públicas
        const publicConfig = {
            // Public Key do MercadoPago (pode ser exposta no frontend)
            publicKey: process.env.MERCADOPAGO_PUBLIC_KEY || 'APP_USR-eb7579bb-3460-43d1-83eb-1010a62d1bd2',
            
            // Configurações gerais
            environment: process.env.NODE_ENV || 'production',
            apiVersion: '1.0.0',
            
            // URLs permitidas (para CORS)
            allowedOrigins: [
                'https://atalho.me',
                'https://www.atalho.me'
            ]
        };

        // Headers de segurança
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');

        res.status(200).json(publicConfig);
    } catch (error) {
        console.error('Erro ao fornecer configuração:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
} 