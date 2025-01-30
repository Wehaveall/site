// netlify/functions/create-preference.js

const mercadopago = require('mercadopago');

exports.handler = async function (event, context) {
    // Habilitar CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Responder ao preflight request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers
        };
    }

    try {
        // Configurar Mercado Pago
        mercadopago.configure({
            access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN
        });

        // Criar preferência
        const preference = {
            items: [{
                title: 'Licença Anual - Atalho App',
                unit_price: 49.90,
                quantity: 1,
            }],
            payment_methods: {
                excluded_payment_types: [
                    { id: "credit_card" },
                    { id: "debit_card" }
                ],
                installments: 1
            },
            back_urls: {
                success: "https://wehaveall.github.io/success",
                failure: "https://wehaveall.github.io/failure",
                pending: "https://wehaveall.github.io/pending"
            },
            auto_return: "approved"
        };

        const response = await mercadopago.preferences.create(preference);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                id: response.body.id,
                init_point: response.body.init_point
            })
        };
    } catch (error) {
        console.error('Erro:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Error creating preference'
            })
        };
    }
};