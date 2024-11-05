// Estado da aplicação
const state = {
    selectedMethod: null,
    processing: false,
    completed: false,
    paymentData: null
};

// Elementos DOM
const elements = {
    paymentOptions: document.querySelectorAll('.payment-option'),
    paymentForms: document.getElementById('payment-forms'),
    registerForm: document.getElementById('register-form'),
    statusMessages: document.getElementById('status-messages'),
    loadingModal: document.getElementById('loading-modal'),
    successModal: document.getElementById('success-modal'),
    errorModal: document.getElementById('error-modal')
};

// Handlers de Pagamento
const paymentHandlers = {
    mercadopago: async () => {
        const mp = new MercadoPago('TEST-PUBLIC-KEY');
        const bricksBuilder = mp.bricks();

        await bricksBuilder.create('wallet', 'mercadopago-form', {
            initialization: {
                amount: 49.90,
                preferenceId: 'YOUR_PREFERENCE_ID'
            },
            callbacks: {
                onSubmit: async (data) => {
                    await handlePaymentSuccess();
                },
                onError: (error) => {
                    handlePaymentError(error);
                }
            }
        });

        return true;
    },

    paypal: async () => {
        const paypalButtons = paypal.Buttons({
            createOrder: (data, actions) => {
                return actions.order.create({
                    purchase_units: [{
                        amount: {
                            value: '49.90'
                        }
                    }]
                });
            },
            onApprove: async (data, actions) => {
                const order = await actions.order.capture();
                await handlePaymentSuccess(order);
            },
            onError: (err) => {
                handlePaymentError(err);
            }
        });

        await paypalButtons.render('#paypal-form');
        return true;
    },

    pix: async () => {
        const pixForm = document.getElementById('pix-form');
        pixForm.innerHTML = `
            <div class="pix-container">
                <div class="qr-code">
                    <img src="pix-qrcode.png" alt="QR Code PIX" />
                </div>
                <div class="pix-info">
                    <p>Valor: R$ 49,90</p>
                    <p>Chave PIX: exemplo@atalho.com</p>
                </div>
                <button class="btn" onclick="checkPixPayment()">
                    Já fiz o pagamento
                </button>
            </div>
        `;
        return true;
    },

    creditcard: async () => {
        const form = document.getElementById('creditcard-form');
        form.innerHTML = `
            <form id="cc-form" class="credit-card-form">
                <div class="form-group">
                    <label>Número do Cartão</label>
                    <input type="text" id="cc-number" maxlength="19" placeholder="1234 5678 9012 3456" required>
                </div>
                <div class="form-group">
                    <label>Nome no Cartão</label>
                    <input type="text" id="cc-name" placeholder="Nome como está no cartão" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Validade</label>
                        <input type="text" id="cc-expiry" maxlength="5" placeholder="MM/AA" required>
                    </div>
                    <div class="form-group">
                        <label>CVV</label>
                        <input type="text" id="cc-cvv" maxlength="4" placeholder="123" required>
                    </div>
                </div>
                <button type="submit" class="btn">Pagar R$ 49,90</button>
            </form>
        `;

        initializeCreditCardForm();
        return true;
    }
};

// Funções Auxiliares
function showLoading(message = 'Processando...') {
    elements.loadingModal.classList.remove('hidden');
    document.getElementById('loading-message').textContent = message;
}

function hideLoading() {
    elements.loadingModal.classList.add('hidden');
}

function showError(message) {
    elements.errorModal.classList.remove('hidden');
    document.getElementById('error-message').textContent = message;
}

function closeErrorModal() {
    elements.errorModal.classList.add('hidden');
}

function showSuccess() {
    elements.successModal.classList.remove('hidden');
}

async function handlePaymentSuccess(data = {}) {
    state.completed = true;
    state.paymentData = data;
    showSuccess();
    elements.registerForm.classList.remove('hidden');
}

function handlePaymentError(error) {
    console.error('Payment error:', error);
    showError('Ocorreu um erro ao processar o pagamento. Por favor, tente novamente.');
}

// Validação de Senha
function validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*]/.test(password);

    let strength = 0;
    let feedback = [];

    if (password.length >= minLength) strength += 25;
    if (hasUpperCase) strength += 25;
    if (hasLowerCase) strength += 25;
    if (hasNumbers) strength += 12.5;
    if (hasSpecialChar) strength += 12.5;

    const meter = document.querySelector('.meter-bar');
    meter.style.width = `${strength}%`;

    if (strength < 40) {
        meter.style.backgroundColor = '#ff4444';
        feedback.push('Senha muito fraca');
    } else if (strength < 70) {
        meter.style.backgroundColor = '#ffa700';
        feedback.push('Senha média');
    } else {
        meter.style.backgroundColor = '#00C851';
        feedback.push('Senha forte');
    }

    document.querySelector('.strength-text').textContent = feedback.join('. ');
    return strength >= 70;
}

// Inicialização
async function initializePayment(method) {
    if (state.processing) return;

    state.processing = true;
    state.selectedMethod = method;

    showLoading(`Inicializando ${method}...`);

    try {
        const handler = paymentHandlers[method];
        if (!handler) {
            throw new Error(`Método de pagamento ${method} não implementado`);
        }

        // Limpa forms anteriores
        Array.from(elements.paymentForms.children).forEach(form => {
            form.style.display = 'none';
            form.innerHTML = '';
        });

        // Inicializa o método selecionado
        const success = await handler();
        if (success) {
            const currentForm = document.getElementById(`${method}-form`);
            currentForm.style.display = 'block';
        } else {
            throw new Error('Falha ao inicializar forma de pagamento');
        }

    } catch (error) {
        console.error('Erro ao processar pagamento:', error);
        showError('Erro ao inicializar forma de pagamento. Por favor, tente novamente.');
    } finally {
        state.processing = false;
        hideLoading();
    }
}

// Inicialização do formulário de cartão de crédito
function initializeCreditCardForm() {
    const form = document.getElementById('cc-form');
    const numberInput = document.getElementById('cc-number');
    const expiryInput = document.getElementById('cc-expiry');
    const cvvInput = document.getElementById('cc-cvv');

    // Formatação do número do cartão
    numberInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        value = value.replace(/(\d{4})/g, '$1 ').trim();
        e.target.value = value;
    });

    // Formatação da data de validade
    expiryInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.slice(0, 2) + '/' + value.slice(2);
        }
        e.target.value = value;
    });

    // Somente números no CVV
    cvvInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
    });

    // Submit do formulário
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await processCreditCardPayment(form);
    });
}

// Processamento do pagamento com cartão
async function processCreditCardPayment(form) {
    showLoading('Processando pagamento...');

    try {
        // Simulação de processamento
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Aqui você implementaria a integração real com a API de pagamento
        await handlePaymentSuccess({
            method: 'credit_card',
            last4: form.querySelector('#cc-number').value.slice(-4)
        });

    } catch (error) {
        handlePaymentError(error);
    } finally {
        hideLoading();
    }
}

// Verificação do pagamento PIX
async function checkPixPayment() {
    showLoading('Verificando pagamento PIX...');

    try {
        // Simulação de verificação
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Aqui você implementaria a verificação real do pagamento PIX
        await handlePaymentSuccess({
            method: 'pix',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        handlePaymentError(error);
    } finally {
        hideLoading();
    }
}

// Registro do usuário
async function registerUser(formData) {
    const db = firebase.firestore();
    const subStart = new Date();
    const subEnd = new Date(subStart);
    subEnd.setFullYear(subEnd.getFullYear() + 1);

    const userData = {
        Nome: formData.name,
        active_machines: 0,
        country: formData.country,
        email: formData.email,
        pay_method: state.selectedMethod,
        senha: formData.password,
        sub_start: subStart.toISOString(),
        sub_end: subEnd.toISOString(),
        user: { uid: generateUID() },
        payment_data: state.paymentData
    };

    await db.collection('users').add(userData);
}

// Validações do formulário de registro
function validateForm() {
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    let isValid = true;

    // Validação do nome
    if (name.length < 3) {
        showFieldError('name', 'Nome deve ter pelo menos 3 caracteres');
        isValid = false;
    }

    // Validação do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showFieldError('email', 'Email inválido');
        isValid = false;
    }

    // Validação da senha
    if (!validatePassword(password)) {
        showFieldError('password', 'Senha não atende aos requisitos mínimos');
        isValid = false;
    }

    // Confirmação de senha
    if (password !== confirmPassword) {
        showFieldError('confirm-password', 'As senhas não coincidem');
        isValid = false;
    }

    return isValid;
}

function showFieldError(fieldId, message) {
    const errorElement = document.getElementById(`${fieldId}-error`);
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function clearFieldError(fieldId) {
    const errorElement = document.getElementById(`${fieldId}-error`);
    errorElement.style.display = 'none';
}

function generateUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Listeners para opções de pagamento
    elements.paymentOptions.forEach(option => {
        option.addEventListener('click', async function () {
            elements.paymentOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            await initializePayment(this.dataset.method);
        });
    });

    // Listener para o formulário de registro
    elements.registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        showLoading('Finalizando registro...');

        try {
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                country: document.getElementById('country').value,
                password: document.getElementById('password').value
            };

            await registerUser(formData);
            window.location.href = '/success.html';
        } catch (error) {
            console.error('Erro no registro:', error);
            showError('Erro ao finalizar registro. Por favor, tente novamente.');
        } finally {
            hideLoading();
        }
    });

    // Listeners para validação em tempo real
    ['name', 'email', 'password', 'confirm-password'].forEach(fieldId => {
        const input = document.getElementById(fieldId);
        input.addEventListener('input', () => {
            clearFieldError(fieldId);
            if (fieldId === 'password') {
                validatePassword(input.value);
            }
        });
    });
});