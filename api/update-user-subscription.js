// API para atualizar assinatura do usuário no Firebase
const admin = require('firebase-admin');
const { initializeFirebaseAdmin } = require('./firebase-config');

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
        // Inicializar Firebase Admin se necessário
        await initializeFirebaseAdmin();
        const db = admin.firestore();

        const {
            email,
            payment_method,
            payment_id,
            amount,
            currency,
            status = 'active'
        } = req.body;

        // Validações
        if (!email) {
            return res.status(400).json({
                error: 'Email obrigatório',
                details: 'O email do usuário é obrigatório'
            });
        }

        if (!payment_method) {
            return res.status(400).json({
                error: 'Método de pagamento obrigatório',
                details: 'O método de pagamento é obrigatório'
            });
        }

        if (!payment_id) {
            return res.status(400).json({
                error: 'ID do pagamento obrigatório',
                details: 'O ID do pagamento é obrigatório'
            });
        }

        if (!amount || parseFloat(amount) <= 0) {
            return res.status(400).json({
                error: 'Valor inválido',
                details: 'O valor deve ser maior que zero'
            });
        }

        console.log('📝 Atualizando assinatura do usuário:', {
            email,
            payment_method,
            payment_id,
            amount,
            currency,
            status
        });

        // Buscar usuário pelo email
        const usersRef = db.collection('users');
        const userQuery = await usersRef.where('email', '==', email).limit(1).get();

        if (userQuery.empty) {
            return res.status(404).json({
                error: 'Usuário não encontrado',
                details: 'Não foi possível encontrar um usuário com este email'
            });
        }

        const userDoc = userQuery.docs[0];
        const userId = userDoc.id;
        const currentUserData = userDoc.data();

        // Calcular data de expiração (1 ano a partir de agora)
        const now = new Date();
        const expirationDate = new Date(now);
        expirationDate.setFullYear(now.getFullYear() + 1);

        // Dados da assinatura
        const subscriptionData = {
            status: status,
            payment_method: payment_method,
            payment_id: payment_id,
            amount: parseFloat(amount),
            currency: currency?.toUpperCase() || 'USD',
            started_at: admin.firestore.FieldValue.serverTimestamp(),
            expires_at: admin.firestore.Timestamp.fromDate(expirationDate),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        };

        // Dados de pagamento para histórico
        const paymentData = {
            id: payment_id,
            method: payment_method,
            amount: parseFloat(amount),
            currency: currency?.toUpperCase() || 'USD',
            status: 'completed',
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            user_email: email,
            user_id: userId
        };

        // Dados para atualizar no usuário
        const userUpdateData = {
            subscription: subscriptionData,
            subscription_status: status,
            is_premium: status === 'active',
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        };

        // Usar transação para garantir consistência
        await db.runTransaction(async (transaction) => {
            // Atualizar dados do usuário
            transaction.update(userDoc.ref, userUpdateData);

            // Adicionar registro de pagamento
            const paymentRef = db.collection('payments').doc();
            transaction.set(paymentRef, paymentData);

            // Adicionar/atualizar dados de assinatura
            const subscriptionRef = db.collection('subscriptions').doc(userId);
            transaction.set(subscriptionRef, {
                user_id: userId,
                user_email: email,
                ...subscriptionData
            }, { merge: true });
        });

        console.log('✅ Assinatura atualizada com sucesso para usuário:', userId);

        // Resposta de sucesso
        return res.status(200).json({
            success: true,
            message: 'Assinatura atualizada com sucesso',
            user_id: userId,
            subscription: subscriptionData,
            payment: {
                id: payment_id,
                amount: parseFloat(amount),
                currency: currency?.toUpperCase() || 'USD',
                method: payment_method
            }
        });

    } catch (error) {
        console.error('❌ Erro ao atualizar assinatura:', error);

        // Tratamento de erros específicos do Firebase
        if (error.code === 'permission-denied') {
            return res.status(403).json({
                error: 'Permissão negada',
                details: 'Não há permissão para atualizar os dados do usuário'
            });
        }

        if (error.code === 'unavailable') {
            return res.status(503).json({
                error: 'Serviço indisponível',
                details: 'Firebase temporariamente indisponível'
            });
        }

        if (error.code === 'deadline-exceeded') {
            return res.status(408).json({
                error: 'Timeout',
                details: 'Operação demorou mais que o esperado'
            });
        }

        // Erro genérico
        return res.status(500).json({
            error: 'Erro interno do servidor',
            details: 'Erro ao atualizar assinatura do usuário',
            message: error.message
        });
    }
} 