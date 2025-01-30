// pix-modal.js

class PixModalController {
    constructor() {
        this.modalElement = document.getElementById('pix-modal');
        this.modalRoot = document.getElementById('pix-modal-root');
    }

    show() {
        this.modalElement.classList.remove('hidden');
        this.renderPixContainer();
    }

    hide() {
        this.modalElement.classList.add('hidden');
    }

    renderPixContainer() {
        this.modalRoot.innerHTML = `
            <div class="modal-content">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-semibold">Pagamento via PIX</h3>
                    <button onclick="pixModal.hide()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="text-center">
                    <div id="pix-button-container" class="mb-4"></div>
                    <p class="text-lg font-semibold mb-4">Valor: R$ 49,90</p>
                    <div class="mt-6 text-sm text-gray-500">
                        Após gerar o PIX, o pagamento será confirmado automaticamente
                    </div>
                </div>
            </div>
        `;

        // Criar o botão do PIX
        setTimeout(() => {
            const container = document.getElementById('pix-button-container');
            if (container) {
                window.mpService.createPixButton(container);
            }
        }, 100);
    }
}

// Cria uma instância global
window.pixModal = new PixModalController();