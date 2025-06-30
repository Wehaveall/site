// API para criar Payment Intent no Stripe
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Configuração CORS
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

export default async function handler(req, res) {
    // Configurar CORS
    res.set(corsHeaders);

    // Tratar preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Apenas aceitar POST
    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'Método não permitido',
            details: 'Esta API aceita apenas requisições POST'
        });
    }

    try {
        const {
            amount,
            currency = 'usd',
            customer_email,
            product_name = 'Atalho - Licença Anual',
            return_url
        } = req.body;

        // Validações
        if (!amount || amount <= 0) {
            return res.status(400).json({
                error: 'Valor inválido',
                details: 'O valor deve ser maior que zero'
            });
        }

        if (!customer_email) {
            return res.status(400).json({
                error: 'Email obrigatório',
                details: 'O email do cliente é obrigatório'
            });
        }

        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({
                error: 'Configuração inválida',
                details: 'Chave secreta do Stripe não configurada'
            });
        }

        console.log('💰 Criando Payment Intent:', {
            amount,
            currency,
            customer_email,
            product_name
        });

        // Criar ou buscar cliente
        let customer;
        try {
            const customers = await stripe.customers.list({
                email: customer_email,
                limit: 1
            });

            if (customers.data.length > 0) {
                customer = customers.data[0];
                console.log('👤 Cliente existente encontrado:', customer.id);
            } else {
                customer = await stripe.customers.create({
                    email: customer_email,
                    metadata: {
                        product: 'atalho_license',
                        created_via: 'website'
                    }
                });
                console.log('👤 Novo cliente criado:', customer.id);
            }
        } catch (customerError) {
            console.error('❌ Erro ao gerenciar cliente:', customerError);
            return res.status(500).json({
                error: 'Erro ao processar cliente',
                details: customerError.message
            });
        }

        // Criar Payment Intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: currency.toLowerCase(),
            customer: customer.id,
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                customer_email: customer_email,
                product_name: product_name,
                created_at: new Date().toISOString()
            },
            description: `${product_name} - ${customer_email}`,
            receipt_email: customer_email,
        });

        console.log('✅ Payment Intent criado:', paymentIntent.id);

        // Resposta de sucesso
        return res.status(200).json({
            success: true,
            client_secret: paymentIntent.client_secret,
            payment_intent_id: paymentIntent.id,
            customer_id: customer.id,
            amount: amount,
            currency: currency,
            status: paymentIntent.status
        });

    } catch (error) {
        console.error('❌ Erro ao criar Payment Intent:', error);

        // Tratamento de erros específicos do Stripe
        if (error.type === 'StripeCardError') {
            return res.status(400).json({
                error: 'Erro no cartão',
                details: error.message,
                code: error.code
            });
        }

        if (error.type === 'StripeRateLimitError') {
            return res.status(429).json({
                error: 'Muitas tentativas',
                details: 'Tente novamente em alguns segundos'
            });
        }

        if (error.type === 'StripeInvalidRequestError') {
            return res.status(400).json({
                error: 'Requisição inválida',
                details: error.message
            });
        }

        if (error.type === 'StripeAPIError') {
            return res.status(500).json({
                error: 'Erro interno do Stripe',
                details: 'Tente novamente em alguns minutos'
            });
        }

        if (error.type === 'StripeConnectionError') {
            return res.status(500).json({
                error: 'Erro de conexão',
                details: 'Problemas de conectividade com o Stripe'
            });
        }

        if (error.type === 'StripeAuthenticationError') {
            return res.status(500).json({
                error: 'Erro de autenticação',
                details: 'Configuração inválida do Stripe'
            });
        }

        // Erro genérico
        return res.status(500).json({
            error: 'Erro interno do servidor',
            details: 'Erro ao processar pagamento via Stripe',
            message: error.message
        });
    }
} 