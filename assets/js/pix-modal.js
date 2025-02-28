// pix-modal.js - Versão modernizada

class PixModalController {
    constructor() {
        this.modalElement = document.getElementById('pix-modal');
        this.modalRoot = document.getElementById('pix-modal-root');
        this.paymentCheckInterval = null;
        this.mpService = new MercadoPagoService();
        this.paymentExpirationTime = null;
        this.countdownInterval = null;
        this.currentPaymentId = null;
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
                this.currentPaymentId = result.paymentId;
                this.paymentExpirationTime = result.expirationDate;
                this.renderQRCode(result.qrCodeBase64, result.qrCodeText);
                this.startPaymentCheck(result.paymentId);
                this.startExpirationCountdown();

                // Salvar o ID do pagamento para referência quando o usuário se registrar
                state.paymentId = result.paymentId;

                // Salvar o ID do pagamento no Firebase para referência futura
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
                    console.error("Erro ao salvar referência do pagamento:", dbError);
                }
            } else {
                console.error("Erro na geração do QR Code:", result.error);
                this.renderError(result.error || 'Erro ao gerar QR Code PIX');
            }
        } catch (error) {
            console.error('Erro ao gerar pagamento:', error);
            this.renderError('Erro ao processar pagamento. Por favor, tente novamente.');
        }
    }

    startPaymentCheck(paymentId) {
        this.clearIntervals();
        console.log(`Iniciando verificação periódica do pagamento ${paymentId}`);

        // Verificar imediatamente e depois a cada 5 segundos
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

            // Adiciona botão para gerar novo QR code
            const refreshButton = document.createElement('button');
            refreshButton.className = 'btn-hero';
            refreshButton.style.marginTop = '1rem';
            refreshButton.textContent = 'Gerar novo QR Code';
            refreshButton.onclick = () => this.generatePixPayment();

            countdownElement.parentNode.appendChild(refreshButton);
            return;
        }

        const minutes = Math.floor(timeLeft / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

        countdownElement.textContent = `${minutes}m ${seconds}s`;
    }

    async checkPaymentStatus(paymentId) {
        try {
            const result = await this.mpService.checkPaymentStatus(paymentId);

            if (result.success) {
                console.log(`Status do pagamento ${paymentId}: ${result.status}`);

                // Atualiza o elemento de status se existir
                const statusElement = document.getElementById('pix-status-text');
                if (statusElement) {
                    if (result.status === 'pending') {
                        statusElement.textContent = 'Aguardando pagamento...';
                    } else if (result.status === 'approved') {
                        statusElement.innerHTML = '<span style="color: #4CAF50;">Pagamento confirmado!</span>';
                    } else {
                        statusElement.textContent = `Status: ${result.status}`;
                    }
                }

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

    async handlePaymentSuccess(paymentId) {
        try {
            // Atualizar status no Firestore
            const paymentRef = db.collection('pending_payments').doc(paymentId.toString());
            await paymentRef.update({
                status: 'approved',
                approved_at: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log("Status de pagamento atualizado no Firestore");

            // Atualizar o modal para mostrar a confirmação de pagamento
            this.renderPaymentSuccess();

            // Após 3 segundos, fechar o modal e mostrar o formulário de registro
            setTimeout(() => {
                this.hide();
                showSuccess('Pagamento confirmado com sucesso!');

                // Exibir formulário de registro
                const registerForm = document.getElementById('register-form');
                registerForm.classList.remove('hidden');
                registerForm.scrollIntoView({ behavior: 'smooth' });

                // Atualizar estado da aplicação
                state.selectedMethod = 'pix';
                state.completed = true;
            }, 3000);

        } catch (error) {
            console.error('Erro ao processar confirmação de pagamento:', error);
            showError('Houve um erro ao finalizar seu pagamento. Entre em contato com o suporte.');
        }
    }

    renderLoading() {
        this.modalRoot.innerHTML = `
            <div class="pix-modal-header">
                <h3>Pagamento via PIX</h3>
                <button onclick="pixModal.hide()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div style="text-align: center; padding: 2rem 0;">
                <div class="spinner"></div>
                <p style="margin-top: 1rem;">Gerando QR Code...</p>
            </div>
        `;
    }

    renderError(message) {
        this.modalRoot.innerHTML = `
            <div class="pix-modal-header">
                <h3>Pagamento via PIX</h3>
                <button onclick="pixModal.hide()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div style="text-align: center; padding: 2rem 0;">
                <div style="color: #ff4444; margin-bottom: 1.5rem;">
                    <i class="fas fa-exclamation-circle" style="font-size: 3rem;"></i>
                </div>
                <p style="color: #ff4444; margin-bottom: 1.5rem;">${message}</p>
                <button onclick="pixModal.generatePixPayment()" class="btn-hero">
                    Tentar Novamente
                </button>
            </div>
        `;
    }

    renderPaymentSuccess() {
        this.modalRoot.innerHTML = `
            <div style="text-align: center; padding: 2rem 0;">
                <div style="color: #4CAF50; margin-bottom: 1.5rem;">
                    <i class="fas fa-check-circle" style="font-size: 3rem;"></i>
                </div>
                <h3 style="margin-bottom: 1rem; font-size: 1.5rem;">Pagamento Confirmado!</h3>
                <p style="margin-bottom: 1.5rem;">Seu pagamento foi processado com sucesso.</p>
                <p>Redirecionando para o formulário de cadastro...</p>
            </div>
        `;
    }

    renderQRCode(qrCodeBase64, qrCodeText) {
        this.modalRoot.innerHTML = `
            <div class="pix-modal-header">
                <h3>Pagamento via PIX</h3>
                <button onclick="pixModal.hide()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div>
                <div class="qr-container">
                    <img src="data:image/png;base64,${qrCodeBase64}" alt="QR Code PIX">
                </div>
                
                <div class="pix-timer">
                    <i class="fas fa-clock"></i> Expira em: <span id="pix-countdown">--:--</span>
                </div>
                
                <p class="pix-amount">Valor: R$ 49,90</p>
                
                <button id="copy-pix-button" class="copy-pix-button" onclick="navigator.clipboard.writeText('${qrCodeText}').then(() => { 
                    document.getElementById('copy-pix-button').innerHTML = '<i class=\\'fas fa-check\\'></i> Código Copiado!';
                    setTimeout(() => {
                        document.getElementById('copy-pix-button').innerHTML = '<i class=\\'fas fa-copy\\'></i> Copiar Código PIX';
                    }, 3000);
                })">
                    <i class="fas fa-copy"></i> Copiar Código PIX
                </button>
                
                <div class="pix-instructions">
                    <p><i class="fas fa-1"></i> Abra o app do seu banco</p>
                    <p><i class="fas fa-2"></i> Escolha pagar via PIX com QR Code</p>
                    <p><i class="fas fa-3"></i> Escaneie o QR Code acima ou cole o código copiado</p>
                    <p><i class="fas fa-4"></i> Confirme o pagamento no app do seu banco</p>
                </div>
                
                <div class="pix-status" id="pix-status">
                    <div class="spinner"></div>
                    <span id="pix-status-text">Aguardando pagamento...</span>
                </div>
            </div>
        `;
    }
}

// Inicializa o controlador do modal
const pixModal = new PixModalController();