// pix-modal.js - Versão PRODUÇÃO com Email de Confirmação

class PixModalController {
    constructor() {
        this.modalElement = document.getElementById('pix-modal');
        this.modalRoot = document.getElementById('pix-modal-root');
        this.paymentCheckInterval = null;
        this.mpService = new MercadoPagoService();
        this.paymentExpirationTime = null;
        this.countdownInterval = null;
        this.currentPaymentId = null;
        this.initialized = false;
    }

    async initialize() {
        if (!this.initialized) {
            await this.mpService.initialize();
            this.initialized = true;
        }
    }

    async show() {
        await this.initialize();
        this.modalElement.classList.remove('hidden');
        this.generatePixPayment();
    }

    hide() {
        this.modalElement.classList.add('hidden');
        this.clearIntervals();
    }

    clearIntervals() {
        if (this.paymentCheckInterval) {
            clearInterval(this.paymentCheckInterval);
            this.paymentCheckInterval = null;
        }

        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }

    async generatePixPayment() {
        this.renderLoading();

        try {
            console.log("🎯 PRODUÇÃO: Solicitando geração de QR Code PIX REAL...");
            const result = await this.mpService.createPixPayment();

            if (result.success) {
                console.log("✅ PRODUÇÃO: QR Code PIX REAL gerado com sucesso!");
                this.paymentExpirationTime = result.expirationDate;
                this.currentPaymentId = result.paymentId;
                this.renderQRCode(result.qrCodeBase64, result.qrCodeText);
                this.startPaymentCheck(result.paymentId);
                this.startExpirationCountdown();

                // Salva o pagamento pendente no Firebase
                try {
                    const paymentRef = db.collection('pending_payments').doc(result.paymentId.toString());
                    await paymentRef.set({
                        payment_id: result.paymentId,
                        amount: 49.90,
                        status: 'pending',
                        created_at: firebase.firestore.FieldValue.serverTimestamp(),
                        method: 'pix',
                        environment: 'production',
                        anonymous_uid: firebase.auth().currentUser?.uid || null,
                        awaiting_registration: true // Indica que precisa de cadastro
                    });
                    console.log("✅ Registro de pagamento criado no Firestore");
                } catch (dbError) {
                    console.warn("⚠️ Erro ao salvar no Firebase (não crítico):", dbError);
                }
            } else {
                console.error("❌ PRODUÇÃO: Erro na geração do QR Code:", result.error);
                this.renderError(result.error || 'Erro ao gerar QR Code PIX');
            }
        } catch (error) {
            console.error('❌ PRODUÇÃO: Erro ao gerar pagamento:', error);
            this.renderError('Erro ao processar pagamento');
        }
    }

    // Método para simular pagamento aprovado (apenas para testes)
    async simulatePaymentApproval() {
        if (!this.currentPaymentId) {
            showError('Nenhum pagamento ativo para simular');
            return;
        }

        console.log("🧪 SIMULAÇÃO: Simulando aprovação do pagamento:", this.currentPaymentId);
        
        try {
            // Usa o serviço para simular o pagamento
            const result = await this.mpService.simulatePaymentApproval(this.currentPaymentId);
            
            if (result.success) {
                console.log("✅ SIMULAÇÃO: Pagamento simulado com sucesso!");
                this.clearIntervals();
                await this.handlePaymentSuccess(this.currentPaymentId, true);
            } else {
                console.error("❌ SIMULAÇÃO: Erro na simulação:", result.error);
                showError('Erro ao simular pagamento: ' + result.error);
            }
        } catch (error) {
            console.error("❌ SIMULAÇÃO: Erro inesperado:", error);
            showError('Erro inesperado na simulação');
        }
    }

    startPaymentCheck(paymentId) {
        this.clearIntervals();
        console.log(`🔍 PRODUÇÃO: Iniciando verificação do pagamento PIX REAL ${paymentId}`);

        // Verifica imediatamente e depois a cada 5 segundos
        this.checkPaymentStatus(paymentId);
        this.paymentCheckInterval = setInterval(() => this.checkPaymentStatus(paymentId), 5000);
    }

    startExpirationCountdown() {
        if (!this.paymentExpirationTime) return;

        this.updateCountdown();
        this.countdownInterval = setInterval(() => this.updateCountdown(), 1000);
    }

    updateCountdown() {
        if (!this.paymentExpirationTime) return;

        const now = new Date();
        const expirationTime = new Date(this.paymentExpirationTime);
        const timeLeft = expirationTime - now;

        const countdownElement = document.getElementById('pix-countdown');
        if (!countdownElement) return;

        if (timeLeft <= 0) {
            countdownElement.innerHTML = '<span style="color: #ff4444;">QR Code expirado</span>';
            this.clearIntervals();
            return;
        }

        const minutes = Math.floor(timeLeft / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

        countdownElement.textContent = `Expira em: ${minutes}m ${seconds}s`;
    }

    async checkPaymentStatus(paymentId) {
        try {
            console.log(`🔍 PRODUÇÃO: Verificando status do pagamento PIX REAL ${paymentId}...`);

            const result = await this.mpService.checkPaymentStatus(paymentId);

            if (result.success) {
                console.log(`📊 PRODUÇÃO: Status atual do pagamento ${paymentId}: ${result.status}`);

                if (result.status === 'approved') {
                    console.log("✅ PRODUÇÃO: Pagamento PIX REAL aprovado! Finalizando processo...");
                    this.clearIntervals();
                    await this.handlePaymentSuccess(paymentId, false);
                } else if (result.status === 'rejected' || result.status === 'cancelled') {
                    console.log("❌ PRODUÇÃO: Pagamento PIX rejeitado ou cancelado");
                    this.clearIntervals();
                    this.renderError('Pagamento cancelado ou rejeitado. Por favor, tente novamente.');
                }
            } else {
                console.error("❌ PRODUÇÃO: Erro ao verificar status:", result.error);
            }
        } catch (error) {
            console.error('❌ PRODUÇÃO: Erro ao verificar status do pagamento:', error);
        }
    }

    async handlePaymentSuccess(paymentId, isSimulation = false) {
        try {
            if (typeof window.ensureAuthentication === 'function') {
                await window.ensureAuthentication();
            }

            const logPrefix = isSimulation ? "🧪 SIMULAÇÃO:" : "🎉 PRODUÇÃO:";
            console.log(`${logPrefix} Processando confirmação de pagamento:`, paymentId);

            // Atualiza o status no Firebase
            try {
                const paymentData = {
                    payment_id: paymentId,
                    status: 'approved',
                    approved_at: firebase.firestore.FieldValue.serverTimestamp(),
                    method: 'pix',
                    environment: isSimulation ? 'simulation' : 'production',
                    anonymous_uid: firebase.auth().currentUser?.uid || null,
                    is_simulation: isSimulation,
                    awaiting_registration: true, // Cliente precisa se cadastrar
                    registration_token: this.generateRegistrationToken() // Token único para cadastro
                };

                // Atualiza tanto pending_payments quanto cria em approved_payments
                const paymentRef = db.collection('pending_payments').doc(paymentId.toString());
                await paymentRef.set(paymentData, { merge: true });

                const approvedRef = db.collection('approved_payments').doc(paymentId.toString());
                await approvedRef.set(paymentData);

                console.log(`✅ ${logPrefix} Status de pagamento atualizado no Firestore`);

                // Envia email de confirmação (simulado)
                await this.sendConfirmationEmail(paymentId, paymentData.registration_token);

            } catch (firebaseError) {
                console.warn(`⚠️ ${logPrefix} Erro ao atualizar Firebase (não crítico):`, firebaseError);
            }

            this.hide();
            
            if (isSimulation) {
                this.showRegistrationModal(paymentId, 'simulation');
            } else {
                this.showRegistrationModal(paymentId, 'production');
            }

            state.selectedMethod = 'pix';
            state.completed = true;
            state.paymentId = paymentId;

        } catch (error) {
            console.error(`❌ ${isSimulation ? 'SIMULAÇÃO' : 'PRODUÇÃO'}: Erro ao processar confirmação:`, error);
            showError('Houve um erro ao finalizar seu pagamento. Entre em contato com o suporte.');
        }
    }

    generateRegistrationToken() {
        // Gera um token criptograficamente seguro para o cadastro (CORRIGIDO)
        const array = new Uint8Array(32);
        window.crypto.getRandomValues(array);
        return 'reg_' + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    async sendConfirmationEmail(paymentId, registrationToken) {
        // Simula envio de email (você pode integrar com SendGrid, etc.)
        console.log(`📧 EMAIL: Enviando email de confirmação para pagamento ${paymentId}`);
        console.log(`🔗 LINK: http://localhost:3000/register?payment=${paymentId}&token=${registrationToken}`);
        
        // Aqui você integraria com seu serviço de email
        // await emailService.send({
        //     to: 'cliente@email.com',
        //     subject: 'Pagamento aprovado - Complete seu cadastro',
        //     template: 'payment-approved',
        //     data: { paymentId, registrationToken }
        // });
    }

    showRegistrationModal(paymentId, environment) {
        // Mostra modal explicando o próximo passo
        this.modalElement.classList.remove('hidden');
        this.modalRoot.innerHTML = `
            <div class="modal-content">
                <div style="text-align: center; padding: 2rem;">
                    <div style="color: #28a745; margin-bottom: 1rem;">
                        <i class="fas fa-check-circle" style="font-size: 3rem;"></i>
                    </div>
                    <h2 style="color: #28a745; margin-bottom: 1rem;">
                        🎉 Pagamento ${environment === 'simulation' ? 'Simulado' : 'Confirmado'}!
                    </h2>
                    <p style="margin-bottom: 1.5rem; color: #6c757d;">
                        Seu pagamento PIX de <strong>R$ 49,90</strong> foi aprovado com sucesso.
                    </p>
                    
                    <div style="background: #e8f4fd; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
                        <h3 style="color: #0066cc; margin-bottom: 1rem;">📧 Próximos Passos:</h3>
                        <p style="color: #333; margin-bottom: 0.5rem;">
                            1. Verifique seu email para o link de cadastro
                        </p>
                        <p style="color: #333; margin-bottom: 0.5rem;">
                            2. Crie seu login e senha para acessar o sistema
                        </p>
                        <p style="color: #333; margin-bottom: 0.5rem;">
                            3. Complete seus dados pessoais
                        </p>
                        <p style="color: #333;">
                            4. Baixe o software e comece a usar!
                        </p>
                    </div>

                    <div style="background: #e8f5e8; padding: 1rem; border-radius: 6px; margin-bottom: 1.5rem;">
                        <h4 style="color: #28a745; margin-bottom: 0.5rem;">🔐 Sua Conta do Atalho</h4>
                        <p style="color: #333; margin: 0; font-size: 0.9rem;">
                            Você criará um login e senha para acessar sua licença, 
                            baixar o software e gerenciar suas configurações.
                        </p>
                    </div>

                    <div style="background: #fff3cd; padding: 1rem; border-radius: 6px; margin-bottom: 1.5rem;">
                        <p style="color: #856404; margin: 0; font-size: 0.9rem;">
                            <strong>📱 Não recebeu o email?</strong><br>
                            Verifique sua caixa de spam ou entre em contato conosco.
                        </p>
                    </div>

                    <div style="margin-bottom: 1rem;">
                        <strong>ID do Pagamento:</strong> ${paymentId}
                    </div>

                    <button onclick="pixModal.hide(); window.location.href='index.html'" 
                            style="padding: 1rem 2rem; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem;">
                        ✅ Entendi, aguardar email
                    </button>
                </div>
            </div>
        `;
    }

    renderLoading() {
        this.modalRoot.innerHTML = `
            <div class="modal-content">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3 style="font-size: 1.25rem; font-weight: 600;">💰 Pagamento PIX Real</h3>
                    <button onclick="pixModal.hide()" style="background: none; border: none; cursor: pointer;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div style="text-align: center; padding: 2rem 0;">
                    <div class="spinner"></div>
                    <p style="margin-top: 1rem;">Gerando QR Code PIX...</p>
                </div>
            </div>
        `;
    }

    renderError(message) {
        this.modalRoot.innerHTML = `
            <div class="modal-content">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3 style="font-size: 1.25rem; font-weight: 600;">💰 Pagamento PIX Real</h3>
                    <button onclick="pixModal.hide()" style="background: none; border: none; cursor: pointer;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div style="text-align: center; padding: 2rem 0;">
                    <div style="color: #ff4444; margin-bottom: 1rem;">
                        <i class="fas fa-exclamation-circle" style="font-size: 2.5rem;"></i>
                    </div>
                    <p style="color: #ff4444; margin-bottom: 1rem;">${message}</p>
                    <button onclick="pixModal.generatePixPayment()" 
                            style="padding: 0.5rem 1rem; background-color: #4682B4; color: white; border-radius: 0.25rem; border: none; cursor: pointer;">
                        Tentar Novamente
                    </button>
                </div>
            </div>
        `;
    }

    renderQRCode(qrCodeBase64, qrCodeText) {
        this.modalRoot.innerHTML = `
            <div class="modal-content">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3 style="font-size: 1.25rem; font-weight: 600;">💰 Pagamento PIX Real</h3>
                    <button onclick="pixModal.hide()" style="background: none; border: none; cursor: pointer;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div style="text-align: center;">
                    <div style="margin-bottom: 1rem;">
                        <img src="data:image/png;base64,${qrCodeBase64}" 
                             alt="QR Code PIX" 
                             style="margin: 0 auto; width: 200px; height: 200px;">
                    </div>
                    <p id="pix-countdown" style="margin-bottom: 0.5rem; font-size: 0.875rem; color: #666;">
                        Calculando tempo restante...
                    </p>
                    <p style="font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem; color: #2e8b57;">💰 Valor: R$ 49,90</p>
                    
                    <div style="margin-top: 1rem; margin-bottom: 1rem;">
                        <button id="copy-pix-button"
                                style="padding: 0.5rem 1rem; background-color: #e9ecef; color: #333; border-radius: 0.25rem; border: none; cursor: pointer; width: 80%; margin: 0 auto; display: block;">
                            📋 Copiar Código PIX
                        </button>
                    </div>
                    
                    <!-- BOTÃO DE SIMULAÇÃO PARA TESTES -->
                    <div style="margin-bottom: 1rem; padding: 0.5rem; background-color: #fff3cd; border-radius: 0.25rem; border: 1px solid #ffeaa7;">
                        <p style="font-size: 0.75rem; color: #856404; margin-bottom: 0.5rem;">🧪 Apenas para testes:</p>
                        <button onclick="pixModal.simulatePaymentApproval()" 
                                style="padding: 0.5rem 1rem; background-color: #ffc107; color: #212529; border-radius: 0.25rem; border: none; cursor: pointer; font-size: 0.875rem;">
                            ⚡ Simular Pagamento Aprovado
                        </button>
                    </div>
                    
                    <div style="border-top: 1px solid #e9ecef; padding-top: 1rem; margin-top: 1rem;">
                        <p style="font-size: 0.875rem; color: #666; margin-bottom: 0.5rem;">
                            📱 1. Abra o app do seu banco
                        </p>
                        <p style="font-size: 0.875rem; color: #666; margin-bottom: 0.5rem;">
                            🔍 2. Escolha pagar via PIX com QR Code
                        </p>
                        <p style="font-size: 0.875rem; color: #666; margin-bottom: 0.5rem;">
                            📸 3. Escaneie o QR Code acima ou cole o código copiado
                        </p>
                        <p style="font-size: 0.875rem; color: #666;">
                            ✅ 4. Confirme o pagamento no app do seu banco
                        </p>
                    </div>
                    <div style="margin-top: 1.5rem; padding: 1rem; background-color: #f8f9fa; border-radius: 0.5rem;">
                        <p style="font-size: 0.875rem; color: #2e8b57; margin: 0;">
                            <strong>🔄 Aguardando confirmação do pagamento...</strong>
                        </p>
                        <p style="font-size: 0.75rem; color: #666; margin-top: 0.5rem;">
                            Após a aprovação, você receberá um email para completar seu cadastro.
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        // ✅ ADICIONAR EVENT LISTENER SEGURO (CORRIGIDO: sem XSS)
        setTimeout(() => {
            const copyButton = document.getElementById('copy-pix-button');
            if (copyButton) {
                copyButton.addEventListener('click', () => {
                    navigator.clipboard.writeText(qrCodeText).then(() => {
                        copyButton.textContent = 'Código Copiado!';
                        setTimeout(() => {
                            copyButton.textContent = '📋 Copiar Código PIX';
                        }, 2000);
                    }).catch(err => {
                        console.error('Erro ao copiar:', err);
                        copyButton.textContent = 'Erro ao copiar';
                    });
                });
            }
        }, 100);
    }
}

// Inicializa o controlador do modal
let pixModal = null;

// Aguardar configuração ser carregada antes de inicializar (apenas uma vez)
if (!window.pixModalInitialized) {
    window.pixModalInitialized = true;
    
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            // Verificar se já foi inicializado
            if (pixModal) {
                console.log('⚠️ PixModal já foi inicializado anteriormente');
                return;
            }
            
            // Aguardar configuração
            if (window.ConfigLoader) {
                await ConfigLoader.waitForConfig(5000);
            }
            
            // Inicializar pixModal
            pixModal = new PixModalController();
            await pixModal.initialize();
            
            console.log('✅ PixModal inicializado com sucesso');
        } catch (error) {
            console.warn('⚠️ Erro ao inicializar PixModal, criando fallback:', error);
            
            // Fallback: criar sem aguardar configuração
            if (!pixModal) {
                pixModal = new PixModalController();
                // Inicializar sem aguardar (vai usar fallback interno)
                try {
                    await pixModal.initialize();
                } catch (initError) {
                    console.warn('⚠️ Falha na inicialização do fallback:', initError);
                }
            }
        }
    });
}