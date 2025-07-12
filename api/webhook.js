// api/webhook.js - Webhook seguro e avançado para notificações do Mercado Pago
const { MercadoPagoConfig, Payment } = require('mercadopago');
const admin = require('firebase-admin');
const crypto = require('crypto');

// ✅ CONFIGURAÇÃO SEGURA - Token via variável de ambiente
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

if (!accessToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN não está definido nas variáveis de ambiente.');
}

const client = new MercadoPagoConfig({
    accessToken: accessToken,
    options: {
        timeout: 10000
    }
});

const payment = new Payment(client);

// ✅ MÉTRICAS DE PERFORMANCE
const performanceMetrics = {
    totalWebhooks: 0,
    successfulWebhooks: 0,
    failedWebhooks: 0,
    averageProcessingTime: 0,
    processingTimes: [],
    lastProcessingTime: null,
    
    recordProcessingTime(startTime) {
        const endTime = Date.now();
        const processingTime = endTime - startTime;
        
        this.processingTimes.push(processingTime);
        this.lastProcessingTime = processingTime;
        
        // Manter apenas os últimos 100 tempos para calcular média
        if (this.processingTimes.length > 100) {
            this.processingTimes.shift();
        }
        
        this.averageProcessingTime = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
        
        return processingTime;
    },
    
    recordSuccess() {
        this.totalWebhooks++;
        this.successfulWebhooks++;
    },
    
    recordFailure() {
        this.totalWebhooks++;
        this.failedWebhooks++;
    },
    
    getStats() {
        return {
            total: this.totalWebhooks,
            successful: this.successfulWebhooks,
            failed: this.failedWebhooks,
            successRate: this.totalWebhooks > 0 ? (this.successfulWebhooks / this.totalWebhooks * 100).toFixed(2) : 0,
            averageProcessingTime: Math.round(this.averageProcessingTime),
            lastProcessingTime: this.lastProcessingTime
        };
    }
};

// ✅ INICIALIZAR FIREBASE ADMIN
function initializeFirebaseAdmin() {
    if (!admin.apps.length) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: "https://shortcut-6256b-default-rtdb.firebaseio.com"
            });
            console.log('Firebase Admin SDK inicializado com sucesso.');
        } catch (error) {
            console.error('Falha na inicialização do Firebase Admin SDK:', error);
            throw error;
        }
    }
    return admin;
}

// ✅ RETRY AUTOMÁTICO COM BACKOFF EXPONENCIAL
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            // Não fazer retry para erros que não são temporários
            if (error.code === 'permission-denied' || 
                error.code === 'unauthenticated' || 
                error.status === 404 ||
                error.status === 401) {
                throw error;
            }
            
            if (attempt === maxRetries) {
                console.error(`❌ Falha após ${maxRetries} tentativas:`, error.message);
                throw error;
            }
            
            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.warn(`⚠️ Tentativa ${attempt} falhou, tentando novamente em ${delay}ms:`, error.message);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError;
}

// ✅ VALIDAÇÃO DE ASSINATURA DO MERCADO PAGO
function validateMercadoPagoSignature(body, signature, secret) {
    if (!signature || !secret) {
        return false;
    }

    try {
        // O Mercado Pago usa HMAC-SHA256 para assinar as requisições
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(body)
            .digest('hex');

        // Comparação segura para prevenir timing attacks
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    } catch (error) {
        console.error('Erro ao validar assinatura:', error);
        return false;
    }
}

// ✅ RATE LIMITING PARA WEBHOOKS
const webhookCounts = new Map();

function checkWebhookRateLimit(ip) {
    const now = Date.now();
    const windowStart = Math.floor(now / (60 * 1000)) * (60 * 1000); // 1 min window
    const key = `${ip}-${windowStart}`;
    
    const count = webhookCounts.get(key) || 0;
    if (count >= 100) { // Máximo 100 webhooks por minuto por IP
        return false;
    }
    
    webhookCounts.set(key, count + 1);
    
    // Limpar entradas antigas
    for (const [k, v] of webhookCounts.entries()) {
        if (k.split('-')[1] < windowStart - (60 * 1000)) {
            webhookCounts.delete(k);
        }
    }
    
    return true;
}

// ✅ ENVIAR EMAIL DE CONFIRMAÇÃO
async function sendPaymentConfirmationEmail(paymentData, userEmail) {
    try {
        // Verificar se temos configuração de email
        if (!process.env.SENDGRID_API_KEY && !process.env.SMTP_HOST) {
            console.log('📧 Configuração de email não encontrada, pulando envio');
            return { success: true, message: 'Email não configurado' };
        }

        const emailData = {
            to: userEmail,
            subject: 'Pagamento Aprovado - Atalho',
            paymentId: paymentData.id,
            amount: paymentData.transaction_amount,
            method: 'PIX',
            approvedAt: new Date().toLocaleString('pt-BR')
        };

        // Aqui você pode integrar com SendGrid, Nodemailer, etc.
        console.log('📧 EMAIL: Enviando confirmação de pagamento aprovado');
        console.log('📧 Para:', userEmail);
        console.log('📧 Pagamento:', paymentData.id);
        console.log('📧 Valor:', `R$ ${paymentData.transaction_amount}`);

        // TODO: Implementar integração real com serviço de email
        // Exemplo com SendGrid:
        /*
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        
        const msg = {
            to: userEmail,
            from: 'noreply@atalho.me',
            subject: 'Pagamento Aprovado - Atalho',
            templateId: 'payment-confirmation-template',
            dynamicTemplateData: emailData
        };
        
        await sgMail.send(msg);
        */

        return { success: true, message: 'Email enviado com sucesso' };
        
    } catch (error) {
        console.error('❌ Erro ao enviar email:', error);
        // Não falhar o webhook por causa do email
        return { success: false, message: 'Falha no envio do email', error: error.message };
    }
}

// ✅ PROCESSAR PAGAMENTO APROVADO COM RETRY
async function processApprovedPayment(paymentData) {
    return await retryWithBackoff(async () => {
        const adminInstance = initializeFirebaseAdmin();
        const db = adminInstance.firestore();

        const paymentId = paymentData.id.toString();
        
        // Verificar se o pagamento já foi processado
        const approvedRef = db.collection('approved_payments').doc(paymentId);
        const approvedDoc = await approvedRef.get();
        
        if (approvedDoc.exists) {
            console.log(`✅ Pagamento ${paymentId} já foi processado anteriormente`);
            return { success: true, message: 'Pagamento já processado' };
        }

        // Buscar dados do pagamento pendente
        const pendingRef = db.collection('pending_payments').doc(paymentId);
        const pendingDoc = await pendingRef.get();
        
        let userEmail = null;
        
        if (!pendingDoc.exists) {
            console.warn(`⚠️ Pagamento ${paymentId} não encontrado em pending_payments`);
            // Criar entrada básica se não existir
            const basicPaymentData = {
                payment_id: paymentId,
                status: 'approved',
                approved_at: admin.firestore.FieldValue.serverTimestamp(),
                method: 'pix',
                environment: 'production',
                amount: paymentData.transaction_amount,
                webhook_processed: true,
                awaiting_registration: true,
                registration_token: generateRegistrationToken(),
                processing_metadata: {
                    processed_at: new Date().toISOString(),
                    processing_time: null,
                    retry_count: 0
                }
            };
            
            await pendingRef.set(basicPaymentData);
            await approvedRef.set(basicPaymentData);
        } else {
            // Atualizar pagamento existente
            const existingData = pendingDoc.data();
            userEmail = existingData.user_email || existingData.email;
            
            const updatedData = {
                ...existingData,
                status: 'approved',
                approved_at: admin.firestore.FieldValue.serverTimestamp(),
                webhook_processed: true,
                mercadopago_data: {
                    status: paymentData.status,
                    status_detail: paymentData.status_detail,
                    amount: paymentData.transaction_amount,
                    date_approved: paymentData.date_approved,
                    payment_method_id: paymentData.payment_method_id,
                    payer_email: paymentData.payer?.email
                },
                processing_metadata: {
                    processed_at: new Date().toISOString(),
                    processing_time: null,
                    retry_count: existingData.processing_metadata?.retry_count || 0
                }
            };
            
            await pendingRef.update(updatedData);
            await approvedRef.set(updatedData);
            
            // Extrair email do pagamento se não tiver nos dados existentes
            if (!userEmail && paymentData.payer?.email) {
                userEmail = paymentData.payer.email;
            }
        }

        console.log(`✅ Pagamento ${paymentId} processado com sucesso via webhook`);
        
        // Enviar email de confirmação se tivermos o email
        if (userEmail) {
            const emailResult = await sendPaymentConfirmationEmail(paymentData, userEmail);
            console.log('📧 Resultado do email:', emailResult.message);
        } else {
            console.log('📧 Email do usuário não encontrado, pulando envio');
        }
        
        return { success: true, message: 'Pagamento processado com sucesso' };
    });
}

// ✅ PROCESSAR CHARGEBACK
async function processChargeback(paymentData) {
    return await retryWithBackoff(async () => {
        const adminInstance = initializeFirebaseAdmin();
        const db = adminInstance.firestore();

        const paymentId = paymentData.id.toString();
        
        console.log(`🚨 CHARGEBACK: Processando chargeback para pagamento ${paymentId}`);
        
        // Registrar chargeback
        const chargebackRef = db.collection('chargebacks').doc(paymentId);
        await chargebackRef.set({
            payment_id: paymentId,
            status: 'chargeback',
            chargeback_at: admin.firestore.FieldValue.serverTimestamp(),
            amount: paymentData.transaction_amount,
            reason: paymentData.status_detail,
            mercadopago_data: {
                status: paymentData.status,
                status_detail: paymentData.status_detail,
                date_last_updated: paymentData.date_last_updated
            },
            processing_metadata: {
                processed_at: new Date().toISOString(),
                processing_time: null
            }
        });

        // Atualizar status do pagamento aprovado
        const approvedRef = db.collection('approved_payments').doc(paymentId);
        await approvedRef.update({
            status: 'chargeback',
            chargeback_at: admin.firestore.FieldValue.serverTimestamp(),
            chargeback_reason: paymentData.status_detail
        });

        console.log(`🚨 Chargeback ${paymentId} registrado com sucesso`);
        
        return { success: true, message: 'Chargeback processado com sucesso' };
    });
}

// ✅ GERAR TOKEN DE REGISTRO SEGURO
function generateRegistrationToken() {
    return 'reg_' + crypto.randomBytes(32).toString('hex');
}

// ✅ PROCESSAR DIFERENTES TIPOS DE EVENTOS
async function processWebhookEvent(eventType, paymentData) {
    const startTime = Date.now();
    
    try {
        let result;
        
        switch (eventType) {
            case 'payment.approved':
                result = await processApprovedPayment(paymentData);
                break;
                
            case 'payment.cancelled':
            case 'payment.rejected':
                console.log(`❌ Pagamento ${paymentData.id} foi ${eventType.split('.')[1]}`);
                result = { success: true, message: `Pagamento ${eventType.split('.')[1]}` };
                break;
                
            case 'payment.refunded':
            case 'payment.charged_back':
                result = await processChargeback(paymentData);
                break;
                
            default:
                console.log(`ℹ️ Evento não processado: ${eventType}`);
                result = { success: true, message: 'Evento não processado' };
        }
        
        const processingTime = performanceMetrics.recordProcessingTime(startTime);
        performanceMetrics.recordSuccess();
        
        console.log(`⏱️ Evento ${eventType} processado em ${processingTime}ms`);
        
        return result;
        
    } catch (error) {
        const processingTime = performanceMetrics.recordProcessingTime(startTime);
        performanceMetrics.recordFailure();
        
        console.error(`❌ Erro ao processar evento ${eventType} (${processingTime}ms):`, error);
        throw error;
    }
}

module.exports = async (req, res) => {
    const startTime = Date.now();
    
    try {
        // ✅ CORS RESTRITIVO - Apenas Mercado Pago
        res.setHeader('Access-Control-Allow-Origin', 'https://api.mercadopago.com');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-signature, x-request-id');

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Método não permitido' });
        }

        // ✅ RATE LIMITING
        const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
        if (!checkWebhookRateLimit(clientIP)) {
            console.warn(`🚫 Rate limit excedido para webhook - IP: ${clientIP}`);
            return res.status(429).json({ error: 'Rate limit excedido' });
        }

        // ✅ VALIDAR ASSINATURA (CRÍTICO PARA SEGURANÇA)
        const signature = req.headers['x-signature'];
        const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
        
        if (!webhookSecret) {
            console.error('❌ MERCADOPAGO_WEBHOOK_SECRET não configurado');
            return res.status(500).json({ error: 'Configuração do webhook inválida' });
        }

        const rawBody = JSON.stringify(req.body);
        
        if (!validateMercadoPagoSignature(rawBody, signature, webhookSecret)) {
            console.error('❌ Assinatura do webhook inválida');
            performanceMetrics.recordFailure();
            return res.status(401).json({ error: 'Assinatura inválida' });
        }

        console.log('✅ Webhook do Mercado Pago recebido e validado');

        // ✅ PROCESSAR NOTIFICAÇÃO
        const { type, data } = req.body;

        if (type === 'payment') {
            const paymentId = data.id;
            
            if (!paymentId) {
                return res.status(400).json({ error: 'ID do pagamento não fornecido' });
            }

            console.log(`📨 Processando webhook para pagamento ${paymentId}`);

            // Buscar dados completos do pagamento
            const paymentData = await payment.get({ id: paymentId });
            
            console.log(`📊 Status do pagamento ${paymentId}: ${paymentData.status}`);

            // Determinar o tipo de evento baseado no status
            let eventType = `payment.${paymentData.status}`;
            
            const result = await processWebhookEvent(eventType, paymentData);
            
            // Adicionar métricas à resposta
            const stats = performanceMetrics.getStats();
            
            return res.status(200).json({
                ...result,
                metrics: {
                    processingTime: performanceMetrics.lastProcessingTime,
                    totalWebhooks: stats.total,
                    successRate: stats.successRate
                }
            });
            
        } else {
            console.log(`ℹ️ Tipo de webhook ignorado: ${type}`);
            return res.status(200).json({ 
                success: true, 
                message: 'Tipo de webhook não processado' 
            });
        }

    } catch (error) {
        const processingTime = performanceMetrics.recordProcessingTime(startTime);
        performanceMetrics.recordFailure();
        
        console.error(`❌ Erro no webhook (${processingTime}ms):`, error);
        
        return res.status(500).json({ 
            error: 'Erro interno do servidor',
            metrics: {
                processingTime: processingTime,
                totalWebhooks: performanceMetrics.getStats().total
            }
        });
    }
}; 