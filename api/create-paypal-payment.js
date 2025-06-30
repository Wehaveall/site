// API para criar ordem no PayPal
const axios = require('axios');

// Configuração CORS
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// URLs do PayPal (sandbox ou produção)
const PAYPAL_BASE_URL = process.env.PAYPAL_MODE === 'live' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com';

// Função para obter token de acesso do PayPal
async function getPayPalAccessToken() {
    try {
        const auth = Buffer.from(
            `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
        ).toString('base64');

        const response = await axios.post(
            `${PAYPAL_BASE_URL}/v1/oauth2/token`,
            'grant_type=client_credentials',
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                }
            }
        );

        return response.data.access_token;
    } catch (error) {
        console.error('❌ Erro ao obter token PayPal:', error.response?.data || error.message);
        throw new Error('Falha na autenticação com PayPal');
    }
}

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
            currency = 'USD',
            customer_email,
            product_name = 'Atalho - Licença Anual',
            return_url,
            cancel_url
        } = req.body;

        // Validações
        if (!amount || parseFloat(amount) <= 0) {
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

        if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
            return res.status(500).json({
                error: 'Configuração inválida',
                details: 'Credenciais do PayPal não configuradas'
            });
        }

        console.log('💰 Criando ordem PayPal:', {
            amount,
            currency,
            customer_email,
            product_name
        });

        // Obter token de acesso
        const accessToken = await getPayPalAccessToken();

        // Criar ordem no PayPal
        const orderData = {
            intent: 'CAPTURE',
            purchase_units: [
                {
                    reference_id: `atalho_${Date.now()}`,
                    description: product_name,
                    amount: {
                        currency_code: currency.toUpperCase(),
                        value: amount.toString()
                    },
                    payee: {
                        email_address: process.env.PAYPAL_BUSINESS_EMAIL
                    }
                }
            ],
            application_context: {
                brand_name: 'Atalho App',
                landing_page: 'BILLING',
                user_action: 'PAY_NOW',
                return_url: return_url || `${req.headers.origin}/success.html`,
                cancel_url: cancel_url || `${req.headers.origin}/comprar.html`,
                shipping_preference: 'NO_SHIPPING'
            },
            payer: {
                email_address: customer_email
            }
        };

        const response = await axios.post(
            `${PAYPAL_BASE_URL}/v2/checkout/orders`,
            orderData,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'PayPal-Request-Id': `atalho_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                }
            }
        );

        const order = response.data;
        console.log('✅ Ordem PayPal criada:', order.id);

        // Resposta de sucesso
        return res.status(200).json({
            success: true,
            order_id: order.id,
            status: order.status,
            amount: amount,
            currency: currency,
            approval_url: order.links?.find(link => link.rel === 'approve')?.href,
            created_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Erro ao criar ordem PayPal:', error);

        // Tratamento de erros específicos do PayPal
        if (error.response) {
            const paypalError = error.response.data;
            
            if (paypalError.name === 'INVALID_REQUEST') {
                return res.status(400).json({
                    error: 'Requisição inválida',
                    details: paypalError.message || 'Dados da ordem inválidos',
                    paypal_error: paypalError
                });
            }

            if (paypalError.name === 'AUTHENTICATION_FAILURE') {
                return res.status(500).json({
                    error: 'Erro de autenticação',
                    details: 'Falha na autenticação com PayPal'
                });
            }

            if (paypalError.name === 'PERMISSION_DENIED') {
                return res.status(403).json({
                    error: 'Permissão negada',
                    details: 'Não autorizado a realizar esta operação'
                });
            }

            return res.status(error.response.status || 500).json({
                error: 'Erro no PayPal',
                details: paypalError.message || 'Erro desconhecido do PayPal',
                paypal_error: paypalError
            });
        }

        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            return res.status(500).json({
                error: 'Erro de conexão',
                details: 'Não foi possível conectar com o PayPal'
            });
        }

        // Erro genérico
        return res.status(500).json({
            error: 'Erro interno do servidor',
            details: 'Erro ao processar pagamento via PayPal',
            message: error.message
        });
    }
} 