// simple-register.js - Registro simples via API (sem CORS)

async function registerUserSimple(email, password, language = 'pt-br', name = '') {
    try {
        // Obter serviços do Firebase
        const { auth, functions } = await getFirebaseServices();
        
        // Criar usuário
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        console.log(i18next.t('register.feedback.logs.userCreated'), userCredential);
        
        // Atualizar perfil com nome
        if (name) {
            await userCredential.user.updateProfile({
                displayName: name
            });
            console.log(i18next.t('register.feedback.logs.nameUpdated'), name);
        }
        
        // Enviar email de verificação
        await userCredential.user.sendEmailVerification({
            url: window.location.origin + '/emailHandler.html?lang=' + language
        });
        console.log(i18next.t('register.feedback.logs.verificationEmailSent'));
        
        return userCredential;
    } catch (error) {
        console.error(i18next.t('register.feedback.logs.registrationError'), error);
        
        // Traduzir mensagens de erro comuns
        let translatedError = error;
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                translatedError = new Error(i18next.t('register.errors.emailInUse'));
                break;
            case 'auth/invalid-email':
                translatedError = new Error(i18next.t('register.errors.invalidEmail'));
                break;
            case 'auth/operation-not-allowed':
                translatedError = new Error(i18next.t('register.errors.operationNotAllowed'));
                break;
            case 'auth/weak-password':
                translatedError = new Error(i18next.t('register.errors.weakPassword'));
                break;
            default:
                translatedError = new Error(i18next.t('register.errors.generic'));
        }
        
        throw translatedError;
    }
}

// Função para validar formulário
function validateForm() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const confirmPassword = document.getElementById('login-confirm-password').value;
    const name = document.getElementById('customer-name').value;
    const termsAccepted = document.getElementById('terms-checkbox').checked;
    
    // Validar email
    if (!email) {
        showError(i18next.t('register.validation.emailRequired'));
        return false;
    }
    
    // Validar senha
    if (!password) {
        showError(i18next.t('register.validation.passwordRequired'));
        return false;
    }
    
    // Validar confirmação de senha
    if (password !== confirmPassword) {
        showError(i18next.t('register.validation.passwordMismatch'));
        return false;
    }
    
    // Validar nome
    if (!name) {
        showError(i18next.t('register.validation.nameRequired'));
        return false;
    }
    
    // Validar termos
    if (!termsAccepted) {
        showError(i18next.t('register.validation.termsRequired'));
        return false;
    }
    
    return true;
}

// Função para mostrar erro
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        // Esconder após 5 segundos
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

// Função para atualizar texto do botão
function updateSubmitButton(text, disabled = false) {
    const button = document.getElementById('complete-registration-btn');
    if (button) {
        button.textContent = text;
        button.disabled = disabled;
    }
}

// Função para mostrar mensagem de sucesso
function showSuccessMessage(email) {
    const modalHtml = `
        <div class="modal-content text-center">
            <img src="assets/img/Atalho.png" alt="Logo Atalho" style="width: 80px; margin-bottom: 20px;">
            <h3>${i18next.t('register.success.title')}</h3>
            <p class="email-sent-to">
                <span class="dot-indicator"></span>
                ${i18next.t('register.success.subtitle')}:<br>
                <strong>${email}</strong>
            </p>
            <div class="check-email-box">
                <span class="check-icon">✓</span>
                ${i18next.t('register.success.checkEmail')}
            </div>
            <button class="btn-understand">${i18next.t('register.success.understand')}</button>
        </div>
    `;
    
    // Criar e mostrar o modal
    const modalContainer = document.createElement('div');
    modalContainer.className = 'success-modal';
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    // Configurar botão de fechar
    const closeButton = modalContainer.querySelector('.btn-understand');
    closeButton.addEventListener('click', () => {
        modalContainer.remove();
        window.location.href = 'login.html';
    });
}

// Função para registrar usuário
async function handleRegistration(event) {
    event.preventDefault();
    
    const submitButton = document.getElementById('complete-registration-btn');
    const originalText = submitButton.textContent;
    
    try {
        // Validar formulário
        if (!validateForm()) {
            return;
        }
        
        // Obter dados do formulário
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const name = document.getElementById('customer-name').value;
        const phone = document.getElementById('customer-phone').value;
        const company = document.getElementById('customer-company').value;
        
        // Desabilitar botão e mostrar loading
        submitButton.disabled = true;
        submitButton.textContent = i18next.t('register.feedback.creatingAccount');
        
        // Registrar usuário
        const registrationResult = await registerUserSimple(email, password, i18next.language, name);
        console.log(i18next.t('register.feedback.logs.registrationSuccess'), registrationResult);
        submitButton.textContent = i18next.t('register.feedback.accountCreated');
        
        // Salvar dados extras
        submitButton.textContent = i18next.t('register.feedback.savingData');
        
        // Aqui você pode adicionar a lógica para salvar dados extras
        // como telefone e empresa
        
        submitButton.textContent = i18next.t('register.feedback.dataSaved');
        
        // Mostrar modal de sucesso
        showSuccessModal({
            title: i18next.t('register.success.title'),
            email: email,
            message: i18next.t('register.success.subtitle'),
            checkEmail: i18next.t('register.success.checkEmail'),
            buttonText: i18next.t('register.success.understand')
        });
        
    } catch (error) {
        console.error(i18next.t('register.feedback.logs.registrationError'), error);
        
        // Mostrar erro traduzido
        submitButton.textContent = i18next.t('register.feedback.error', { message: error.message });
        submitButton.disabled = false;
        
        // Restaurar texto original após 3 segundos
        setTimeout(() => {
            submitButton.textContent = originalText;
        }, 3000);
    }
}

// Função para mostrar modal de sucesso
function showSuccessModal({ title, email, message, checkEmail, buttonText }) {
    const modalHtml = `
        <div class="modal-content text-center">
            <img src="assets/img/Atalho.png" alt="Logo Atalho" style="width: 80px; margin-bottom: 20px;">
            <h3>${title}</h3>
            <p class="email-sent-to">
                <span class="dot-indicator"></span>
                ${message}:<br>
                <strong>${email}</strong>
            </p>
            <div class="check-email-box">
                <span class="check-icon">✓</span>
                ${checkEmail}
            </div>
            <button class="btn-understand">${buttonText}</button>
        </div>
    `;
    
    // Criar e mostrar o modal
    const modalContainer = document.createElement('div');
    modalContainer.className = 'success-modal';
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    // Configurar botão de fechar
    const closeButton = modalContainer.querySelector('.btn-understand');
    closeButton.addEventListener('click', () => {
        modalContainer.remove();
        window.location.href = 'login.html';
    });
}

// Expor globalmente
window.registerUserSimple = registerUserSimple;

console.log(i18next.t('register.feedback.logs.systemLoaded')); 