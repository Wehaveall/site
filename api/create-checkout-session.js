// 🔒 API PARA CRIAR SESSÃO DE CHECKOUT DO STRIPE
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Configuração CORS
const allowedOrigins = [
    'https://atalho.me',
    'https://www.atalho.me',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
].filter(Boolean);

function corsMiddleware(req, res) {
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin) || !origin) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
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

    try {
        console.log('🔵 [STRIPE] Criando sessão de checkout...');
        
        const { license_type, user_email, user_name = '', language = 'pt-br' } = req.body;

        // Validar entrada
        if (!license_type || !['anual', 'vitalicia'].includes(license_type)) {
            return res.status(400).json({ error: 'Tipo de licença inválido' });
        }
        
        if (!user_email || !user_email.includes('@')) {
            return res.status(400).json({ error: 'Email inválido' });
        }

        // Configurar produto baseado no tipo e linguagem
        let priceData, mode;
        
        if (license_type === 'anual') {
            // Preços por região/idioma
            const annualPrices = {
                'pt-br': { amount: 4990, currency: 'brl' }, // R$ 49,90
                'en': { amount: 1990, currency: 'usd' },    // $19.90
                'es': { amount: 1990, currency: 'usd' },    // $19.90
                'fr': { amount: 1790, currency: 'eur' },    // €17.90
                'de': { amount: 1790, currency: 'eur' },    // €17.90
                'it': { amount: 1790, currency: 'eur' }     // €17.90
            };
            
            const priceConfig = annualPrices[language] || annualPrices['en'];
            
            priceData = {
                currency: priceConfig.currency,
                product_data: {
                    name: 'Atalho - Licença Anual',
                    description: 'Acesso completo ao Atalho por 12 meses com renovação automática opcional',
                    metadata: {
                        license_type: 'anual',
                        product_id: 'atalho_anual'
                    }
                },
                unit_amount: priceConfig.amount,
                recurring: {
                    interval: 'year',
                    interval_count: 1
                }
            };
            mode = 'subscription';
        } else { // vitalicia
            // Preços vitalícios por região/idioma
            const lifetimePrices = {
                'pt-br': { amount: 29900, currency: 'brl' }, // R$ 299,00
                'en': { amount: 9900, currency: 'usd' },     // $99.00
                'es': { amount: 9900, currency: 'usd' },     // $99.00
                'fr': { amount: 8900, currency: 'eur' },     // €89.00
                'de': { amount: 8900, currency: 'eur' },     // €89.00
                'it': { amount: 8900, currency: 'eur' }      // €89.00
            };
            
            const priceConfig = lifetimePrices[language] || lifetimePrices['en'];
            
            priceData = {
                currency: priceConfig.currency,
                product_data: {
                    name: 'Atalho - Licença Vitalícia',
                    description: 'Acesso vitalício ao Atalho - pagamento único',
                    metadata: {
                        license_type: 'vitalicia',
                        product_id: 'atalho_vitalicia'
                    }
                },
                unit_amount: priceConfig.amount
            };
            mode = 'payment';
        }

        // Criar ou buscar cliente
        let customer;
        try {
            const existingCustomers = await stripe.customers.list({
                email: user_email,
                limit: 1
            });

            if (existingCustomers.data.length > 0) {
                customer = existingCustomers.data[0];
                console.log(`🔵 [STRIPE] Cliente existente encontrado: ${customer.id}`);
            } else {
                customer = await stripe.customers.create({
                    email: user_email,
                    name: user_name,
                    metadata: {
                        source: 'atalho_website',
                        language: language
                    }
                });
                console.log(`🔵 [STRIPE] Novo cliente criado: ${customer.id}`);
            }
        } catch (customerError) {
            console.error('❌ [STRIPE] Erro ao gerenciar cliente:', customerError);
            throw new Error('Erro ao configurar cliente');
        }

        // URLs de sucesso e cancelamento baseadas no idioma
        const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://atalho.me';
        const successUrl = `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}&lang=${language}`;
        const cancelUrl = `${baseUrl}/comprar.html?lang=${language}&cancelled=true`;

        // Criar sessão de checkout
        const sessionConfig = {
            customer: customer.id,
            payment_method_types: ['card'],
            line_items: [{
                price_data: priceData,
                quantity: 1,
            }],
            mode: mode,
            success_url: successUrl,
            cancel_url: cancelUrl,
            
            // Metadados importantes para o webhook
            metadata: {
                license_type: license_type,
                user_email: user_email,
                user_name: user_name,
                language: language,
                source: 'atalho_website'
            },

            // Configurações específicas para assinaturas
            ...(mode === 'subscription' && {
                subscription_data: {
                    metadata: {
                        license_type: license_type,
                        user_email: user_email,
                        language: language
                    }
                }
            }),

            // Configurações de pagamento único
            ...(mode === 'payment' && {
                payment_intent_data: {
                    metadata: {
                        license_type: license_type,
                        user_email: user_email,
                        language: language
                    }
                }
            }),

            // Permitir códigos promocionais
            allow_promotion_codes: true,

            // Configurações de cobrança
            billing_address_collection: 'required',
            
            // Para assinaturas anuais, mostrar informações claras
            ...(license_type === 'anual' && {
                consent_collection: {
                    terms_of_service: 'required'
                }
            }),

            // Configurações de localização
            locale: language === 'pt-br' ? 'pt-BR' : 
                   language === 'es' ? 'es' : 
                   language === 'fr' ? 'fr' : 
                   language === 'de' ? 'de' : 
                   language === 'it' ? 'it' : 'en'
        };

        const session = await stripe.checkout.sessions.create(sessionConfig);

        console.log(`✅ [STRIPE] Sessão criada para ${user_email}: ${session.id}`);
        
        // Headers de segurança
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        
        res.json({ 
            success: true,
            sessionId: session.id,
            url: session.url,
            mode: mode,
            licenseType: license_type
        });

    } catch (error) {
        console.error('❌ [STRIPE] Erro ao criar sessão:', error);
        
        // Resposta de erro padronizada
        const errorResponse = {
            success: false,
            error: 'Erro interno do servidor',
            message: error.message,
            ...(process.env.NODE_ENV === 'development' && { details: error.stack })
        };
        
        res.status(500).json(errorResponse);
    }
};