// PayPal Service - Integração com Firebase
class PayPalService {
    constructor() {
        this.paypal = null;
        this.initialized = false;
        this.currentButtons = null;
    }

    async initialize() {
        if (this.initialized) {
            console.log('✅ PayPal já inicializado');
            return;
        }

        try {
            // Aguardar configuração estar disponível
            await this.ensureConfigLoaded();
            
            const config = window.secureConfig || window.fallbackConfig;
            if (!config || !config.paypal_client_id) {
                throw new Error('Client ID do PayPal não encontrado na configuração');
            }

            // Verificar se o PayPal SDK já foi carregado
            if (typeof paypal === 'undefined') {
                await this.loadPayPalSDK(config.paypal_client_id);
            }

            this.paypal = window.paypal;
            console.log('✅ PayPal inicializado com sucesso');
            this.initialized = true;

        } catch (error) {
            console.error('❌ Erro ao inicializar PayPal:', error);
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

    async loadPayPalSDK(clientId) {
        return new Promise((resolve, reject) => {
            if (document.getElementById('paypal-sdk')) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.id = 'paypal-sdk';
            script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD,EUR,BRL&intent=capture&components=buttons`;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async createOrder(amount, currency = 'USD', userEmail) {
        await this.initialize();
        
        try {
            const config = window.secureConfig || window.fallbackConfig;
            const apiUrl = config.api_base_url || '/api';
            
            console.log('💰 Criando ordem no PayPal...');
            
            const response = await fetch(`${apiUrl}/create-paypal-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: amount,
                    currency: currency,
                    customer_email: userEmail,
                    product_name: 'Atalho - Licença Anual',
                    return_url: window.location.origin + '/success.html',
                    cancel_url: window.location.origin + '/comprar.html'
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao criar pagamento');
            }

            const data = await response.json();
            console.log('✅ Ordem PayPal criada:', data.order_id);
            return data.order_id;

        } catch (error) {
            console.error('❌ Erro ao criar ordem PayPal:', error);
            throw error;
        }
    }

    async captureOrder(orderID, userEmail) {
        try {
            const config = window.secureConfig || window.fallbackConfig;
            const apiUrl = config.api_base_url || '/api';
            
            console.log('💳 Capturando pagamento PayPal...');
            
            const response = await fetch(`${apiUrl}/capture-paypal-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order_id: orderID,
                    customer_email: userEmail
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao capturar pagamento');
            }

            const data = await response.json();
            console.log('✅ Pagamento PayPal capturado:', data);
            
            // Atualizar dados do usuário no Firebase
            await this.updateUserSubscription(userEmail, data);
            
            return data;

        } catch (error) {
            console.error('❌ Erro ao capturar pagamento PayPal:', error);
            throw error;
        }
    }

    async renderButtons(containerSelector, userEmail, currency = 'USD') {
        await this.initialize();
        
        try {
            const container = document.querySelector(containerSelector);
            if (!container) {
                throw new Error(`Container ${containerSelector} não encontrado`);
            }

            // Limpar container e remover botões existentes
            this.destroyButtons();
            container.innerHTML = '';

            const amount = this.getAmountByCurrency(currency);
            
            this.currentButtons = this.paypal.Buttons({
                style: {
                    layout: 'vertical',
                    color: 'blue',
                    shape: 'rect',
                    label: 'paypal',
                    height: 40
                },

                createOrder: async (data, actions) => {
                    try {
                        const orderID = await this.createOrder(amount, currency, userEmail);
                        return orderID;
                    } catch (error) {
                        console.error('❌ Erro ao criar ordem:', error);
                        throw error;
                    }
                },

                onApprove: async (data, actions) => {
                    try {
                        console.log('✅ Pagamento aprovado, capturando...');
                        const captureData = await this.captureOrder(data.orderID, userEmail);
                        
                        // Mostrar sucesso e redirecionar
                        this.showSuccessMessage();
                        setTimeout(() => {
                            window.location.href = '/success.html';
                        }, 2000);
                        
                        return captureData;
                    } catch (error) {
                        console.error('❌ Erro ao capturar pagamento:', error);
                        this.showErrorMessage(error.message);
                    }
                },

                onError: (err) => {
                    console.error('❌ Erro no PayPal:', err);
                    this.showErrorMessage('Erro no processamento do pagamento. Tente novamente.');
                },

                onCancel: (data) => {
                    console.log('⚠️ Pagamento cancelado pelo usuário');
                    this.showCancelMessage();
                }
            });

            if (this.currentButtons.isEligible()) {
                await this.currentButtons.render(containerSelector);
                console.log('✅ Botões PayPal renderizados');
            } else {
                throw new Error('PayPal não disponível para esta configuração');
            }

        } catch (error) {
            console.error('❌ Erro ao renderizar botões PayPal:', error);
            throw error;
        }
    }

    async updateUserSubscription(userEmail, paymentData) {
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
                    payment_method: 'paypal',
                    payment_id: paymentData.id || paymentData.order_id,
                    amount: paymentData.amount || paymentData.purchase_units?.[0]?.amount?.value,
                    currency: paymentData.currency || paymentData.purchase_units?.[0]?.amount?.currency_code,
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
            'USD': '19.90',
            'EUR': '19.90',
            'BRL': '49.90'
        };
        
        return amounts[currency.toUpperCase()] || amounts['USD'];
    }

    getCurrencyByLanguage(language) {
        const currencies = {
            'pt-br': 'BRL',
            'en': 'USD',
            'es': 'USD',
            'fr': 'EUR',
            'de': 'EUR',
            'it': 'EUR'
        };
        
        return currencies[language] || 'USD';
    }

    showSuccessMessage() {
        // Usar função global se disponível
        if (typeof showSuccess === 'function') {
            showSuccess('Pagamento PayPal realizado com sucesso!');
        } else {
            alert('Pagamento realizado com sucesso!');
        }
    }

    showErrorMessage(message) {
        // Usar função global se disponível
        if (typeof showError === 'function') {
            showError(message);
        } else {
            alert(`Erro: ${message}`);
        }
    }

    showCancelMessage() {
        console.log('ℹ️ Usuário cancelou o pagamento PayPal');
        // Não mostrar mensagem de erro para cancelamento
    }

    destroyButtons() {
        if (this.currentButtons) {
            try {
                // PayPal não tem método destroy direto, então limpamos o container
                this.currentButtons = null;
                console.log('🗑️ Botões PayPal removidos');
            } catch (error) {
                console.warn('⚠️ Erro ao remover botões PayPal:', error);
            }
        }
    }

    destroy() {
        this.destroyButtons();
        this.initialized = false;
        console.log('🗑️ PayPal Service limpo');
    }
}

// Instância global
window.paypalService = new PayPalService();

console.log('🟡 PayPal Service carregado'); 