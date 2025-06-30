// Estado da aplicação
const state = {
    selectedMethod: null,
    processing: false,
    completed: false,
    user: null,
    paymentId: null
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

function showAuthRequiredModal() {
    // Criar modal personalizado se não existir
    let authModal = document.getElementById('auth-required-modal');
    if (!authModal) {
        authModal = createAuthRequiredModal();
        document.body.appendChild(authModal);
    }
    
    // Mostrar o modal
    authModal.classList.remove('hidden');
    
    // Adicionar efeito de fade-in
    setTimeout(() => {
        authModal.style.opacity = '1';
    }, 10);
    
    // Adicionar listener para tecla ESC
    const escListener = (e) => {
        if (e.key === 'Escape') {
            closeAuthRequiredModal();
            document.removeEventListener('keydown', escListener);
        }
    };
    document.addEventListener('keydown', escListener);
}

function createAuthRequiredModal() {
    const modal = document.createElement('div');
    modal.id = 'auth-required-modal';
    modal.className = 'auth-modal hidden';
    modal.style.opacity = '0';
    modal.style.transition = 'opacity 0.3s ease';
    
    modal.innerHTML = `
        <div class="auth-modal-content">
            <div class="auth-modal-header">
                <i class="fas fa-user-lock auth-modal-icon"></i>
                <h3>Login Necessário</h3>
                <button class="auth-modal-close" onclick="closeAuthRequiredModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="auth-modal-body">
                <p>Para fazer um pagamento, você precisa estar logado em sua conta.</p>
                <p>Faça login ou crie uma conta para continuar com sua compra.</p>
            </div>
            <div class="auth-modal-footer">
                <a href="login.html" class="auth-btn auth-btn-primary">
                    <i class="fas fa-sign-in-alt"></i>
                    Fazer Login
                </a>
                <a href="register.html" class="auth-btn auth-btn-secondary">
                    <i class="fas fa-user-plus"></i>
                    Criar Conta
                </a>
            </div>
        </div>
    `;
    
    // Fechar modal ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeAuthRequiredModal();
        }
    });
    
    return modal;
}

function closeAuthRequiredModal() {
    const authModal = document.getElementById('auth-required-modal');
    if (authModal) {
        // Fade out
        authModal.style.opacity = '0';
        setTimeout(() => {
            authModal.classList.add('hidden');
            highlightAuthMenus();
        }, 300);
    }
}

function highlightAuthMenus() {
    // Destacar menus de login e cadastro
    const loginLink = document.getElementById('nav-login');
    const registerLink = document.getElementById('nav-register');
    
    if (loginLink) {
        loginLink.classList.add('highlight-auth');
        setTimeout(() => {
            loginLink.classList.remove('highlight-auth');
        }, 3000);
    }
    
    if (registerLink) {
        registerLink.classList.add('highlight-auth');
        setTimeout(() => {
            registerLink.classList.remove('highlight-auth');
        }, 3000);
    }
}

// Expor funções globalmente para uso no onclick
window.closeAuthRequiredModal = closeAuthRequiredModal;
window.showAuthRequiredModal = showAuthRequiredModal;

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
    if (meter) {
        meter.style.width = `${strength}%`;

        if (strength < 40) {
            meter.style.backgroundColor = '#ff4444';
            const strengthText = document.querySelector('.strength-text');
            if (strengthText) strengthText.textContent = 'Senha muito fraca';
        } else if (strength < 70) {
            meter.style.backgroundColor = '#ffa700';
            const strengthText = document.querySelector('.strength-text');
            if (strengthText) strengthText.textContent = 'Senha média';
        } else {
            meter.style.backgroundColor = '#00C851';
            const strengthText = document.querySelector('.strength-text');
            if (strengthText) strengthText.textContent = 'Senha forte';
        }
    }

    return strength >= 70;
}

function validateForm() {
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    let isValid = true;

    ['name', 'email', 'password', 'confirm-password'].forEach(fieldId => {
        clearFieldError(fieldId);
    });

    if (name.length < 3) {
        showFieldError('name', 'Nome deve ter pelo menos 3 caracteres');
        isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showFieldError('email', 'Email inválido');
        isValid = false;
    }

    if (!validatePassword(password)) {
        showFieldError('password', 'Senha não atende aos requisitos mínimos');
        isValid = false;
    }

    if (password !== confirmPassword) {
        showFieldError('confirm-password', 'As senhas não coincidem');
        isValid = false;
    }

    if (!state.selectedMethod) {
        showError('Por favor, selecione um método de pagamento');
        isValid = false;
    }

    return isValid;
}

// Função para esconder todos os containers de pagamento
function hideAllPaymentContainers() {
    const containers = ['stripe-container', 'paypal-container'];
    containers.forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            container.style.display = 'none';
        }
    });
}

async function processPayment(method) {
    if (state.processing) return;

    // ✅ VERIFICAÇÃO DE AUTENTICAÇÃO OBRIGATÓRIA
    const currentUser = window.auth ? window.auth.currentUser : null;
    if (!state.user && !currentUser) {
        console.log('❌ Usuário não logado, bloqueando pagamento');
        showAuthRequiredModal();
        return;
    }

    // Se currentUser existe mas state.user não, atualizar state.user
    if (currentUser && !state.user) {
        state.user = currentUser;
        console.log('🔄 Sincronizando state.user com currentUser');
    }

    // ✅ VALIDAÇÃO DE SEGURANÇA ANTES DO PAGAMENTO
    if (window.securityValidator) {
        const validationResult = window.securityValidator.validatePaymentAttempt({
            method,
            userEmail: state.user.email,
            timestamp: Date.now()
        });

        if (!validationResult.valid) {
            showError(`Pagamento bloqueado: ${validationResult.reason === 'rate_limit' ? 'Muitas tentativas' : 'Dados suspeitos'}`);
            return;
        }
    }

    // Esconder outros containers de pagamento
    hideAllPaymentContainers();

    const userEmail = state.user?.email || currentUser?.email;
    const userName = state.user?.displayName || currentUser?.displayName || 'Cliente';

    try {
        console.log(`💳 Processando pagamento via ${method}`);

        switch (method) {
            case 'pix':
                await handlePixPayment(userEmail, userName);
                break;
                
            case 'stripe':
                await handleStripePayment(userEmail, userName);
                break;
                
            case 'paypal':
                await handlePayPalPayment(userEmail, userName);
                break;
                
            default:
                throw new Error('Método de pagamento não suportado');
        }

    } catch (error) {
        console.error('❌ Erro no processo de pagamento:', error);
        showError('Erro ao processar pagamento: ' + error.message);
        hideAllPaymentContainers();
    }
}

// Função para PIX (mantém a lógica existente)
async function handlePixPayment(userEmail, userName) {
    const userData = {
        name: userName || 'Usuário',
        email: userEmail,
        uid: state.user.uid
    };
    
    // Aguardar pixModal estar disponível
    if (!window.pixModal) {
        console.log('⏳ Aguardando PixModal estar disponível...');
        let attempts = 0;
        while (!window.pixModal && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.pixModal) {
            throw new Error('PixModal não disponível');
        }
    }
    
    await window.pixModal.show(userData);
}

// Função para Stripe
async function handleStripePayment(userEmail, userName) {
    try {
        showLoading('Preparando pagamento com cartão...');

        // Determinar moeda baseada no idioma atual
        const currentLanguage = window.i18nSystem ? window.i18nSystem.getCurrentLanguage() : 'pt-br';
        const currency = window.stripeService.getCurrencyByLanguage(currentLanguage);
        const amount = window.stripeService.getAmountByCurrency(currency);

        console.log(`💰 Criando pagamento Stripe: ${amount} ${currency}`);

        // Criar Payment Intent
        await window.stripeService.createPaymentIntent(amount, currency, userEmail);

        // Mostrar container do Stripe
        const stripeContainer = document.getElementById('stripe-container');
        if (stripeContainer) {
            stripeContainer.style.display = 'block';
            
            // Criar elementos do Stripe
            await window.stripeService.createCardElement('#stripe-elements');
            
            // Mostrar botão de submit
            const submitButton = document.getElementById('stripe-submit');
            if (submitButton) {
                submitButton.style.display = 'block';
                
                // Configurar listener do botão
                submitButton.onclick = async () => {
                    submitButton.disabled = true;
                    submitButton.textContent = 'Processando...';
                    
                    try {
                        showLoading('Processando pagamento...');
                        const result = await window.stripeService.confirmPayment(userEmail, userName);
                        
                        if (result.success) {
                            hideLoading();
                            showSuccess('Pagamento realizado com sucesso!');
                            setTimeout(() => {
                                window.location.href = '/success.html';
                            }, 2000);
                        }
                    } catch (error) {
                        console.error('❌ Erro no pagamento Stripe:', error);
                        showError('Erro no pagamento: ' + error.message);
                        submitButton.disabled = false;
                        submitButton.textContent = i18nSystem ? i18nSystem.t('purchase.stripe.submit') : 'Pagar Agora';
                    } finally {
                        hideLoading();
                    }
                };
            }
        }

        hideLoading();
        console.log('✅ Container Stripe configurado');

    } catch (error) {
        hideLoading();
        console.error('❌ Erro ao configurar Stripe:', error);
        throw error;
    }
}

// Função para PayPal
async function handlePayPalPayment(userEmail, userName) {
    try {
        showLoading('Preparando pagamento PayPal...');

        // Determinar moeda baseada no idioma atual
        const currentLanguage = window.i18nSystem ? window.i18nSystem.getCurrentLanguage() : 'pt-br';
        const currency = window.paypalService.getCurrencyByLanguage(currentLanguage);

        console.log(`💰 Configurando PayPal: ${currency}`);

        // Mostrar container do PayPal
        const paypalContainer = document.getElementById('paypal-container');
        if (paypalContainer) {
            paypalContainer.style.display = 'block';
            
            // Renderizar botões do PayPal
            await window.paypalService.renderButtons('#paypal-buttons', userEmail, currency);
        }

        hideLoading();
        console.log('✅ Container PayPal configurado');

    } catch (error) {
        hideLoading();
        console.error('❌ Erro ao configurar PayPal:', error);
        throw error;
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

        // Verificar se o pagamento foi realmente confirmado
        if (state.paymentId) {
            const paymentRef = db.collection('pending_payments').doc(state.paymentId.toString());
            const paymentDoc = await paymentRef.get();

            if (!paymentDoc.exists || paymentDoc.data().status !== 'approved') {
                throw new Error('Pagamento não confirmado. Por favor, complete o pagamento antes de prosseguir.');
            }
        }

        const userCredential = await auth
            .createUserWithEmailAndPassword(userData.email, userData.password)
            .catch(error => {
                console.error("Erro na criação do usuário:", error);
                throw error;
            });

        console.log("Usuário criado com sucesso:", userCredential.user.uid);

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

        try {
            await db.collection('users').doc(userCredential.user.uid).set(userDoc);
            console.log("Documento do usuário criado com sucesso");

            // Associar o pagamento ao usuário, se houver um paymentId
            if (state.paymentId) {
                await db.collection('pending_payments').doc(state.paymentId.toString()).update({
                    user_uid: userCredential.user.uid
                });
            }
        } catch (firestoreError) {
            console.error("Erro ao criar documento no Firestore:", firestoreError);
            await userCredential.user.delete();
            throw new Error("Erro ao salvar dados do usuário");
        }

        try {
            await userCredential.user.updateProfile({ displayName: userData.name });
            console.log("Perfil do usuário atualizado com sucesso");
        } catch (profileError) {
            console.error("Erro ao atualizar perfil:", profileError);
        }

        showSuccess('Cadastro realizado com sucesso!');
        localStorage.setItem('userId', userCredential.user.uid);
        localStorage.setItem('userEmail', userData.email);

        // ADICIONADO: Marcar checkout bem-sucedido
        localStorage.setItem('successfulCheckout', 'true');

        // ADICIONADO: Definir tempo de expiração (48 horas)
        const expiryTime = new Date();
        expiryTime.setHours(expiryTime.getHours() + 48);
        localStorage.setItem('checkoutExpiry', expiryTime.toISOString());

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
                    errorMessage = 'Operação não permitida';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'A senha deve ter pelo menos 6 caracteres';
                    break;
                default:
                    errorMessage = `Erro ao finalizar cadastro: ${error.message}`;
            }
        } else {
            errorMessage = error.message;
        }

        showError(errorMessage);
    } finally {
        state.processing = false;
        hideLoading();
    }
}

// Variável para evitar múltiplas inicializações
let paymentPageInitialized = false;

// Listeners
document.addEventListener('DOMContentLoaded', async () => {
    // Evitar múltiplas inicializações
    if (paymentPageInitialized) {
        console.log("⚠️ Página de compra já foi inicializada, ignorando");
        return;
    }
    paymentPageInitialized = true;
    
    console.log("Página de compra carregada");

    // Aguardar Firebase estar pronto de forma assíncrona (sem reload)
    let auth = window.auth;
    let db = window.db;
    
    if (!auth || !db) {
        console.log('⏳ Firebase não está pronto, aguardando inicialização...');
        
        try {
            // Usar a função getFirebaseServices que já existe
            const firebaseServices = await getFirebaseServices();
            auth = firebaseServices.auth;
            db = firebaseServices.db;
            
            console.log('✅ Firebase carregado através de getFirebaseServices');
        } catch (error) {
            console.error('❌ Erro ao carregar Firebase:', error);
            
            // Tentar aguardar de forma tradicional como fallback
            let attempts = 0;
            const maxAttempts = 50; // 5 segundos máximo
            
            while ((!auth || !db) && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100));
                auth = window.auth;
                db = window.db;
                attempts++;
            }
            
            if (!auth || !db) {
                console.warn('⚠️ Firebase não carregou completamente, mas continuando com funcionalidades limitadas');
                // NÃO mostrar erro nem retornar - permitir que a página funcione parcialmente
            } else {
                console.log('✅ Firebase carregado após aguardar (fallback)');
            }
        }
    }

    console.log('🎯 Página de compra totalmente inicializada com Firebase e configurações carregadas');

    // Função para logout (expor globalmente)
    window.logout = async function() {
        try {
            if (auth && auth.signOut) {
                await auth.signOut();
                console.log('✅ Logout realizado com sucesso');
                alert('Logout realizado com sucesso!');
                window.location.href = 'index.html';
            } else {
                console.warn('⚠️ Firebase Auth não disponível para logout');
                // Mesmo assim redirecionar para a página inicial
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error('❌ Erro no logout:', error);
            alert('Erro ao fazer logout: ' + error.message);
        }
    };

    // Função para atualizar o menu baseado no status de autenticação
    function updateNavMenu(user) {
        const navRegister = document.getElementById('nav-register');
        const navLogin = document.getElementById('nav-login');
        const navDashboard = document.getElementById('nav-dashboard');
        const navLogout = document.getElementById('nav-logout');

        if (user) {
            if (navRegister) navRegister.style.display = 'none';
            if (navLogin) navLogin.style.display = 'none';
            if (navDashboard) navDashboard.style.display = 'block';
            if (navLogout) navLogout.style.display = 'block';
        } else {
            if (navRegister) navRegister.style.display = 'block';
            if (navLogin) navLogin.style.display = 'block';
            if (navDashboard) navDashboard.style.display = 'none';
            if (navLogout) navLogout.style.display = 'none';
        }
    }

    // Monitora auth (com proteção para Firebase não carregado)
    if (auth && auth.onAuthStateChanged) {
        auth.onAuthStateChanged((user) => {
            state.user = user;
            
            // Atualizar menu
            updateNavMenu(user);
            
            // Mostrar/esconder aviso de autenticação e info do usuário
            const authWarning = document.getElementById('auth-warning');
            const userInfo = document.getElementById('user-info');
            const userEmail = document.getElementById('user-email');
            
            if (user) {
                console.log('✅ Usuário autenticado:', user.uid);
                if (authWarning) authWarning.style.display = 'none';
                if (userInfo) {
                    userInfo.style.display = 'block';
                    if (userEmail) userEmail.textContent = user.email;
                }

                // Verificar se o documento existe antes de tentar atualizar (apenas se db estiver disponível)
                if (db && db.collection) {
                    db.collection('users')
                        .doc(user.uid)
                        .get()
                        .then(doc => {
                            if (doc.exists) {
                                // Só atualiza se o documento já existir
                                return db.collection('users')
                                    .doc(user.uid)
                                    .update({ last_login: firebase.firestore.FieldValue.serverTimestamp() });
                            } else {
                                console.log('Documento do usuário ainda não existe, pulando atualização');
                            }
                        })
                        .catch(error => {
                            console.warn('Erro ao verificar/atualizar último login:', error);
                        });
                }
            } else {
                console.log('ℹ️ Usuário não autenticado');
                if (authWarning) authWarning.style.display = 'block';
                if (userInfo) userInfo.style.display = 'none';
            }
        });
    } else {
        console.warn('⚠️ Firebase Auth não disponível, exibindo sempre aviso de autenticação');
        // Se o Firebase não estiver disponível, sempre mostrar o aviso de login
        const authWarning = document.getElementById('auth-warning');
        if (authWarning) authWarning.style.display = 'block';
    }

    // Botões de pagamento
    const paymentOptions = document.querySelectorAll('.payment-option');
    paymentOptions.forEach(option => {
        option.addEventListener('click', async function () {
            if (!state.processing) {
                const method = this.dataset.method;
                paymentOptions.forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
                await processPayment(method);
            }
        });
    });

    // Formulário de cadastro removido - autenticação obrigatória

    // Validação removida - não há mais formulário de cadastro na página

    // Fechar modais ao clicar fora deles
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });
});