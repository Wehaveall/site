// API para capturar pagamento no PayPal
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
            order_id,
            customer_email
        } = req.body;

        // Validações
        if (!order_id) {
            return res.status(400).json({
                error: 'ID da ordem obrigatório',
                details: 'O ID da ordem PayPal é obrigatório'
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

        console.log('💰 Capturando pagamento PayPal:', {
            order_id,
            customer_email
        });

        // Obter token de acesso
        const accessToken = await getPayPalAccessToken();

        // Capturar a ordem no PayPal
        const response = await axios.post(
            `${PAYPAL_BASE_URL}/v2/checkout/orders/${order_id}/capture`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'PayPal-Request-Id': `atalho_capture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                }
            }
        );

        const capturedOrder = response.data;
        console.log('✅ Pagamento PayPal capturado:', capturedOrder.id);

        // Verificar se a captura foi bem-sucedida
        const captureDetails = capturedOrder.purchase_units?.[0]?.payments?.captures?.[0];
        
        if (!captureDetails || captureDetails.status !== 'COMPLETED') {
            throw new Error(`Falha na captura do pagamento. Status: ${captureDetails?.status || 'unknown'}`);
        }

        // Extrair dados do pagamento
        const paymentData = {
            id: capturedOrder.id,
            status: capturedOrder.status,
            order_id: order_id,
            capture_id: captureDetails.id,
            amount: captureDetails.amount.value,
            currency: captureDetails.amount.currency_code,
            payer_email: capturedOrder.payer?.email_address || customer_email,
            payer_name: capturedOrder.payer?.name ? 
                `${capturedOrder.payer.name.given_name || ''} ${capturedOrder.payer.name.surname || ''}`.trim() : 
                'N/A',
            transaction_fee: captureDetails.seller_receivable_breakdown?.paypal_fee?.value || '0',
            net_amount: captureDetails.seller_receivable_breakdown?.net_amount?.value || captureDetails.amount.value,
            created_time: captureDetails.create_time,
            updated_time: captureDetails.update_time
        };

        console.log('💳 Dados do pagamento capturado:', paymentData);

        // Resposta de sucesso
        return res.status(200).json({
            success: true,
            message: 'Pagamento capturado com sucesso',
            payment_data: paymentData,
            capture_details: captureDetails,
            full_response: capturedOrder
        });

    } catch (error) {
        console.error('❌ Erro ao capturar pagamento PayPal:', error);

        // Tratamento de erros específicos do PayPal
        if (error.response) {
            const paypalError = error.response.data;
            
            if (paypalError.name === 'RESOURCE_NOT_FOUND') {
                return res.status(404).json({
                    error: 'Ordem não encontrada',
                    details: 'A ordem PayPal especificada não foi encontrada',
                    paypal_error: paypalError
                });
            }

            if (paypalError.name === 'UNPROCESSABLE_ENTITY') {
                return res.status(422).json({
                    error: 'Ordem não pode ser capturada',
                    details: paypalError.message || 'A ordem não está em um estado válido para captura',
                    paypal_error: paypalError
                });
            }

            if (paypalError.name === 'INVALID_REQUEST') {
                return res.status(400).json({
                    error: 'Requisição inválida',
                    details: paypalError.message || 'Dados da captura inválidos',
                    paypal_error: paypalError
                });
            }

            if (paypalError.name === 'AUTHENTICATION_FAILURE') {
                return res.status(500).json({
                    error: 'Erro de autenticação',
                    details: 'Falha na autenticação com PayPal'
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
            details: 'Erro ao capturar pagamento via PayPal',
            message: error.message
        });
    }
} 