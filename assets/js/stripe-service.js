// Stripe Service - Integração com Firebase
class StripeService {
    constructor() {
        this.stripe = null;
        this.elements = null;
        this.card = null;
        this.clientSecret = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) {
            console.log('✅ Stripe já inicializado');
            return;
        }

        try {
            // Aguardar configuração estar disponível
            await this.ensureConfigLoaded();
            
            const config = window.secureConfig || window.fallbackConfig;
            if (!config || !config.stripe_public_key) {
                throw new Error('Chave pública do Stripe não encontrada na configuração');
            }

            // Inicializar Stripe
            this.stripe = Stripe(config.stripe_public_key);
            
            console.log('✅ Stripe inicializado com sucesso');
            this.initialized = true;

        } catch (error) {
            console.error('❌ Erro ao inicializar Stripe:', error);
            throw error;
        }
    }

    async ensureConfigLoaded() {
        let attempts = 0;
        const maxAttempts = 50;
        
        while ((!window.secureConfig && !window.fallbackConfig) && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.secureConfig && !window.fallbackConfig) {
            throw new Error('Configuração não carregada');
        }
    }

    async createPaymentIntent(amount, currency = 'usd', userEmail) {
        await this.initialize();
        
        try {
            const config = window.secureConfig || window.fallbackConfig;
            const apiUrl = config.api_base_url || '/api';
            
            console.log('💰 Criando Payment Intent no Stripe...');
            
            const response = await fetch(`${apiUrl}/create-stripe-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: amount, // em centavos
                    currency: currency,
                    customer_email: userEmail,
                    product_name: 'Atalho - Licença Anual',
                    return_url: window.location.origin + '/success.html'
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao criar pagamento');
            }

            const data = await response.json();
            this.clientSecret = data.client_secret;
            
            console.log('✅ Payment Intent criado:', data.payment_intent_id);
            return data;

        } catch (error) {
            console.error('❌ Erro ao criar Payment Intent:', error);
            throw error;
        }
    }

    async createCardElement(containerSelector) {
        await this.initialize();
        
        try {
            const appearance = {
                theme: 'stripe',
                variables: {
                    colorPrimary: '#dbc9ad',
                    colorBackground: '#ffffff',
                    colorText: '#30313d',
                    colorDanger: '#df1b41',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    spacingUnit: '4px',
                    borderRadius: '8px',
                }
            };

            this.elements = this.stripe.elements({
                clientSecret: this.clientSecret,
                appearance: appearance
            });

            this.card = this.elements.create('payment', {
                layout: 'tabs'
            });

            const container = document.querySelector(containerSelector);
            if (container) {
                container.innerHTML = ''; // Limpar container
                this.card.mount(containerSelector);
                console.log('✅ Elementos do Stripe montados');
            } else {
                throw new Error(`Container ${containerSelector} não encontrado`);
            }

            return this.card;

        } catch (error) {
            console.error('❌ Erro ao criar elementos do Stripe:', error);
            throw error;
        }
    }

    async confirmPayment(userEmail, userName) {
        try {
            if (!this.stripe || !this.clientSecret) {
                throw new Error('Stripe não inicializado ou Payment Intent não criado');
            }

            console.log('💳 Confirmando pagamento...');

            const { error, paymentIntent } = await this.stripe.confirmPayment({
                elements: this.elements,
                confirmParams: {
                    return_url: window.location.origin + '/success.html',
                    payment_method_data: {
                        billing_details: {
                            email: userEmail,
                            name: userName
                        }
                    }
                },
                redirect: 'if_required'
            });

            if (error) {
                console.error('❌ Erro na confirmação do pagamento:', error);
                throw new Error(error.message);
            }

            if (paymentIntent.status === 'succeeded') {
                console.log('✅ Pagamento confirmado com sucesso!');
                
                // Atualizar dados do usuário no Firebase
                await this.updateUserSubscription(userEmail, paymentIntent);
                
                return {
                    success: true,
                    paymentIntent: paymentIntent
                };
            } else {
                throw new Error(`Status do pagamento: ${paymentIntent.status}`);
            }

        } catch (error) {
            console.error('❌ Erro ao confirmar pagamento:', error);
            throw error;
        }
    }

    async updateUserSubscription(userEmail, paymentIntent) {
        try {
            // Atualizar via API para garantir consistência
            const config = window.secureConfig || window.fallbackConfig;
            const apiUrl = config.api_base_url || '/api';
            
            await fetch(`${apiUrl}/update-user-subscription`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: userEmail,
                    payment_method: 'stripe',
                    payment_id: paymentIntent.id,
                    amount: paymentIntent.amount / 100, // converter de centavos
                    currency: paymentIntent.currency,
                    status: 'active'
                })
            });
            
            console.log('✅ Assinatura do usuário atualizada');
            
        } catch (error) {
            console.error('⚠️ Erro ao atualizar assinatura (não crítico):', error);
            // Não falhar o processo por causa disso
        }
    }

    getAmountByCurrency(currency) {
        const amounts = {
            'usd': 1990, // $19.90 em centavos
            'eur': 1990, // €19.90 em centavos
            'brl': 4990  // R$49.90 em centavos
        };
        
        return amounts[currency.toLowerCase()] || amounts['usd'];
    }

    getCurrencyByLanguage(language) {
        const currencies = {
            'pt-br': 'brl',
            'en': 'usd',
            'es': 'usd',
            'fr': 'eur',
            'de': 'eur',
            'it': 'eur'
        };
        
        return currencies[language] || 'usd';
    }

    destroy() {
        if (this.card) {
            this.card.unmount();
            this.card = null;
        }
        if (this.elements) {
            this.elements = null;
        }
        this.clientSecret = null;
        console.log('🗑️ Stripe elements removidos');
    }
}

// Instância global
window.stripeService = new StripeService();

console.log('🔵 Stripe Service carregado'); 