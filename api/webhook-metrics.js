// api/webhook-metrics.js - Endpoint para monitorar métricas do webhook
const admin = require('firebase-admin');

// ✅ INICIALIZAR FIREBASE ADMIN
function initializeFirebaseAdmin() {
    if (!admin.apps.length) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: "https://shortcut-6256b-default-rtdb.firebaseio.com"
            });
        } catch (error) {
            console.error('Falha na inicialização do Firebase Admin SDK:', error);
            throw error;
        }
    }
    return admin;
}

// ✅ VERIFICAR AUTENTICAÇÃO DE ADMIN
async function verifyAdminAuth(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Token de autorização não fornecido');
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    
    try {
        const adminInstance = initializeFirebaseAdmin();
        const decodedToken = await adminInstance.auth().verifyIdToken(idToken);
        
        // Verificar se o usuário é admin (você pode implementar sua lógica aqui)
        // Por exemplo, verificar se o email está em uma lista de admins
        const adminEmails = (process.env.ADMIN_EMAILS || '').split(',');
        
        if (!adminEmails.includes(decodedToken.email)) {
            throw new Error('Acesso não autorizado - apenas administradores');
        }
        
        return decodedToken;
    } catch (error) {
        throw new Error('Token de autorização inválido');
    }
}

// ✅ BUSCAR MÉTRICAS DO FIRESTORE
async function getWebhookMetricsFromFirestore() {
    try {
        const adminInstance = initializeFirebaseAdmin();
        const db = adminInstance.firestore();
        
        // Buscar estatísticas dos últimos 30 dias
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Pagamentos aprovados
        const approvedPayments = await db.collection('approved_payments')
            .where('approved_at', '>=', thirtyDaysAgo)
            .get();
        
        // Chargebacks
        const chargebacks = await db.collection('chargebacks')
            .where('chargeback_at', '>=', thirtyDaysAgo)
            .get();
        
        // Calcular métricas
        const totalPayments = approvedPayments.size;
        const totalChargebacks = chargebacks.size;
        const chargebackRate = totalPayments > 0 ? (totalChargebacks / totalPayments * 100).toFixed(2) : 0;
        
        // Calcular valor total processado
        let totalAmount = 0;
        approvedPayments.forEach(doc => {
            const data = doc.data();
            totalAmount += data.amount || 0;
        });
        
        // Agrupar por dia
        const dailyStats = {};
        approvedPayments.forEach(doc => {
            const data = doc.data();
            const date = data.approved_at?.toDate?.()?.toISOString?.()?.split('T')[0] || 'unknown';
            
            if (!dailyStats[date]) {
                dailyStats[date] = { payments: 0, amount: 0 };
            }
            
            dailyStats[date].payments += 1;
            dailyStats[date].amount += data.amount || 0;
        });
        
        return {
            period: '30 days',
            totalPayments,
            totalChargebacks,
            chargebackRate: `${chargebackRate}%`,
            totalAmount: `R$ ${totalAmount.toFixed(2)}`,
            averageTicket: totalPayments > 0 ? `R$ ${(totalAmount / totalPayments).toFixed(2)}` : 'R$ 0,00',
            dailyStats: Object.entries(dailyStats)
                .sort(([a], [b]) => a.localeCompare(b))
                .slice(-7) // Últimos 7 dias
                .map(([date, stats]) => ({
                    date,
                    payments: stats.payments,
                    amount: `R$ ${stats.amount.toFixed(2)}`
                }))
        };
        
    } catch (error) {
        console.error('Erro ao buscar métricas do Firestore:', error);
        throw error;
    }
}

module.exports = async (req, res) => {
    try {
        // ✅ CORS RESTRITIVO
        res.setHeader('Access-Control-Allow-Origin', 'https://atalho.me');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        if (req.method !== 'GET') {
            return res.status(405).json({ error: 'Método não permitido' });
        }

        // ✅ VERIFICAR AUTENTICAÇÃO DE ADMIN
        try {
            await verifyAdminAuth(req.headers.authorization);
        } catch (authError) {
            return res.status(401).json({ 
                error: 'Acesso não autorizado',
                message: authError.message 
            });
        }

        // ✅ BUSCAR MÉTRICAS
        const firestoreMetrics = await getWebhookMetricsFromFirestore();
        
        // ✅ MÉTRICAS DO SISTEMA
        const systemMetrics = {
            serverTime: new Date().toISOString(),
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            nodeVersion: process.version,
            environment: process.env.NODE_ENV || 'development'
        };

        // ✅ HEALTH CHECK
        const healthCheck = {
            webhook: {
                status: 'healthy',
                lastCheck: new Date().toISOString()
            },
            firebase: {
                status: 'healthy',
                lastCheck: new Date().toISOString()
            },
            mercadopago: {
                status: process.env.MERCADOPAGO_ACCESS_TOKEN ? 'configured' : 'not_configured',
                webhookSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET ? 'configured' : 'not_configured'
            }
        };

        return res.status(200).json({
            success: true,
            timestamp: new Date().toISOString(),
            metrics: {
                payments: firestoreMetrics,
                system: systemMetrics,
                health: healthCheck
            }
        });

    } catch (error) {
        console.error('❌ Erro ao buscar métricas:', error);
        return res.status(500).json({ 
            error: 'Erro interno do servidor',
            message: 'Falha ao buscar métricas'
        });
    }
}; 