// pix-modal.js

class PixModalController {
    constructor() {
        this.modalElement = document.getElementById('pix-modal');
        this.modalRoot = document.getElementById('pix-modal-root');
        this.paymentCheckInterval = null;
    }

    show() {
        this.modalElement.classList.remove('hidden');
        this.generatePixPayment();
    }

    hide() {
        this.modalElement.classList.add('hidden');
        this.clearCheckPaymentInterval();
    }

    clearCheckPaymentInterval() {
        if (this.paymentCheckInterval) {
            clearInterval(this.paymentCheckInterval);
            this.paymentCheckInterval = null;
        }
    }

    async generatePixPayment() {
        this.renderLoading();

        try {
            const result = await window.mpService.createPixPayment();

            if (result.success) {
                this.renderQRCode(result.qrCodeBase64);
                this.startPaymentCheck(result.paymentId);
            } else {
                this.renderError('Erro ao gerar QR Code PIX');
            }
        } catch (error) {
            console.error('Erro ao gerar pagamento:', error);
            this.renderError('Erro ao processar pagamento');
        }
    }

    startPaymentCheck(paymentId) {
        this.clearCheckPaymentInterval();
        this.paymentCheckInterval = setInterval(() => this.checkPaymentStatus(paymentId), 5000);
    }

    async checkPaymentStatus(paymentId) {
        try {
            const result = await window.mpService.checkPaymentStatus(paymentId);

            if (result.success && result.status === 'approved') {
                this.clearCheckPaymentInterval();
                this.handlePaymentSuccess();
            }
        } catch (error) {
            console.error('Erro ao verificar status:', error);
        }
    }

    handlePaymentSuccess() {
        this.hide();
        window.showSuccess('Pagamento realizado com sucesso!');
        const registerForm = document.getElementById('register-form');
        registerForm.classList.remove('hidden');
        registerForm.scrollIntoView({ behavior: 'smooth' });
        window.state.selectedMethod = 'pix';
    }

    renderLoading() {
        this.modalRoot.innerHTML = `
            <div class="modal-content">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-semibold">Pagamento via PIX</h3>
                    <button onclick="pixModal.hide()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="text-center py-8">
                    <div class="spinner"></div>
                    <p class="mt-4">Gerando QR Code...</p>
                </div>
            </div>
        `;
    }

    renderError(message) {
        this.modalRoot.innerHTML = `
            <div class="modal-content">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-semibold">Pagamento via PIX</h3>
                    <button onclick="pixModal.hide()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="text-center py-8">
                    <div class="text-red-500 mb-4">
                        <i class="fas fa-exclamation-circle text-4xl"></i>
                    </div>
                    <p class="text-red-600 mb-4">${message}</p>
                    <button onclick="pixModal.generatePixPayment()" 
                            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                        Tentar Novamente
                    </button>
                </div>
            </div>
        `;
    }

    renderQRCode(qrCodeBase64) {
        this.modalRoot.innerHTML = `
            <div class="modal-content">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-semibold">Pagamento via PIX</h3>
                    <button onclick="pixModal.hide()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="text-center">
                    <div class="mb-4">
                        <img src="data:image/png;base64,${qrCodeBase64}" 
                             alt="QR Code PIX" 
                             class="mx-auto w-64 h-64">
                    </div>
                    <p class="text-lg font-semibold mb-4">Valor: R$ 49,90</p>
                    <div class="border-t pt-4">
                        <p class="text-sm text-gray-600 mb-2">
                            1. Abra o app do seu banco
                        </p>
                        <p class="text-sm text-gray-600 mb-2">
                            2. Escolha pagar via PIX
                        </p>
                        <p class="text-sm text-gray-600">
                            3. Escaneie o QR Code acima
                        </p>
                    </div>
                    <div class="mt-6 text-sm text-gray-500">
                        O pagamento será confirmado automaticamente
                    </div>
                </div>
            </div>
        `;
    }
}

// Cria uma instância global
window.pixModal = new PixModalController();