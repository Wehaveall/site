// Estado da aplicação
const state = {
    selectedMethod: null,
    processing: false,
    completed: false,
    user: null
};

function showLoading(message = 'Processando...') {
    document.getElementById('loading-modal').classList.remove('hidden');
    document.getElementById('loading-message').textContent = message;
}

function hideLoading() {
    document.getElementById('loading-modal').classList.add('hidden');
}

function showSuccess(message = 'Operação realizada com sucesso!') {
    document.getElementById('success-modal').classList.remove('hidden');
    document.getElementById('success-message').textContent = message;
    setTimeout(() => {
        document.getElementById('success-modal').classList.add('hidden');
    }, 3000);
}

function showError(message) {
    console.error("Erro mostrado ao usuário:", message);
    document.getElementById('error-modal').classList.remove('hidden');
    document.getElementById('error-message').textContent = message;
}

function showFieldError(fieldId, message) {
    const errorElement = document.getElementById(`${fieldId}-error`);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function clearFieldError(fieldId) {
    const errorElement = document.getElementById(`${fieldId}-error`);
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

// Validação de força de senha
function validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*]/.test(password);

    let strength = 0;

    if (password.length >= minLength) strength += 25;
    if (hasUpperCase) strength += 25;
    if (hasLowerCase) strength += 25;
    if (hasNumbers) strength += 12.5;
    if (hasSpecialChar) strength += 12.5;

    const meter = document.querySelector('.meter-bar');
    meter.style.width = `${strength}%`;

    if (strength < 40) {
        meter.style.backgroundColor = '#ff4444';
        document.querySelector('.strength-text').textContent = 'Senha muito fraca';
    } else if (strength < 70) {
        meter.style.backgroundColor = '#ffa700';
        document.querySelector('.strength-text').textContent = 'Senha média';
    } else {
        meter.style.backgroundColor = '#00C851';
        document.querySelector('.strength-text').textContent = 'Senha forte';
    }

    return strength >= 70;
}

function validateForm() {
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    let isValid = true;

    // Reset all errors
    ['name', 'email', 'password', 'confirm-password'].forEach(fieldId => {
        clearFieldError(fieldId);
    });

    // Name validation
    if (name.length < 3) {
        showFieldError('name', 'Nome deve ter pelo menos 3 caracteres');
        isValid = false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showFieldError('email', 'Email inválido');
        isValid = false;
    }

    // Password validation
    if (!validatePassword(password)) {
        showFieldError('password', 'Senha não atende aos requisitos mínimos');
        isValid = false;
    }

    // Confirm password
    if (password !== confirmPassword) {
        showFieldError('confirm-password', 'As senhas não coincidem');
        isValid = false;
    }

    // Payment method validation
    if (!state.selectedMethod) {
        showError('Por favor, selecione um método de pagamento');
        isValid = false;
    }

    return isValid;
}

/**
 * Integrações Reais (Exemplos):
 * - Mercado Pago: redirecionar para URL de Checkout ou abrir Checkout Transparente.
 * - PayPal: redirecionar para PayPal ou usar SDK com botões.
 * - PIX: gerar QR Code e exibir para o usuário.
 * - PagSeguro: integrar via Lightbox ou redirecionamento.
 * 
 * Abaixo é apenas um exemplo de como simular.
 */

async function simulatePayment(method) {
    if (state.processing) return;

    state.processing = true;
    try {
        showLoading(`Processando pagamento via ${method}...`);

        // Exemplo de "tempo de processamento"
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Se fosse uma chamada real, seria algo como:
        // const paymentResponse = await fetch('/api/pagamento', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ method, valor: 49.90 })
        // });
        // const result = await paymentResponse.json();
        // if (!result.sucesso) throw new Error(result.mensagem);

        // Ou usar SDK do PayPal, Mercado Pago, etc.

        state.completed = true;
        state.selectedMethod = method;

        hideLoading();
        showSuccess('Pagamento processado com sucesso!');

        // Exibe formulário para cadastro
        const registerForm = document.getElementById('register-form');
        registerForm.classList.remove('hidden');
        registerForm.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Erro na simulação:', error);
        hideLoading();
        showError('Erro ao processar pagamento. Por favor, tente novamente.');
    } finally {
        state.processing = false;
    }
}

async function registerUser(userData) {
    if (state.processing) return;
    if (!userData.payMethod) {
        showError('Por favor, selecione um método de pagamento primeiro');
        return;
    }

    state.processing = true;
    showLoading('Finalizando cadastro...');

    try {
        console.log("Iniciando registro do usuário...");

        // Cria usuário no Firebase Auth
        const userCredential = await auth
            .createUserWithEmailAndPassword(userData.email, userData.password)
            .catch(error => {
                console.error("Erro na criação do usuário:", error);
                throw error;
            });

        console.log("Usuário criado com sucesso:", userCredential.user.uid);

        // Prepara documento do usuário
        const userDoc = {
            uid: userCredential.user.uid,
            Nome: userData.name,
            active_machines: 0,
            country: userData.country,
            email: userData.email,
            pay_method: userData.payMethod,
            sub_start: new Date().toISOString(),
            sub_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'active',
            last_login: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Salva no Firestore
        try {
            await db.collection('users').doc(userCredential.user.uid).set(userDoc);
            console.log("Documento do usuário criado com sucesso");
        } catch (firestoreError) {
            console.error("Erro ao criar documento no Firestore:", firestoreError);
            // Se Firestore falhar, deletar usuário
            await userCredential.user.delete();
            throw new Error("Erro ao salvar dados do usuário");
        }

        // Atualiza perfil do usuário
        try {
            await userCredential.user.updateProfile({ displayName: userData.name });
            console.log("Perfil do usuário atualizado com sucesso");
        } catch (profileError) {
            console.error("Erro ao atualizar perfil:", profileError);
            // Erro não-fatal
        }

        showSuccess('Cadastro realizado com sucesso!');

        // Armazena localmente (apenas para exemplo)
        localStorage.setItem('userId', userCredential.user.uid);
        localStorage.setItem('userEmail', userData.email);

        // Redireciona após sucesso
        setTimeout(() => {
            window.location.href = 'success.html';
        }, 2000);

    } catch (error) {
        console.error('Erro completo:', error);
        let errorMessage = 'Erro ao finalizar cadastro';

        if (error.code) {
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Este email já está cadastrado';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Email inválido';
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage = 'Operação não permitida - verifique as configurações do Firebase';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'A senha deve ter pelo menos 6 caracteres';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Erro de conexão. Verifique sua internet';
                    break;
                default:
                    errorMessage = `Erro ao finalizar cadastro: ${error.message}`;
            }
        }

        showError(errorMessage);
    } finally {
        state.processing = false;
        hideLoading();
    }
}

// Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log("Página de compra carregada");

    // Monitora auth
    auth.onAuthStateChanged((user) => {
        state.user = user;
        if (user) {
            console.log('Usuário autenticado:', user.uid);
            db.collection('users')
                .doc(user.uid)
                .update({ last_login: firebase.firestore.FieldValue.serverTimestamp() })
                .catch(console.error);
        }
    });

    // Botões de pagamento
    const paymentOptions = document.querySelectorAll('.payment-option');
    paymentOptions.forEach(option => {
        option.addEventListener('click', async function () {
            if (!state.processing) {
                paymentOptions.forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
                await simulatePayment(this.dataset.method);
            }
        });
    });

    // Formulário
    const registerForm = document.getElementById('register-form');
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        const formData = {
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            country: document.getElementById('country').value.trim(),
            password: document.getElementById('password').value,
            payMethod: state.selectedMethod
        };
        console.log("Dados do formulário:", { ...formData, password: '***' });

        await registerUser(formData);
    });

    // Validação em tempo real
    ['name', 'email', 'password', 'confirm-password'].forEach(fieldId => {
        const input = document.getElementById(fieldId);
        if (input) {
            input.addEventListener('input', () => {
                clearFieldError(fieldId);
                if (fieldId === 'password') {
                    validatePassword(input.value);
                }
            });
        }
    });

    // Fecha modal ao clicar fora
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });
});
