// VERSÃO PRODUÇÃO - 2025 (com credenciais de produção)
const express = require('express');
const cors = require('cors');
const axios = require('axios');

// Logs de diagnóstico
console.log("Iniciando servidor...");

// ================== CREDENCIAIS DE PRODUÇÃO CONFIGURADAS ==================
const MP_ACCESS_TOKEN = 'APP_USR-7601417945820618-013008-5b2554be4b9451d02eaed17ed992b76b-231065568';
// ===========================================================================

console.log("Token configurado:", MP_ACCESS_TOKEN.includes('COLE_SEU') ? "⚠️ TOKEN DE PRODUÇÃO AINDA NÃO CONFIGURADO!" : "✓ Token de produção definido");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.json());

// Função para gerar uma idempotency key única
function generateIdempotencyKey() {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000000);
    return `${timestamp}-${random}`;
}

// Rota de teste simples
app.get('/', (req, res) => {
    res.send('Servidor do Atalho está funcionando! (PRODUÇÃO)');
});

// Rota para testar se a API está operacional
app.get('/api/test', (req, res) => {
    res.json({
        status: 'success',
        message: 'API do servidor Atalho está funcionando! (PRODUÇÃO)',
        time: new Date().toISOString(),
        environment: 'PRODUCTION'
    });
});

// Rota para criar pagamento PIX
app.post('/api/create-pix', async (req, res) => {
    try {
        console.log('🎯 PRODUÇÃO: Recebida requisição para criar pagamento PIX REAL');
        console.log('Corpo da requisição:', req.body);
        console.log('Tentando acessar o Mercado Pago (PRODUÇÃO)...');

        // Verificar se o token de produção foi configurado
        if (MP_ACCESS_TOKEN.includes('COLE_SEU')) {
            return res.status(500).json({
                success: false,
                error: 'Token de produção não configurado! Verifique o server.js'
            });
        }

        // Gera uma idempotency key única para esta transação
        const idempotencyKey = generateIdempotencyKey();
        console.log('Idempotency Key gerada:', idempotencyKey);

        // Configurar data de expiração para 20 minutos
        const expirationDate = new Date();
        expirationDate.setMinutes(expirationDate.getMinutes() + 20);

        // Montando o corpo da requisição para PRODUÇÃO
        const paymentData = {
            transaction_amount: 49.90,
            description: 'Licença Anual do Atalho',
            payment_method_id: 'pix',
            date_of_expiration: expirationDate.toISOString(),
            payer: {
                email: req.body.email || 'cliente@email.com',
                first_name: req.body.firstName || 'Cliente',
                last_name: req.body.lastName || 'Real'
            },
            notification_url: 'https://seudominio.com/webhook' // Opcional: webhook para notificações
        };

        console.log('Dados do pagamento (PRODUÇÃO):', JSON.stringify(paymentData, null, 2));
        console.log('Token usado:', MP_ACCESS_TOKEN.substring(0, 10) + '...');

        try {
            const response = await axios.post(
                'https://api.mercadopago.com/v1/payments',
                paymentData,
                {
                    headers: {
                        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
                        'Content-Type': 'application/json',
                        'X-Idempotency-Key': idempotencyKey
                    }
                }
            );

            console.log('✅ PRODUÇÃO: Resposta do Mercado Pago:', JSON.stringify(response.data, null, 2));
            res.json(response.data);
        } catch (mercadoPagoError) {
            console.error('❌ PRODUÇÃO: Erro específico do Mercado Pago:');

            if (mercadoPagoError.response) {
                console.error('Status:', mercadoPagoError.response.status);
                console.error('Headers:', mercadoPagoError.response.headers);
                console.error('Dados:', JSON.stringify(mercadoPagoError.response.data, null, 2));

                res.status(500).json({
                    success: false,
                    error: 'Erro na API do Mercado Pago',
                    details: mercadoPagoError.response.data
                });
            } else if (mercadoPagoError.request) {
                console.error('Sem resposta do Mercado Pago');
                console.error('Requisição:', mercadoPagoError.request);

                res.status(500).json({
                    success: false,
                    error: 'Não foi possível conectar ao Mercado Pago'
                });
            } else {
                console.error('Erro ao configurar requisição:', mercadoPagoError.message);

                res.status(500).json({
                    success: false,
                    error: 'Erro na configuração da requisição',
                    message: mercadoPagoError.message
                });
            }
        }
    } catch (error) {
        console.error('❌ PRODUÇÃO: Erro geral ao criar pagamento PIX:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao processar pagamento',
            message: error.message
        });
    }
});

// Rota para verificar status do pagamento
app.get('/api/payment-status/:id', async (req, res) => {
    try {
        const paymentId = req.params.id;
        console.log(`🔍 PRODUÇÃO: Verificando status do pagamento ${paymentId}`);

        try {
            const response = await axios.get(
                `https://api.mercadopago.com/v1/payments/${paymentId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
                    }
                }
            );

            console.log('✅ PRODUÇÃO: Status do pagamento:', response.data.status);
            res.json(response.data);
        } catch (mercadoPagoError) {
            console.error('❌ PRODUÇÃO: Erro específico do Mercado Pago ao verificar status:');

            if (mercadoPagoError.response) {
                console.error('Status:', mercadoPagoError.response.status);
                console.error('Dados:', JSON.stringify(mercadoPagoError.response.data, null, 2));

                res.status(500).json({
                    success: false,
                    error: 'Erro na API do Mercado Pago',
                    details: mercadoPagoError.response.data
                });
            } else {
                console.error('Erro ao conectar com Mercado Pago:', mercadoPagoError.message);

                res.status(500).json({
                    success: false,
                    error: 'Erro ao verificar status',
                    message: mercadoPagoError.message
                });
            }
        }
    } catch (error) {
        console.error('❌ PRODUÇÃO: Erro geral ao verificar status:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao verificar status',
            message: error.message
        });
    }
});

// Rota para receber webhooks do Mercado Pago
app.post('/api/webhook', (req, res) => {
    try {
        console.log('🔔 WEBHOOK: Recebida notificação do Mercado Pago');
        console.log('Headers:', req.headers);
        console.log('Body:', JSON.stringify(req.body, null, 2));

        const { action, data } = req.body;

        if (action === 'payment.updated' && data && data.id) {
            console.log(`🔔 WEBHOOK: Pagamento ${data.id} foi atualizado`);
            
            // Aqui você pode implementar lógica adicional:
            // - Verificar o status do pagamento
            // - Atualizar banco de dados
            // - Enviar email de confirmação
            // - Liberar acesso ao produto
            
            // Por enquanto, apenas logamos
            console.log(`📝 WEBHOOK: Processando atualização do pagamento ${data.id}`);
        }

        // Sempre responder 200 OK para o Mercado Pago
        res.status(200).json({ received: true });
    } catch (error) {
        console.error('❌ WEBHOOK: Erro ao processar webhook:', error);
        res.status(200).json({ received: true }); // Mesmo com erro, responde OK
    }
});

// Rota para simular pagamento aprovado (apenas para testes)
app.post('/api/simulate-payment/:id', async (req, res) => {
    try {
        const paymentId = req.params.id;
        console.log(`🧪 SIMULAÇÃO: Simulando aprovação do pagamento ${paymentId}`);

        // Simula um pagamento aprovado
        const simulatedPayment = {
            id: parseInt(paymentId),
            status: 'approved',
            status_detail: 'accredited',
            date_approved: new Date().toISOString(),
            date_last_updated: new Date().toISOString(),
            transaction_amount: 49.90,
            currency_id: 'BRL',
            payment_method_id: 'pix',
            payment_type_id: 'bank_transfer',
            live_mode: false, // Marca como simulação
            simulation: true,
            description: 'Licença Anual do Atalho (SIMULAÇÃO)',
            collector_id: 231065568,
            payer: {
                id: "1499372801",
                email: "cliente@email.com",
                first_name: "Cliente",
                last_name: "Simulado"
            }
        };

        console.log('✅ SIMULAÇÃO: Pagamento simulado como aprovado:', simulatedPayment);
        res.json(simulatedPayment);
    } catch (error) {
        console.error('❌ SIMULAÇÃO: Erro ao simular pagamento:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao simular pagamento',
            message: error.message
        });
    }
});

// Rota para salvar dados do cliente (chamada antes do PIX)
app.post('/api/save-customer-data', (req, res) => {
    try {
        console.log('💾 DADOS: Salvando dados do cliente antes do pagamento');
        console.log('Dados recebidos:', JSON.stringify(req.body, null, 2));

        const { name, email, phone, company } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                success: false,
                error: 'Nome e email são obrigatórios'
            });
        }

        // Aqui você pode salvar no banco de dados de sua escolha
        // Por enquanto, apenas logamos e retornamos sucesso
        
        const customerData = {
            name,
            email,
            phone: phone || null,
            company: company || null,
            created_at: new Date().toISOString(),
            status: 'awaiting_payment'
        };

        console.log('✅ DADOS: Dados do cliente salvos:', customerData);

        res.json({
            success: true,
            message: 'Dados salvos com sucesso',
            customer_id: `customer_${Date.now()}`,
            data: customerData
        });
    } catch (error) {
        console.error('❌ DADOS: Erro ao salvar dados do cliente:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao salvar dados',
            message: error.message
        });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor PRODUÇÃO rodando em http://localhost:${PORT}`);
    console.log(`🔗 API disponível em http://localhost:${PORT}/api`);
    console.log(`🧪 Teste a API em http://localhost:${PORT}/api/test`);
    console.log(`💰 ATENÇÃO: Este servidor está configurado para PIX REAL com taxas reais!`);
});

console.log("Script de servidor PRODUÇÃO carregado completamente!");