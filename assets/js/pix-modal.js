// // pix-modal.js - Versão atualizada

// class PixModalController {
//     constructor() {
//         this.modalElement = document.getElementById('pix-modal');
//         this.modalRoot = document.getElementById('pix-modal-root');
//         this.paymentCheckInterval = null;
//         this.mpService = new MercadoPagoService();
//         this.paymentExpirationTime = null;
//         this.countdownInterval = null;
//     }

//     show() {
//         this.modalElement.classList.remove('hidden');
//         this.generatePixPayment();
//     }

//     hide() {
//         this.modalElement.classList.add('hidden');
//         this.clearIntervals();
//     }

//     clearIntervals() {
//         if (this.paymentCheckInterval) {
//             clearInterval(this.paymentCheckInterval);
//             this.paymentCheckInterval = null;
//         }

//         if (this.countdownInterval) {
//             clearInterval(this.countdownInterval);
//             this.countdownInterval = null;
//         }
//     }

//     async generatePixPayment() {
//         this.renderLoading();

//         try {
//             console.log("Solicitando geração de QR Code PIX...");
//             const result = await this.mpService.createPixPayment();

//             if (result.success) {
//                 console.log("QR Code PIX gerado com sucesso!");
//                 this.paymentExpirationTime = result.expirationDate;
//                 this.renderQRCode(result.qrCodeBase64, result.qrCodeText);
//                 this.startPaymentCheck(result.paymentId);
//                 this.startExpirationCountdown();

//                 // Salvar o ID do pagamento no Firebase para referência futura
//                 try {
//                     const paymentRef = db.collection('pending_payments').doc(result.paymentId.toString());
//                     await paymentRef.set({
//                         payment_id: result.paymentId,
//                         amount: 49.90,
//                         status: 'pending',
//                         created_at: firebase.firestore.FieldValue.serverTimestamp(),
//                         method: 'pix'
//                     });
//                     console.log("Registro de pagamento pendente criado no Firestore");
//                 } catch (dbError) {
//                     console.error("Erro ao salvar referência do pagamento:", dbError);
//                 }
//             } else {
//                 console.error("Erro na geração do QR Code:", result.error);
//                 this.renderError(result.error || 'Erro ao gerar QR Code PIX');
//             }
//         } catch (error) {
//             console.error('Erro ao gerar pagamento:', error);
//             this.renderError('Erro ao processar pagamento');
//         }
//     }

//     startPaymentCheck(paymentId) {
//         this.clearIntervals();
//         console.log(`Iniciando verificação periódica do pagamento ${paymentId}`);

//         // Verificar imediatamente e depois a cada 5 segundos
//         this.checkPaymentStatus(paymentId);
//         this.paymentCheckInterval = setInterval(() => this.checkPaymentStatus(paymentId), 5000);
//     }

//     startExpirationCountdown() {
//         if (!this.paymentExpirationTime) return;

//         this.updateCountdown();
//         this.countdownInterval = setInterval(() => this.updateCountdown(), 1000);
//     }

//     updateCountdown() {
//         if (!this.paymentExpirationTime) return;

//         const now = new Date();
//         const expirationTime = new Date(this.paymentExpirationTime);
//         const timeLeft = expirationTime - now;

//         const countdownElement = document.getElementById('pix-countdown');
//         if (!countdownElement) return;

//         if (timeLeft <= 0) {
//             countdownElement.innerHTML = '<span class="text-red-600">QR Code expirado</span>';
//             this.clearIntervals();
//             return;
//         }

//         const minutes = Math.floor(timeLeft / (1000 * 60));
//         const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

//         countdownElement.textContent = `Expira em: ${minutes}m ${seconds}s`;
//     }

//     async checkPaymentStatus(paymentId) {
//         try {
//             console.log(`Verificando status do pagamento ${paymentId}...`);

//             // Simulação: Após 10 segundos, considere o pagamento aprovado
//             const startTime = this.startCheckTime || Date.now();
//             this.startCheckTime = startTime;

//             const elapsedTime = Date.now() - startTime;
//             console.log(`Tempo decorrido: ${elapsedTime / 1000} segundos`);

//             if (elapsedTime > 10000) {  // 10 segundos
//                 console.log("Simulando pagamento aprovado após 10 segundos");
//                 return {
//                     success: true,
//                     paymentId: paymentId,
//                     status: 'approved'
//                 };
//             }

//             // Código original para verificar o status real
//             const result = await this.mpService.checkPaymentStatus(paymentId);
//             return result;
//         } catch (error) {
//             console.error('Erro ao verificar status do pagamento:', error);
//             return { success: false, error: error.message };
//         }
//     }
//     async handlePaymentSuccess(paymentId) {
//         try {
//             // Atualizar status no Firestore
//             const paymentRef = db.collection('pending_payments').doc(paymentId.toString());
//             await paymentRef.update({
//                 status: 'approved',
//                 approved_at: firebase.firestore.FieldValue.serverTimestamp()
//             });
//             console.log("Status de pagamento atualizado no Firestore");

//             this.hide();
//             showSuccess('Pagamento confirmado com sucesso!');

//             // Exibir formulário de registro
//             const registerForm = document.getElementById('register-form');
//             registerForm.classList.remove('hidden');
//             registerForm.scrollIntoView({ behavior: 'smooth' });

//             // Atualizar estado da aplicação
//             state.selectedMethod = 'pix';
//             state.completed = true;

//         } catch (error) {
//             console.error('Erro ao processar confirmação de pagamento:', error);
//             showError('Houve um erro ao finalizar seu pagamento. Entre em contato com o suporte.');
//         }
//     }

//     renderLoading() {
//         this.modalRoot.innerHTML = `
//             <div class="modal-content">
//                 <div class="flex justify-between items-center mb-4">
//                     <h3 class="text-xl font-semibold">Pagamento via PIX</h3>
//                     <button onclick="pixModal.hide()" style="background: none; border: none; cursor: pointer;">
//                         <i class="fas fa-times"></i>
//                     </button>
//                 </div>
//                 <div class="text-center py-8">
//                     <div class="spinner"></div>
//                     <p class="mt-4">Gerando QR Code...</p>
//                 </div>
//             </div>
//         `;
//     }

//     renderError(message) {
//         this.modalRoot.innerHTML = `
//             <div class="modal-content">
//                 <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
//                     <h3 style="font-size: 1.25rem; font-weight: 600;">Pagamento via PIX</h3>
//                     <button onclick="pixModal.hide()" style="background: none; border: none; cursor: pointer;">
//                         <i class="fas fa-times"></i>
//                     </button>
//                 </div>
//                 <div style="text-align: center; padding: 2rem 0;">
//                     <div style="color: #ff4444; margin-bottom: 1rem;">
//                         <i class="fas fa-exclamation-circle" style="font-size: 2.5rem;"></i>
//                     </div>
//                     <p style="color: #ff4444; margin-bottom: 1rem;">${message}</p>
//                     <button onclick="pixModal.generatePixPayment()" 
//                             style="padding: 0.5rem 1rem; background-color: #4682B4; color: white; border-radius: 0.25rem; border: none; cursor: pointer;">
//                         Tentar Novamente
//                     </button>
//                 </div>
//             </div>
//         `;
//     }

//     renderQRCode(qrCodeBase64, qrCodeText) {
//         this.modalRoot.innerHTML = `
//             <div class="modal-content">
//                 <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
//                     <h3 style="font-size: 1.25rem; font-weight: 600;">Pagamento via PIX</h3>
//                     <button onclick="pixModal.hide()" style="background: none; border: none; cursor: pointer;">
//                         <i class="fas fa-times"></i>
//                     </button>
//                 </div>
//                 <div style="text-align: center;">
//                     <div style="margin-bottom: 1rem;">
//                         <img src="data:image/png;base64,${qrCodeBase64}" 
//                              alt="QR Code PIX" 
//                              style="margin: 0 auto; width: 200px; height: 200px;">
//                     </div>
//                     <p id="pix-countdown" style="margin-bottom: 0.5rem; font-size: 0.875rem; color: #666;">
//                         Calculando tempo restante...
//                     </p>
//                     <p style="font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem;">Valor: R$ 49,90</p>
                    
//                     <div style="margin-top: 1rem; margin-bottom: 1rem;">
//                         <button id="copy-pix-button" onclick="navigator.clipboard.writeText('${qrCodeText}').then(() => document.getElementById('copy-pix-button').textContent = 'Código Copiado!')"
//                                 style="padding: 0.5rem 1rem; background-color: #e9ecef; color: #333; border-radius: 0.25rem; border: none; cursor: pointer; width: 80%; margin: 0 auto; display: block;">
//                             Copiar Código PIX
//                         </button>
//                     </div>
                    
//                     <div style="border-top: 1px solid #e9ecef; padding-top: 1rem; margin-top: 1rem;">
//                         <p style="font-size: 0.875rem; color: #666; margin-bottom: 0.5rem;">
//                             1. Abra o app do seu banco
//                         </p>
//                         <p style="font-size: 0.875rem; color: #666; margin-bottom: 0.5rem;">
//                             2. Escolha pagar via PIX com QR Code
//                         </p>
//                         <p style="font-size: 0.875rem; color: #666; margin-bottom: 0.5rem;">
//                             3. Escaneie o QR Code acima ou cole o código copiado
//                         </p>
//                         <p style="font-size: 0.875rem; color: #666;">
//                             4. Confirme o pagamento no app do seu banco
//                         </p>
//                     </div>
//                     <div style="margin-top: 1.5rem; font-size: 0.875rem; color: #666;">
//                         Aguardando confirmação do pagamento...
//                     </div>
//                 </div>
//             </div>
//         `;
//     }
// }

// // Inicializa o controlador do modal
// const pixModal = new PixModalController();



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
        this.paymentId = null; // Armazenar o ID do pagamento
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
                this.renderQRCode(result.qrCodeBase64, result.qrCodeText);
                this.paymentId = result.paymentId; // Armazenar o ID para uso posterior
                this.startPaymentCheck(result.paymentId);
                this.startExpirationCountdown();

                // Iniciar a simulação - em 10 segundos o pagamento será "aprovado"
                this.simulationStartTime = Date.now();
                console.log("Iniciando simulação de pagamento: em 10 segundos será aprovado!");

                // Ignore o erro do Firebase e continue com o fluxo
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
                    // Apenas registre o erro, mas não o trate como fatal
                    console.log("Não foi possível salvar no Firebase (isso é esperado em testes):", dbError);
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

        // Verificar imediatamente e depois a cada 3 segundos
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
            // SIMULAÇÃO: Se passaram 10 segundos desde o início, considere o pagamento aprovado
            if (this.simulationStartTime) {
                const elapsed = Date.now() - this.simulationStartTime;
                console.log(`Tempo decorrido desde início: ${Math.floor(elapsed / 1000)} segundos`);

                if (elapsed >= 10000) { // 10 segundos
                    console.log("!! SIMULAÇÃO: 10 segundos passados, considerando pagamento APROVADO !!");
                    this.clearIntervals();
                    this.handlePaymentSuccess(paymentId);
                    return;
                }
            }

            // Verificação normal com a API
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

    async handlePaymentSuccess(paymentId) {
        try {
            // Tente atualizar o Firebase, mas não dependa disso
            try {
                const paymentRef = db.collection('pending_payments').doc(paymentId.toString());
                await paymentRef.update({
                    status: 'approved',
                    approved_at: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log("Status de pagamento atualizado no Firestore");
            } catch (firebaseError) {
                // Apenas registre o erro, não o trate como fatal
                console.log("Firebase não atualizado (isso é esperado em testes):", firebaseError);
            }

            this.hide();
            showSuccess('Pagamento confirmado com sucesso!');

            // Exibir formulário de registro
            const registerForm = document.getElementById('register-form');
            registerForm.classList.remove('hidden');
            registerForm.scrollIntoView({ behavior: 'smooth' });

            // Atualizar estado da aplicação
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
                            <strong>SIMULAÇÃO:</strong> Pagamento será considerado aprovado em 10 segundos!
                        </p>
                    </div>
                </div>
            </div>
        `;
    }
}

// Inicializa o controlador do modal
const pixModal = new PixModalController();