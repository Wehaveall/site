// 🔒 PROXY PARA STRIPE.JS - CONTORNA CSP
export default async function handler(req, res) {
    // Apenas métodos GET são permitidos
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        console.log('🔄 [PROXY] Buscando Stripe.js via servidor...');
        
        // Buscar Stripe.js do servidor oficial
        const response = await fetch('https://js.stripe.com/v3/', {
            headers: {
                'User-Agent': 'Atalho-Proxy/1.0',
                'Accept': 'application/javascript, text/javascript'
            }
        });

        if (!response.ok) {
            throw new Error(`Erro ao buscar Stripe.js: ${response.status}`);
        }

        const stripeJS = await response.text();
        
        // Headers para cache e segurança
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora
        res.setHeader('X-Proxy-Source', 'stripe-official');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        
        console.log('✅ [PROXY] Stripe.js servido com sucesso');
        res.status(200).send(stripeJS);
        
    } catch (error) {
        console.error('❌ [PROXY] Erro:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            message: 'Falha ao buscar Stripe.js'
        });
    }
}