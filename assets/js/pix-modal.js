// pix-modal.js

class PixModalController {
    constructor() {
        this.modalElement = document.getElementById('pix-modal');
        this.modalRoot = document.getElementById('pix-modal-root');
    }

    show() {
        this.modalElement.classList.remove('hidden');
        this.initPayment();
    }

    hide() {
        this.modalElement.classList.add('hidden');
    }

    async initPayment() {
        this.renderLoading();

        try {
            const result = await window.mpService.createPixPayment();

            if (result.success) {
                this.renderPaymentButton(result.pixButton);
            } else {
                this.renderError('Erro ao iniciar pagamento PIX');
            }
        } catch (error) {
            console.error('Erro ao iniciar pagamento:', error);
            this.renderError('Erro ao processar pagamento');
        }
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
                    <p class="mt-4">Iniciando pagamento...</p>
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
                    <button onclick="pixModal.initPayment()" 
                            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                        Tentar Novamente
                    </button>
                </div>
            </div>
        `;
    }

    renderPaymentButton(pixButton) {
        this.modalRoot.innerHTML = `
            <div class="modal-content">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-semibold">Pagamento via PIX</h3>
                    <button onclick="pixModal.hide()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="text-center">
                    <div class="mb-4" id="pix-button-container"></div>
                    <p class="text-lg font-semibold mb-4">Valor: R$ 49,90</p>
                    <div class="border-t pt-4">
                        <p class="text-sm text-gray-600">
                            Clique no botão acima para gerar o QR Code PIX
                        </p>
                    </div>
                </div>
            </div>
        `;

        // Renderiza o botão do Mercado Pago
        const container = document.getElementById('pix-button-container');
        pixButton.render(container);
    }
}

// Cria uma instância global
window.pixModal = new PixModalController();