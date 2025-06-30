// auth-manager.js - Sistema Global de Gerenciamento de Autenticação
class AuthManager {
    constructor() {
        this.initialized = false;
        this.currentUser = null;
        this.authStateListeners = [];
        this.onAuthStateChangedCallback = null;
        console.log('🔐 AuthManager inicializado');
    }

    // Inicializar o gerenciador de autenticação
    async initialize() {
        if (this.initialized) {
            return;
        }

        try {
            // Aguardar Firebase estar pronto
            await this.waitForFirebase();

            // Configurar persistência PERMANENTE
            try {
                await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
                console.log('✅ Persistência de autenticação configurada para LOCAL (permanente)');
            } catch (error) {
                console.warn('⚠️ Erro ao configurar persistência:', error);
            }

            // Configurar listener de mudanças de autenticação
            firebase.auth().onAuthStateChanged((user) => {
                this.handleAuthStateChange(user);
            });

            this.initialized = true;
            console.log('✅ AuthManager inicializado com sucesso');

        } catch (error) {
            console.error('❌ Erro ao inicializar AuthManager:', error);
        }
    }

    // Aguardar Firebase estar disponível
    async waitForFirebase() {
        let attempts = 0;
        while (typeof firebase === 'undefined' && attempts < 100) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (typeof firebase === 'undefined') {
            throw new Error('Firebase não pôde ser carregado');
        }

        // Aguardar serviços do Firebase estarem prontos
        attempts = 0;
        while ((!firebase.auth || !firebase.firestore) && attempts < 100) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
    }

    // Tratar mudanças no estado de autenticação
    handleAuthStateChange(user) {
        this.currentUser = user;
        
        if (user) {
            console.log('✅ Usuário autenticado:', user.email);
            this.updateUserInterface(user);
        } else {
            console.log('ℹ️ Usuário deslogado');
            this.updateUserInterface(null);
        }

        // Notificar listeners
        this.authStateListeners.forEach(callback => {
            try {
                callback(user);
            } catch (error) {
                console.error('❌ Erro em listener de auth state:', error);
            }
        });

        // Callback personalizado se definido
        if (this.onAuthStateChangedCallback) {
            this.onAuthStateChangedCallback(user);
        }
    }

    // Atualizar interface do usuário
    updateUserInterface(user) {
        // Atualizar navegação
        this.updateNavigation(user);
        
        // Atualizar info do usuário se existir elemento
        this.updateUserInfo(user);
        
        // Atualizar avisos de autenticação
        this.updateAuthWarnings(user);
    }

    // Atualizar elementos de navegação
    updateNavigation(user) {
        const navRegister = document.getElementById('nav-register');
        const navLogin = document.getElementById('nav-login');
        const navDashboard = document.getElementById('nav-dashboard');
        const navLogout = document.getElementById('nav-logout');
        const navUserName = document.getElementById('nav-user-name');

        if (user) {
            // Usuário logado
            if (navRegister) navRegister.style.display = 'none';
            if (navLogin) navLogin.style.display = 'none';
            if (navDashboard) navDashboard.style.display = 'block';
            if (navLogout) navLogout.style.display = 'block';
            
            // Mostrar nome do usuário se elemento existir
            if (navUserName) {
                navUserName.style.display = 'block';
                let userName = user.displayName;
                
                // Se não tem displayName, tentar buscar do Firestore ou usar email
                if (!userName) {
                    // Usar primeira parte do email como fallback
                    userName = user.email.split('@')[0];
                    
                    // Capitalizar primeira letra
                    userName = userName.charAt(0).toUpperCase() + userName.slice(1);
                }
                
                navUserName.innerHTML = `<span class="user-greeting">Olá, <strong>${userName}</strong></span>`;
            }
        } else {
            // Usuário deslogado
            if (navRegister) navRegister.style.display = 'block';
            if (navLogin) navLogin.style.display = 'block';
            if (navDashboard) navDashboard.style.display = 'none';
            if (navLogout) navLogout.style.display = 'none';
            if (navUserName) navUserName.style.display = 'none';
        }
    }

    // Atualizar informações do usuário
    updateUserInfo(user) {
        const userInfoElement = document.getElementById('user-info');
        const userEmailElement = document.getElementById('user-email');

        if (userInfoElement && userEmailElement) {
            if (user) {
                userInfoElement.style.display = 'block';
                userEmailElement.textContent = user.email;
            } else {
                userInfoElement.style.display = 'none';
            }
        }
    }

    // Atualizar avisos de autenticação
    updateAuthWarnings(user) {
        const authWarning = document.getElementById('auth-warning');
        
        if (authWarning) {
            if (user) {
                authWarning.style.display = 'none';
            } else {
                authWarning.style.display = 'block';
            }
        }
    }

    // Verificar se usuário está logado
    isAuthenticated() {
        return !!this.currentUser;
    }

    // Obter usuário atual
    getCurrentUser() {
        return this.currentUser;
    }

    // Realizar logout
    async logout() {
        try {
            await firebase.auth().signOut();
            console.log('✅ Logout realizado com sucesso');
            
            // Mostrar mensagem de confirmação
            const message = window.i18nSystem?.t('auth.logoutSuccess') || 'Logout realizado com sucesso!';
            this.showMessage(message, 'success');
            
            // Redirecionar para página inicial após um tempo
            setTimeout(() => {
                if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
                    window.location.href = 'index.html';
                }
            }, 1500);

        } catch (error) {
            console.error('❌ Erro no logout:', error);
            const errorMsg = (window.i18nSystem?.t('common.error') || 'Erro') + ': ' + error.message;
            this.showMessage(errorMsg, 'error');
        }
    }

    // Adicionar listener para mudanças de autenticação
    addAuthStateListener(callback) {
        this.authStateListeners.push(callback);
        
        // Se já há usuário logado, chamar imediatamente
        if (this.currentUser) {
            callback(this.currentUser);
        }
    }

    // Remover listener
    removeAuthStateListener(callback) {
        const index = this.authStateListeners.indexOf(callback);
        if (index > -1) {
            this.authStateListeners.splice(index, 1);
        }
    }

    // Definir callback personalizado para mudanças de auth state
    setOnAuthStateChanged(callback) {
        this.onAuthStateChangedCallback = callback;
    }

    // Mostrar mensagem para o usuário
    showMessage(message, type = 'info') {
        // Se existe um sistema de notificação, usar
        if (window.showNotification) {
            window.showNotification(message, type);
            return;
        }

        // Criar notificação visual melhorada
        this.createToastNotification(message, type);
    }

    // Criar notificação toast
    createToastNotification(message, type = 'info') {
        // Remove notificação anterior se existir
        const existingToast = document.getElementById('auth-toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.id = 'auth-toast';
        
        const colors = {
            success: { bg: '#d4edda', border: '#c3e6cb', text: '#155724', icon: '✅' },
            error: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24', icon: '❌' },
            info: { bg: '#d1ecf1', border: '#bee5eb', text: '#0c5460', icon: 'ℹ️' }
        };
        
        const color = colors[type] || colors.info;
        
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${color.bg};
            border: 2px solid ${color.border};
            color: ${color.text};
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 0.9rem;
            max-width: 400px;
            animation: slideInToast 0.3s ease-out;
        `;
        
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-size: 1.2rem;">${color.icon}</span>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; color: ${color.text}; cursor: pointer; font-size: 1.2rem; margin-left: auto; padding: 0;">
                    ×
                </button>
            </div>
        `;

        // Adicionar estilo de animação se não existir
        if (!document.getElementById('toast-styles')) {
            const style = document.createElement('style');
            style.id = 'toast-styles';
            style.textContent = `
                @keyframes slideInToast {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(toast);

        // Auto-remover após 5 segundos
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideInToast 0.3s ease-out reverse';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }

    // Aguardar autenticação estar pronta
    async waitForAuth() {
        if (!this.initialized) {
            await this.initialize();
        }

        // Aguardar estado inicial de autenticação ser resolvido
        return new Promise((resolve) => {
            if (firebase.auth().currentUser !== undefined) {
                resolve(this.currentUser);
            } else {
                const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
                    unsubscribe();
                    resolve(user);
                });
            }
        });
    }

    // Verificar se precisa fazer login para continuar
    requireAuth(redirectTo = 'login.html') {
        if (!this.isAuthenticated()) {
            const currentPage = window.location.pathname;
            const loginUrl = redirectTo + '?redirect=' + encodeURIComponent(currentPage);
            window.location.href = loginUrl;
            return false;
        }
        return true;
    }

    // Obter informações do perfil do usuário
    async getUserProfile() {
        if (!this.currentUser) {
            return null;
        }

        try {
            // Tentar buscar dados do Firestore
            if (firebase.firestore) {
                const userDoc = await firebase.firestore()
                    .collection('users')
                    .doc(this.currentUser.uid)
                    .get();

                if (userDoc.exists) {
                    return {
                        uid: this.currentUser.uid,
                        email: this.currentUser.email,
                        emailVerified: this.currentUser.emailVerified,
                        displayName: this.currentUser.displayName,
                        ...userDoc.data()
                    };
                }
            }

            // Fallback para dados básicos do Firebase Auth
            return {
                uid: this.currentUser.uid,
                email: this.currentUser.email,
                emailVerified: this.currentUser.emailVerified,
                displayName: this.currentUser.displayName
            };

        } catch (error) {
            console.error('❌ Erro ao obter perfil do usuário:', error);
            return {
                uid: this.currentUser.uid,
                email: this.currentUser.email,
                emailVerified: this.currentUser.emailVerified,
                displayName: this.currentUser.displayName
            };
        }
    }
}

// Criar instância global
const authManager = new AuthManager();

// Inicializar automaticamente quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Aguardar um pouco para garantir que Firebase foi carregado
    setTimeout(() => {
        authManager.initialize();
    }, 500);
});

// Também tentar inicializar quando Firebase for detectado
function tryInitializeAuth() {
    if (typeof firebase !== 'undefined' && firebase.auth && !authManager.initialized) {
        authManager.initialize();
    }
}

// Tentar inicializar periodicamente até ter sucesso
const initInterval = setInterval(() => {
    if (authManager.initialized) {
        clearInterval(initInterval);
    } else {
        tryInitializeAuth();
    }
}, 1000);

// Limpar intervalo após 30 segundos para não rodar infinitamente
setTimeout(() => {
    clearInterval(initInterval);
}, 30000);

// Expor globalmente
window.authManager = authManager;

// Função global de logout (para compatibilidade)
window.logout = () => authManager.logout();

// Função para verificar autenticação (para compatibilidade)
window.checkAuth = () => authManager.isAuthenticated();

console.log('📦 AuthManager carregado - Sistema de autenticação global ativo'); 