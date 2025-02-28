const express = require('express');
const cors = require('cors');
const axios = require('axios');
// Não precisamos do dotenv se definirmos o token diretamente
// require('dotenv').config();

// Adicione mensagens de console para diagnóstico
console.log("Iniciando servidor...");

// Defina o token diretamente no código (apenas para teste)
const MP_ACCESS_TOKEN = 'TEST-7601417945820618-013008-87f0900af129b320e5d12f6fabe39620-231065568';

const app = express();
const PORT = 3000; // Definimos diretamente, sem usar variável de ambiente

// Middleware
app.use(cors({
    origin: 'https://wehaveall.github.io',
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());

// Adicione uma rota de teste simples
app.get('/', (req, res) => {
    res.send('Servidor do Atalho está funcionando!');
});

// Rota para criar pagamento PIX
app.post('/api/create-pix', async (req, res) => {
    try {
        console.log('Recebida requisição para criar pagamento PIX');

        const response = await axios.post(
            'https://api.mercadopago.com/v1/payments',
            {
                transaction_amount: 49.90,
                description: 'Licença Anual do Atalho',
                payment_method_id: 'pix',
                payer: {
                    email: 'cliente@email.com',
                    first_name: 'Cliente',
                    last_name: 'Teste'
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${MP_ACCESS_TOKEN}`, // Use a constante definida acima
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Resposta do Mercado Pago:', response.data);
        res.json(response.data);
    } catch (error) {
        console.error('Erro ao criar pagamento PIX:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: 'Erro ao processar pagamento'
        });
    }
});

// Rota para verificar status do pagamento
app.get('/api/payment-status/:id', async (req, res) => {
    try {
        const paymentId = req.params.id;
        console.log(`Verificando status do pagamento ${paymentId}`);

        const response = await axios.get(
            `https://api.mercadopago.com/v1/payments/${paymentId}`,
            {
                headers: {
                    'Authorization': `Bearer ${MP_ACCESS_TOKEN}` // Use a constante definida acima
                }
            }
        );

        console.log('Status do pagamento:', response.data.status);
        res.json(response.data);
    } catch (error) {
        console.error('Erro ao verificar status:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: 'Erro ao verificar status'
        });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});

console.log("Script de servidor carregado completamente!");