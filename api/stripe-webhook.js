// 🔒 WEBHOOK DO STRIPE PARA PROCESSAR EVENTOS
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Configuração CORS
const allowedOrigins = [
    'https://atalho.me',
    'https://www.atalho.me'
];

function corsMiddleware(req, res) {
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin) || !origin) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Stripe-Signature');
    res.setHeader('Access-Control-Max-Age', '86400');
}

// Função para ativar licença via Firebase Cloud Function
async function activateUserLicense(licenseData) {
    try {
        console.log(`🔥 [FIREBASE] Ativando licença para ${licenseData.user_email}`);
        
        const firebaseUrl = process.env.FIREBASE_FUNCTIONS_URL || 'https://us-east1-shortcut-6256b.cloudfunctions.net';
        
        const response = await fetch(`${firebaseUrl}/renewLicense`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                data: licenseData
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ [FIREBASE] Licença ativada com sucesso:', result);
            return result.result || { success: true };
        } else {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
    } catch (error) {
        console.error('❌ [FIREBASE] Erro ao ativar licença:', error);
        return {
            success: false,
            error: 'FIREBASE_ERROR',
            message: error.message
        };
    }
}

// Handler para checkout session completado
async function handleCheckoutCompleted(session) {
    console.log(`🔵 [STRIPE WEBHOOK] Checkout completado: ${session.id}`);
    
    try {
        // Para pagamentos únicos (licença vitalícia), ativar imediatamente
        if (session.mode === 'payment') {
            const licenseData = {
                license_type: session.metadata.license_type,
                stripe_customer_id: session.customer,
                stripe_session_id: session.id,
                user_email: session.metadata.user_email,
                user_name: session.metadata.user_name || '',
                language: session.metadata.language || 'pt-br',
                payment_method: 'stripe',
                amount: session.amount_total / 100, // Converter de centavos
                currency: session.currency
            };
            
            const activationResult = await activateUserLicense(licenseData);
            if (activationResult.success) {
                console.log(`✅ [STRIPE WEBHOOK] Licença vitalícia ativada para ${licenseData.user_email}`);
            } else {
                console.error(`❌ [STRIPE WEBHOOK] Falha ao ativar licença:`, activationResult);
            }
        }
        
        // Para assinaturas, a ativação acontece no invoice.payment_succeeded
        console.log(`ℹ️ [STRIPE WEBHOOK] Checkout processado com sucesso`);
        
    } catch (error) {
        console.error(`❌ [STRIPE WEBHOOK] Erro ao processar checkout:`, error);
        throw error;
    }
}

// Handler para pagamento de invoice bem-sucedido (renovações)
async function handlePaymentSucceeded(invoice) {
    console.log(`🔵 [STRIPE WEBHOOK] Pagamento bem-sucedido: ${invoice.id}`);
    
    try {
        // Para renovações automáticas de assinatura
        if (invoice.subscription) {
            // Buscar detalhes da assinatura
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
            const customer = await stripe.customers.retrieve(subscription.customer);
            
            const licenseData = {
                license_type: 'anual',
                stripe_customer_id: customer.id,
                stripe_subscription_id: subscription.id,
                stripe_invoice_id: invoice.id,
                user_email: customer.email,
                user_name: customer.name || '',
                language: customer.metadata?.language || 'pt-br',
                payment_method: 'stripe',
                amount: invoice.amount_paid / 100, // Converter de centavos
                currency: invoice.currency,
                is_renewal: invoice.billing_reason === 'subscription_cycle'
            };
            
            const activationResult = await activateUserLicense(licenseData);
            if (activationResult.success) {
                console.log(`✅ [STRIPE WEBHOOK] Licença renovada para ${licenseData.user_email}`);
            } else {
                console.error(`❌ [STRIPE WEBHOOK] Falha ao renovar licença:`, activationResult);
            }
        }
        
    } catch (error) {
        console.error(`❌ [STRIPE WEBHOOK] Erro ao processar pagamento:`, error);
        throw error;
    }
}

// Handler para assinatura cancelada
async function handleSubscriptionDeleted(subscription) {
    console.log(`🔵 [STRIPE WEBHOOK] Assinatura cancelada: ${subscription.id}`);
    
    try {
        const customer = await stripe.customers.retrieve(subscription.customer);
        
        // Notificar sistema sobre cancelamento
        console.log(`ℹ️ [STRIPE WEBHOOK] Assinatura cancelada para ${customer.email}`);
        
        // O Firebase Cloud Function já processa isso automaticamente
        // Aqui podemos adicionar logs ou enviar emails de feedback
        
    } catch (error) {
        console.error(`❌ [STRIPE WEBHOOK] Erro ao processar cancelamento:`, error);
    }
}

// Handler para assinatura atualizada
async function handleSubscriptionUpdated(subscription) {
    console.log(`🔵 [STRIPE WEBHOOK] Assinatura atualizada: ${subscription.id}`);
    
    try {
        const customer = await stripe.customers.retrieve(subscription.customer);
        
        console.log(`ℹ️ [STRIPE WEBHOOK] Assinatura atualizada para ${customer.email}:`, {
            status: subscription.status,
            current_period_end: subscription.current_period_end
        });
        
        // Tratar mudanças de plano, pausas, etc.
        // Implementar conforme necessário
        
    } catch (error) {
        console.error(`❌ [STRIPE WEBHOOK] Erro ao processar atualização:`, error);
    }
}

module.exports = async (req, res) => {
    // Aplicar CORS
    corsMiddleware(req, res);
    
    // Tratar OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Apenas métodos POST são permitidos
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
        console.error('❌ [STRIPE WEBHOOK] STRIPE_WEBHOOK_SECRET não configurado');
        return res.status(500).json({ error: 'Configuração de webhook não encontrada' });
    }

    let event;

    try {
        // Verificar assinatura do webhook
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        console.log(`🔵 [STRIPE WEBHOOK] Evento recebido: ${event.type} - ID: ${event.id}`);
    } catch (err) {
        console.error(`❌ [STRIPE WEBHOOK] Erro na verificação da assinatura: ${err.message}`);
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    try {
        // Processar eventos do webhook
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object);
                break;
                
            case 'invoice.payment_succeeded':
                await handlePaymentSucceeded(event.data.object);
                break;
                
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;
                
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object);
                break;
                
            default:
                console.log(`ℹ️ [STRIPE WEBHOOK] Evento não tratado: ${event.type}`);
        }

        // Resposta de sucesso
        res.json({ 
            received: true, 
            eventType: event.type,
            eventId: event.id
        });
        
    } catch (error) {
        console.error(`❌ [STRIPE WEBHOOK] Erro ao processar evento ${event.type}:`, error);
        res.status(500).json({ 
            error: 'Erro interno',
            eventType: event.type,
            message: error.message
        });
    }
};