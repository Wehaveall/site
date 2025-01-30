// mercadopago-service.js

class MercadoPagoService {
    constructor() {
        this.mp = new MercadoPago('TEST-f6d0456b-ff4f-4c22-afef-53b2c4d4ec35', {
            locale: 'pt-BR'
        });

        // URL da sua função Netlify
        this.apiUrl = 'https://seu-site-netlify.netlify.app/.netlify/functions/create-preference';
    }

    async createPixPayment() {
        try {
            // Chamar a função Netlify
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: 49.90,
                    description: 'Licença Anual - Atalho App'
                })
            });

            if (!response.ok) {
                throw new Error('Erro na resposta do servidor');
            }

            const data = await response.json();

            // Criar o Brick com a preferência retornada
            const bricksBuilder = await this.mp.bricks();

            const settings = {
                initialization: {
                    preferenceId: data.id
                },
                callbacks: {
                    onReady: () => {
                        console.log('Brick pronto');
                    },
                    onSubmit: (formData) => {
                        console.log('Pagamento iniciado', formData);
                    },
                    onError: (error) => {
                        console.error('Erro no brick:', error);
                    }
                }
            };

            return {
                
                success: true,
                bricksBuilder,
                settings
            };

        } catch (error) {
            console.error('Erro ao criar preferência:', error);
            return {
                success: false,
                error: 'Erro ao iniciar pagamento'
            };
        }
    }
}

// Cria uma instância global
window.mpService = new MercadoPagoService();