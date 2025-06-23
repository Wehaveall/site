// pix-modal.js - Versão PRODUÇÃO (PIX REAL)

class PixModalController {
    constructor() {
        this.modalElement = document.getElementById('pix-modal');
        this.modalRoot = document.getElementById('pix-modal-root');
        this.paymentCheckInterval = null;
        this.mpService = new MercadoPagoService();
        this.paymentExpirationTime = null;
        this.countdownInterval = null;
        this.currentPaymentId = null; // Armazenar o ID do pagamento atual
    }

    show() {
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

                // Tenta salvar no Firebase (opcional)
                try {
                    const paymentRef = db.collection('pending_payments').doc(result.paymentId.toString());
                    await paymentRef.set({
                        payment_id: result.paymentId,
                        amount: 49.90,
                        status: 'pending',
                        created_at: firebase.firestore.FieldValue.serverTimestamp(),
                        method: 'pix',
                        environment: 'production'
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

    startPaymentCheck(paymentId) {
        this.clearIntervals();
        console.log(`🔍 PRODUÇÃO: Iniciando verificação do pagamento PIX REAL ${paymentId}`);

        // Verifica imediatamente e depois a cada 5 segundos (mais espaçado para produção)
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

            // Verificação REAL com a API do Mercado Pago
            const result = await this.mpService.checkPaymentStatus(paymentId);

            if (result.success) {
                console.log(`📊 PRODUÇÃO: Status atual do pagamento ${paymentId}: ${result.status}`);

                if (result.status === 'approved') {
                    console.log("✅ PRODUÇÃO: Pagamento PIX REAL aprovado! Finalizando processo...");
                    this.clearIntervals();
                    this.handlePaymentSuccess(paymentId);
                } else if (result.status === 'rejected' || result.status === 'cancelled') {
                    console.log("❌ PRODUÇÃO: Pagamento PIX rejeitado ou cancelado");
                    this.clearIntervals();
                    this.renderError('Pagamento cancelado ou rejeitado. Por favor, tente novamente.');
                }
                // Se status for 'pending', continua verificando
            } else {
                console.error("❌ PRODUÇÃO: Erro ao verificar status:", result.error);
            }
        } catch (error) {
            console.error('❌ PRODUÇÃO: Erro ao verificar status do pagamento:', error);
        }
    }

    async handlePaymentSuccess(paymentId) {
        try {
            if (typeof window.ensureAuthentication === 'function') {
                await window.ensureAuthentication();
            }

            console.log("🎉 PRODUÇÃO: Processando confirmação de pagamento PIX REAL:", paymentId);

            try {
                const paymentData = {
                    payment_id: paymentId,
                    status: 'approved',
                    approved_at: firebase.firestore.FieldValue.serverTimestamp(),
                    method: 'pix',
                    environment: 'production',
                    anonymous_uid: firebase.auth().currentUser?.uid || null
                };

                const paymentRef = db.collection('pending_payments').doc(paymentId.toString());
                await paymentRef.set(paymentData, { merge: true });

                console.log("✅ PRODUÇÃO: Status de pagamento atualizado no Firestore");
            } catch (firebaseError) {
                console.warn("⚠️ PRODUÇÃO: Erro ao atualizar Firebase (não crítico):", firebaseError);
            }

            this.hide();
            showSuccess('🎉 Pagamento PIX confirmado com sucesso!');

            const registerForm = document.getElementById('register-form');
            registerForm.classList.remove('hidden');
            registerForm.scrollIntoView({ behavior: 'smooth' });

            state.selectedMethod = 'pix';
            state.completed = true;
            state.paymentId = paymentId;

        } catch (error) {
            console.error('❌ PRODUÇÃO: Erro ao processar confirmação de pagamento:', error);
            showError('Houve um erro ao finalizar seu pagamento. Entre em contato com o suporte.');
        }
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
                        <button id="copy-pix-button" onclick="navigator.clipboard.writeText('${qrCodeText}').then(() => document.getElementById('copy-pix-button').textContent = 'Código Copiado!')"
                                style="padding: 0.5rem 1rem; background-color: #e9ecef; color: #333; border-radius: 0.25rem; border: none; cursor: pointer; width: 80%; margin: 0 auto; display: block;">
                            📋 Copiar Código PIX
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
                            O pagamento será confirmado automaticamente após a aprovação pelo seu banco.
                        </p>
                    </div>
                </div>
            </div>
        `;
    }
}

// Inicializa o controlador do modal
const pixModal = new PixModalController();