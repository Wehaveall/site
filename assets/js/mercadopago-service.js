// mercadopago-service.js - Com diagnóstico avançado e solução de CORS

class MercadoPagoService {
    constructor() {
        // Use suas credenciais do Mercado Pago
        this.publicKey = 'TEST-f6d0456b-ff4f-4c22-afef-53b2c4d4ec35';
        this.accessToken = 'TEST-7601417945820618-013008-87f0900af129b320e5d12f6fabe39620-231065568';
        this.apiBaseUrl = 'https://api.mercadopago.com';

        // Inicializa o SDK do Mercado Pago se estiver disponível
        this.initSDK();
    }

    initSDK() {
        try {
            // Verifica se o SDK do Mercado Pago foi carregado
            if (typeof MercadoPago !== 'undefined') {
                alert("SDK do Mercado Pago detectado!");
                this.mp = new MercadoPago(this.publicKey);
                console.log("SDK do Mercado Pago inicializado com sucesso");
            } else {
                console.warn("SDK do Mercado Pago não encontrado. Algumas funcionalidades podem não estar disponíveis.");
            }
        } catch (error) {
            console.error("Erro ao inicializar SDK do Mercado Pago:", error);
        }
    }

    async createPixPayment() {
        try {
            alert("Iniciando criação de pagamento PIX...");
            console.log('Criando pagamento PIX com token:', this.accessToken);

            // Método 1: Usar nosso próprio CORS Proxy
            // Esta é uma solução temporária para desenvolvimento
            const corsProxyUrl = 'https://cors-anywhere.herokuapp.com/';
            const apiUrl = `${corsProxyUrl}${this.apiBaseUrl}/v1/payments`;

            alert("Tentando via proxy CORS...");

            const paymentData = {
                transaction_amount: 49.90,
                description: "Licença Anual do Atalho",
                payment_method_id: "pix",
                payer: {
                    email: "cliente@teste.com",
                    first_name: "Cliente",
                    last_name: "Teste"
                }
            };

            console.log("Enviando dados:", JSON.stringify(paymentData));

            // Tentativa 1: Usando fetch com proxy CORS
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(paymentData)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Erro na resposta do proxy: ${response.status} - ${errorText}`);
                    throw new Error(`Status: ${response.status} - ${errorText}`);
                }

                const responseData = await response.json();
                return this.processPixResponse(responseData);
            } catch (fetchError) {
                console.error("Erro na tentativa com proxy CORS:", fetchError);
                alert(`Erro na tentativa com proxy: ${fetchError.message}`);

                // Se o proxy falhar, tente método alternativo ou use mockup
                alert("Tentando método alternativo...");
                return await this.createPixWithAlternativeMethod();
            }
        } catch (error) {
            console.error('Erro geral ao criar pagamento PIX:', error);
            alert(`Erro ao gerar PIX: ${error.message}`);

            // Em último caso, use uma resposta simulada para demonstração
            alert("Usando resposta simulada para demonstração");
            return this._getMockPixResponse();
        }
    }

    // Método alternativo - usando XMLHttpRequest em vez de fetch
    async createPixWithAlternativeMethod() {
        return new Promise((resolve, reject) => {
            try {
                alert("Tentando com XMLHttpRequest...");
                const xhr = new XMLHttpRequest();
                const url = `${this.apiBaseUrl}/v1/payments`;

                xhr.open('POST', url, true);
                xhr.setRequestHeader('Authorization', `Bearer ${this.accessToken}`);
                xhr.setRequestHeader('Content-Type', 'application/json');

                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            try {
                                const response = JSON.parse(xhr.responseText);
                                resolve(this.processPixResponse(response));
                            } catch (e) {
                                reject(new Error(`Erro ao processar resposta: ${e.message}`));
                            }
                        } else {
                            reject(new Error(`Erro na requisição: ${xhr.status} - ${xhr.statusText}`));
                        }
                    }
                }.bind(this);

                xhr.onerror = function () {
                    reject(new Error('Erro de rede na requisição XMLHttpRequest'));
                };

                const data = {
                    transaction_amount: 49.90,
                    description: "Licença Anual do Atalho",
                    payment_method_id: "pix",
                    payer: {
                        email: "cliente@teste.com",
                        first_name: "Cliente",
                        last_name: "Teste"
                    }
                };

                xhr.send(JSON.stringify(data));
            } catch (error) {
                reject(error);
            }
        });
    }

    // Processamento da resposta PIX
    processPixResponse(paymentData) {
        console.log('Resposta do pagamento PIX recebida:', paymentData);

        if (paymentData.status === 'pending' &&
            paymentData.point_of_interaction &&
            paymentData.point_of_interaction.transaction_data) {

            const transactionData = paymentData.point_of_interaction.transaction_data;

            alert("QR Code PIX gerado com sucesso!");

            return {
                success: true,
                paymentId: paymentData.id,
                qrCodeBase64: transactionData.qr_code_base64,
                qrCodeText: transactionData.qr_code,
                expirationDate: new Date(paymentData.date_of_expiration)
            };
        } else {
            console.error('Resposta inválida do Mercado Pago:', paymentData);
            throw new Error('Falha ao gerar QR code PIX');
        }
    }

    // Mock para demonstração e testes sem depender da API
    _getMockPixResponse() {
        alert("Gerando resposta simulada de QR Code");

        // Gerar um ID de pagamento aleatório
        const paymentId = 'PIX' + Math.floor(Math.random() * 10000000);

        // QR Code base64 de exemplo que funciona
        const qrCodeBase64 = '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';

        // Gerar data de expiração (30 minutos no futuro)
        const expirationDate = new Date();
        expirationDate.setMinutes(expirationDate.getMinutes() + 30);

        return {
            success: true,
            paymentId: paymentId,
            qrCodeBase64: qrCodeBase64,
            qrCodeText: '00020126580014br.gov.bcb.pix0136a71c2105-6d9a-4a5f-9b48-5b3459c6d0705204000053039865802BR5925NOME EMPRESA DEMONSTRACAO6009SAO PAULO62070503***63041D3D',
            expirationDate: expirationDate
        };
    }

    // Método para verificar o status do pagamento
    async checkPaymentStatus(paymentId) {
        try {
            console.log(`Verificando status do pagamento ${paymentId}...`);

            // Se for um pagamento simulado (começa com 'PIX')
            if (typeof paymentId === 'string' && paymentId.startsWith('PIX')) {
                // Simulação de retorno de status
                const random = Math.random();
                // Aumenta a chance de sucesso para demonstração
                const isApproved = random < 0.3;

                return {
                    success: true,
                    paymentId: paymentId,
                    status: isApproved ? 'approved' : 'pending'
                };
            }

            // Para pagamentos reais, tenta verificar o status na API
            const url = `${this.apiBaseUrl}/v1/payments/${paymentId}`;

            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`Erro ao verificar status: ${response.status}`);
                }

                const paymentData = await response.json();

                return {
                    success: true,
                    paymentId: paymentData.id,
                    status: paymentData.status
                };
            } catch (error) {
                console.error('Erro ao verificar status via API:', error);

                // Se falhar, retorna pending para não interromper o fluxo
                return {
                    success: true,
                    paymentId: paymentId,
                    status: 'pending'
                };
            }
        } catch (error) {
            console.error('Erro geral ao verificar status do pagamento:', error);
            return { success: false, error: error.message };
        }
    }
}