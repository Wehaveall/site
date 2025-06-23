// pix-modal.js - Versão com simulação de pagamento

class PixModalController {
    constructor() {
        this.modalElement = document.getElementById('pix-modal');
        this.modalRoot = document.getElementById('pix-modal-root');
        this.paymentCheckInterval = null;
        this.mpService = new MercadoPagoService();
        this.paymentExpirationTime = null;
        this.countdownInterval = null;
        this.simulationStartTime = null; // Para simulação de pagamento
        this.currentPaymentId = null; // Armazenar o ID do pagamento para simulação
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
            console.log("Solicitando geração de QR Code PIX...");
            const result = await this.mpService.createPixPayment();

            if (result.success) {
                console.log("QR Code PIX gerado com sucesso!");
                this.paymentExpirationTime = result.expirationDate;
                this.currentPaymentId = result.paymentId; // Armazena o ID para simulação
                this.renderQRCode(result.qrCodeBase64, result.qrCodeText);
                this.startPaymentCheck(result.paymentId);
                this.startExpirationCountdown();

                // Tenta salvar no Firebase, mas não trata como erro fatal
                try {
                    const paymentRef = db.collection('pending_payments').doc(result.paymentId.toString());
                    await paymentRef.set({
                        payment_id: result.paymentId,
                        amount: 49.90,
                        status: 'pending',
                        created_at: firebase.firestore.FieldValue.serverTimestamp(),
                        method: 'pix'
                    });
                    console.log("Registro de pagamento pendente criado no Firestore");
                } catch (dbError) {
                    console.warn("Não foi possível salvar no Firebase (ignorado em testes):", dbError);
                }
            } else {
                console.error("Erro na geração do QR Code:", result.error);
                this.renderError(result.error || 'Erro ao gerar QR Code PIX');
            }
        } catch (error) {
            console.error('Erro ao gerar pagamento:', error);
            this.renderError('Erro ao processar pagamento');
        }
    }

    startPaymentCheck(paymentId) {
        this.clearIntervals();
        console.log(`Iniciando verificação periódica do pagamento ${paymentId}`);

        // Inicializa o tempo para a simulação de 60 segundos
        this.simulationStartTime = Date.now();
        console.log("⏱️ Tempo de simulação iniciado - aguarde 60 segundos para aprovação automática");

        // Verifica imediatamente e depois a cada 3 segundos
        this.checkPaymentStatus(paymentId);
        this.paymentCheckInterval = setInterval(() => this.checkPaymentStatus(paymentId), 3000);
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
            // SIMULAÇÃO: Aprova o pagamento após 60 segundos
            if (this.simulationStartTime) {
                const elapsed = Date.now() - this.simulationStartTime;
                console.log(`Tempo decorrido desde início: ${Math.floor(elapsed / 1000)} segundos`);

                if (elapsed >= 60000) { // 60 segundos
                    console.log("!! SIMULAÇÃO: 60 segundos passados, considerando pagamento APROVADO !!");
                    this.clearIntervals();
                    this.handlePaymentSuccess(paymentId);
                    return;
                }
            }

            // Verificação normal com a API (não será alcançada na simulação)
            const result = await this.mpService.checkPaymentStatus(paymentId);

            if (result.success) {
                console.log(`Status do pagamento ${paymentId}: ${result.status}`);

                if (result.status === 'approved') {
                    console.log("Pagamento aprovado! Finalizando processo...");
                    this.clearIntervals();
                    this.handlePaymentSuccess(paymentId);
                } else if (result.status === 'rejected' || result.status === 'cancelled') {
                    console.log("Pagamento rejeitado ou cancelado");
                    this.clearIntervals();
                    this.renderError('Pagamento cancelado ou rejeitado. Por favor, tente novamente.');
                }
            } else {
                console.error("Erro ao verificar status:", result.error);
            }
        } catch (error) {
            console.error('Erro ao verificar status do pagamento:', error);
        }
    }

    simulateApproval() {
        console.log("🧪 SIMULAÇÃO FORÇADA: Aprovando pagamento imediatamente!");
        if (this.currentPaymentId) {
            this.clearIntervals();
            this.handlePaymentSuccess(this.currentPaymentId);
        } else {
            console.error("Nenhum ID de pagamento disponível para simulação");
        }
    }

    async handlePaymentSuccess(paymentId) {
        try {
            if (typeof window.ensureAuthentication === 'function') {
                await window.ensureAuthentication();
            }

            console.log("Processando confirmação de pagamento:", paymentId);

            try {
                const paymentData = {
                    payment_id: paymentId,
                    status: 'approved',
                    approved_at: firebase.firestore.FieldValue.serverTimestamp(),
                    method: 'pix',
                    anonymous_uid: firebase.auth().currentUser?.uid || null
                };

                const paymentRef = db.collection('pending_payments').doc(paymentId.toString());
                await paymentRef.set(paymentData, { merge: true });

                console.log("Status de pagamento atualizado no Firestore");
            } catch (firebaseError) {
                console.warn("Erro ao atualizar Firebase (ignorado em testes):", firebaseError);
            }

            this.hide();
            showSuccess('Pagamento confirmado com sucesso!');

            const registerForm = document.getElementById('register-form');
            registerForm.classList.remove('hidden');
            registerForm.scrollIntoView({ behavior: 'smooth' });

            state.selectedMethod = 'pix';
            state.completed = true;
            state.paymentId = paymentId;

        } catch (error) {
            console.error('Erro ao processar confirmação de pagamento:', error);
            showError('Houve um erro ao finalizar seu pagamento. Entre em contato com o suporte.');
        }
    }

    renderLoading() {
        this.modalRoot.innerHTML = `
            <div class="modal-content">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3 style="font-size: 1.25rem; font-weight: 600;">Pagamento via PIX</h3>
                    <button onclick="pixModal.hide()" style="background: none; border: none; cursor: pointer;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div style="text-align: center; padding: 2rem 0;">
                    <div class="spinner"></div>
                    <p style="margin-top: 1rem;">Gerando QR Code...</p>
                </div>
            </div>
        `;
    }

    renderError(message) {
        this.modalRoot.innerHTML = `
            <div class="modal-content">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3 style="font-size: 1.25rem; font-weight: 600;">Pagamento via PIX</h3>
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
                    <h3 style="font-size: 1.25rem; font-weight: 600;">Pagamento via PIX</h3>
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
                    <p style="font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem;">Valor: R$ 49,90</p>
                    
                    <div style="margin-top: 1rem; margin-bottom: 1rem;">
                        <button id="copy-pix-button" onclick="navigator.clipboard.writeText('${qrCodeText}').then(() => document.getElementById('copy-pix-button').textContent = 'Código Copiado!')"
                                style="padding: 0.5rem 1rem; background-color: #e9ecef; color: #333; border-radius: 0.25rem; border: none; cursor: pointer; width: 80%; margin: 0 auto; display: block;">
                            Copiar Código PIX
                        </button>
                    </div>
                    
                    <div style="border-top: 1px solid #e9ecef; padding-top: 1rem; margin-top: 1rem;">
                        <p style="font-size: 0.875rem; color: #666; margin-bottom: 0.5rem;">
                            1. Abra o app do seu banco
                        </p>
                        <p style="font-size: 0.875rem; color: #666; margin-bottom: 0.5rem;">
                            2. Escolha pagar via PIX com QR Code
                        </p>
                        <p style="font-size: 0.875rem; color: #666; margin-bottom: 0.5rem;">
                            3. Escaneie o QR Code acima ou cole o código copiado
                        </p>
                        <p style="font-size: 0.875rem; color: #666;">
                            4. Confirme o pagamento no app do seu banco
                        </p>
                    </div>
                    <div style="margin-top: 1.5rem;">
                        <p style="font-size: 0.875rem; color: #666;">
                            Aguardando confirmação do pagamento...
                        </p>
                        <p style="font-size: 0.875rem; color: #2e8b57; margin-top: 0.5rem;">
                            <strong>SIMULAÇÃO:</strong> Pagamento será considerado aprovado em 60 segundos!
                        </p>
                        <button onclick="pixModal.simulateApproval()" 
                                style="margin-top: 1rem; padding: 0.5rem 1rem; background-color: #28a745; color: white; border-radius: 0.25rem; border: none; cursor: pointer; font-size: 0.875rem;">
                            🧪 Simular Aprovação Imediata (Só para Teste)
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}

// Inicializa o controlador do modal
const pixModal = new PixModalController();