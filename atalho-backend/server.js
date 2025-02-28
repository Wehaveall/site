// VERSÃO CORRIGIDA - 2025-02-28 (com idempotency key)
const express = require('express');
const cors = require('cors');
const axios = require('axios');

// Logs de diagnóstico
console.log("Iniciando servidor...");

// Defina o token diretamente no código
const MP_ACCESS_TOKEN = 'TEST-7601417945820618-013008-87f0900af129b320e5d12f6fabe39620-231065568';
console.log("Token configurado:", MP_ACCESS_TOKEN ? "✓ Token definido" : "✗ Token não definido");

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
    res.send('Servidor do Atalho está funcionando!');
});

// Rota para testar se a API está operacional
app.get('/api/test', (req, res) => {
    res.json({
        status: 'success',
        message: 'API do servidor Atalho está funcionando!',
        time: new Date().toISOString()
    });
});

// Rota para criar pagamento PIX
app.post('/api/create-pix', async (req, res) => {
    try {
        console.log('Recebida requisição para criar pagamento PIX');
        console.log('Corpo da requisição:', req.body);
        console.log('Tentando acessar o Mercado Pago...');

        // Gera uma idempotency key única para esta transação
        const idempotencyKey = generateIdempotencyKey();
        console.log('Idempotency Key gerada:', idempotencyKey);

        // Montando o corpo da requisição
        const paymentData = {
            transaction_amount: 49.90,
            description: 'Licença Anual do Atalho',
            payment_method_id: 'pix',
            payer: {
                email: 'cliente@email.com',
                first_name: 'Cliente',
                last_name: 'Teste'
            }
        };

        console.log('Dados do pagamento:', JSON.stringify(paymentData, null, 2));
        console.log('Token usado:', MP_ACCESS_TOKEN.substring(0, 10) + '...');

        try {
            const response = await axios.post(
                'https://api.mercadopago.com/v1/payments',
                paymentData,
                {
                    headers: {
                        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
                        'Content-Type': 'application/json',
                        'X-Idempotency-Key': idempotencyKey // Adicionando o cabeçalho obrigatório
                    }
                }
            );

            console.log('Resposta do Mercado Pago:', JSON.stringify(response.data, null, 2));
            res.json(response.data);
        } catch (mercadoPagoError) {
            console.error('Erro específico do Mercado Pago:');

            if (mercadoPagoError.response) {
                // O servidor respondeu com um status diferente de 2xx
                console.error('Status:', mercadoPagoError.response.status);
                console.error('Headers:', mercadoPagoError.response.headers);
                console.error('Dados:', JSON.stringify(mercadoPagoError.response.data, null, 2));

                res.status(500).json({
                    success: false,
                    error: 'Erro na API do Mercado Pago',
                    details: mercadoPagoError.response.data
                });
            } else if (mercadoPagoError.request) {
                // A requisição foi feita mas não houve resposta
                console.error('Sem resposta do Mercado Pago');
                console.error('Requisição:', mercadoPagoError.request);

                res.status(500).json({
                    success: false,
                    error: 'Não foi possível conectar ao Mercado Pago'
                });
            } else {
                // Algo aconteceu ao configurar a requisição
                console.error('Erro ao configurar requisição:', mercadoPagoError.message);

                res.status(500).json({
                    success: false,
                    error: 'Erro na configuração da requisição',
                    message: mercadoPagoError.message
                });
            }
        }
    } catch (error) {
        console.error('Erro geral ao criar pagamento PIX:', error);
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
        console.log(`Verificando status do pagamento ${paymentId}`);

        try {
            const response = await axios.get(
                `https://api.mercadopago.com/v1/payments/${paymentId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
                    }
                }
            );

            console.log('Status do pagamento:', response.data.status);
            res.json(response.data);
        } catch (mercadoPagoError) {
            console.error('Erro específico do Mercado Pago ao verificar status:');

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
        console.error('Erro geral ao verificar status:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao verificar status',
            message: error.message
        });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log(`API disponível em http://localhost:${PORT}/api`);
    console.log(`Teste a API em http://localhost:${PORT}/api/test`);
});

console.log("Script de servidor carregado completamente!");