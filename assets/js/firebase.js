// firebase.js - configuração centralizada e segura
// Aguarda a configuração ser carregada do config.js

async function initializeFirebase() {
    try {
        // Aguarda a configuração ser carregada
        let firebaseConfig = window.FIREBASE_CONFIG;
        
        // Se não estiver disponível, aguarda um pouco mais
        if (!firebaseConfig && window.AppConfig?.getFirebaseConfig) {
            firebaseConfig = await window.AppConfig.getFirebaseConfig();
        }
        
        // Verificar se conseguiu carregar as configurações
        if (!firebaseConfig) {
            console.error('❌ ERRO CRÍTICO: Configurações Firebase não carregadas');
            throw new Error('Configurações Firebase não disponíveis. Verifique se o servidor está funcionando e as variáveis de ambiente estão configuradas.');
        }
        
        // Verificar se já foi inicializado
        if (!firebase.apps || !firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log("✅ Firebase inicializado com configuração dinâmica");
        } else {
            console.log("ℹ️ Firebase já estava inicializado");
        }
        
        return true;
    } catch (error) {
        console.error('❌ Erro ao inicializar Firebase:', error);
        return false;
    }
}

// Aguardar inicialização
let firebaseReady = false;
initializeFirebase().then(success => {
    firebaseReady = success;
    
    if (!success) {
        // Mostrar erro crítico para o usuário
        showCriticalError();
    }
}).catch(error => {
    console.error('❌ Falha crítica na inicialização:', error);
    showCriticalError();
});

// Função para mostrar erro crítico de configuração
function showCriticalError() {
    const errorHtml = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            font-family: monospace;
        ">
            <div style="
                background: #dc3545;
                padding: 2rem;
                border-radius: 8px;
                max-width: 500px;
                text-align: center;
            ">
                <h2 style="margin-bottom: 1rem;">⚠️ ERRO DE CONFIGURAÇÃO</h2>
                <p style="margin-bottom: 1rem;">
                    As configurações Firebase não puderam ser carregadas do servidor.
                </p>
                <p style="margin-bottom: 1rem; font-size: 0.9rem;">
                    Possíveis causas:<br>
                    • Variáveis de ambiente não configuradas<br>
                    • Servidor offline<br>
                    • Problema de conectividade
                </p>
                <button onclick="window.location.reload()" style="
                    background: white;
                    color: #dc3545;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: bold;
                ">
                    Tentar Novamente
                </button>
            </div>
        </div>
    `;
    
    // Adicionar ao body
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = errorHtml;
    document.body.appendChild(errorDiv);
}

// Exporta as instâncias do Firebase
const auth = firebase.auth();
const db = firebase.firestore();

// Para Firebase v8 (compat), as funções são métodos do auth
// Vamos criar referências para facilitar o uso

// Configuração específica para resolver CORS
auth.useDeviceLanguage();

// Configurar domínios autorizados programaticamente (tentativa)
try {
    // Forçar reconfiguração se necessário
    if (window.location.hostname === 'atalho.me' || window.location.hostname === 'www.atalho.me') {
        console.log('🌐 Configurando para domínio personalizado: atalho.me');
    }
} catch (error) {
    console.warn('⚠️ Aviso na configuração de domínio:', error);
}

// Expor globalmente para outros scripts
window.auth = auth;
window.db = db;

// Configurar persistência de autenticação para SESSION (apenas durante a sessão do navegador)
auth.setPersistence(firebase.auth.Auth.Persistence.SESSION)
    .then(() => {
        console.log("✅ Persistência configurada para SESSION (não mantém login após fechar navegador)");
    })
    .catch((error) => {
        console.error("❌ Erro ao configurar persistência:", error);
    });

// Configurações do Firestore com merge para evitar warnings
db.settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
    merge: true
});

// Habilita persistência offline do Firestore
db.enablePersistence()
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.log('Persistência do Firestore falhou: múltiplas abas abertas');
        } else if (err.code == 'unimplemented') {
            console.log('O navegador não suporta persistência do Firestore');
        }
    });

// Função para garantir autenticação anônima APENAS quando necessário para pagamentos
async function ensureAuthentication() {
    // Só faz autenticação anônima se não houver usuário E for necessário para pagamentos
    if (!auth.currentUser) {
        try {
            console.log("Realizando autenticação anônima para operações de pagamento...");
            await auth.signInAnonymously();
            console.log("Autenticação anônima bem-sucedida para pagamento");
        } catch (error) {
            console.error("Erro na autenticação anônima:", error);
        }
    }
}

// Função para sincronizar status de email após login
async function syncEmailVerificationStatus() {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const idToken = await user.getIdToken();
        
        // Chama a cloud function de sincronização
        const syncEmail = firebase.functions().httpsCallable('syncEmailOnLogin');
        const result = await syncEmail();
        
        console.log("✅ Sincronização de email:", result.data.message);
        return result.data;
        
    } catch (error) {
        console.error("❌ Erro na sincronização de email:", error);
        return null;
    }
}

// Monitor de mudanças de autenticação
auth.onAuthStateChanged(async (user) => {
    if (user && !user.isAnonymous) {
        console.log("👤 Usuário logado:", user.email);
        console.log("📧 Email verificado:", user.emailVerified);
        
        // Sincroniza automaticamente após login bem-sucedido
        setTimeout(async () => {
            const result = await syncEmailVerificationStatus();
            if (result && result.emailVerified) {
                console.log("✅ Email sincronizado:", result.message);
            }
        }, 1000); // Aguarda 1 segundo após o login
    }
});

// Expor para uso global (mas NÃO executar automaticamente)
window.ensureAuthentication = ensureAuthentication;
window.syncEmailVerificationStatus = syncEmailVerificationStatus;
window.registerWithAutoLanguage = registerWithAutoLanguage;
window.detectUserLanguage = detectUserLanguage;
window.setFirebaseLanguage = setFirebaseLanguage;
window.resendVerificationWithLanguage = resendVerificationWithLanguage;

console.log("🚀 Firebase configurado - Login manual ativado");

// Função para detectar idioma automaticamente
async function detectUserLanguage(email) {
    try {
        // Detectar informações do navegador
        const browserLanguage = navigator.language || navigator.userLanguage;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // Tentar detectar país pelo timezone
        let country = null;
        const timezoneCountryMap = {
            'America/Sao_Paulo': 'BR',
            'America/Argentina/Buenos_Aires': 'AR',
            'Europe/Madrid': 'ES',
            'Europe/Paris': 'FR',
            'Europe/Berlin': 'DE',
            'Europe/Rome': 'IT',
            'Europe/London': 'GB',
            'America/New_York': 'US',
            'America/Los_Angeles': 'US'
        };
        
        if (timezoneCountryMap[timezone]) {
            country = timezoneCountryMap[timezone];
        }

        // Estratégias de detecção local (fallback)
        const emailDomain = email.split('@')[1];
        const domainLanguages = {
            'gmail.com.br': 'pt-br',
            'yahoo.com.br': 'pt-br',
            'hotmail.com.br': 'pt-br',
            'outlook.com.br': 'pt-br',
            'uol.com.br': 'pt-br',
            'terra.com.br': 'pt-br',
            'gmail.es': 'es',
            'yahoo.es': 'es',
            'hotmail.es': 'es',
            'gmail.fr': 'fr',
            'yahoo.fr': 'fr',
            'hotmail.fr': 'fr',
            'gmail.de': 'de',
            'yahoo.de': 'de',
            'hotmail.de': 'de',
            'gmail.it': 'it',
            'yahoo.it': 'it',
            'hotmail.it': 'it'
        };

        const countryLanguages = {
            'BR': 'pt-br',
            'ES': 'es',
            'FR': 'fr',
            'DE': 'de',
            'IT': 'it',
            'US': 'en',
            'GB': 'en',
            'AU': 'en',
            'CA': 'en'
        };

        const browserLangMap = {
            'pt': 'pt-br',
            'pt-BR': 'pt-br',
            'pt-PT': 'pt-br',
            'es': 'es',
            'es-ES': 'es',
            'es-MX': 'es',
            'fr': 'fr',
            'fr-FR': 'fr',
            'fr-CA': 'fr',
            'en': 'en',
            'en-US': 'en',
            'en-GB': 'en',
            'de': 'de',
            'de-DE': 'de',
            'it': 'it',
            'it-IT': 'it'
        };

        // Prioridade: domínio > país > navegador > padrão
        let detectedLanguage = 'pt-br';

        if (domainLanguages[emailDomain]) {
            detectedLanguage = domainLanguages[emailDomain];
        } else if (country && countryLanguages[country]) {
            detectedLanguage = countryLanguages[country];
        } else if (browserLanguage && browserLangMap[browserLanguage]) {
            detectedLanguage = browserLangMap[browserLanguage];
        }

        console.log(`🌍 Idioma detectado: ${detectedLanguage}`, {
            email: email,
            domain: emailDomain,
            country: country,
            browser: browserLanguage,
            timezone: timezone
        });

        return detectedLanguage;

    } catch (error) {
        console.error('Erro na detecção de idioma:', error);
        return 'pt-br'; // fallback padrão
    }
}

// Função para configurar idioma do Firebase Auth antes do envio
async function setFirebaseLanguage(language) {
    try {
        // Mapear nossos códigos para códigos do Firebase
        const firebaseLanguageMap = {
            'pt-br': 'pt',
            'es': 'es',
            'fr': 'fr',
            'en': 'en',
            'de': 'de',
            'it': 'it'
        };

        const firebaseLang = firebaseLanguageMap[language] || 'pt';
        
        // Configurar idioma do Firebase Auth
        if (auth && auth.languageCode !== firebaseLang) {
            auth.languageCode = firebaseLang;
            console.log(`🔧 Firebase Auth configurado para: ${firebaseLang}`);
        }

        return firebaseLang;
    } catch (error) {
        console.error('Erro ao configurar idioma do Firebase:', error);
        return 'pt';
    }
}

// Função melhorada para registro com detecção automática
async function registerWithAutoLanguage(email, password) {
    try {
        // 1. Detectar idioma do usuário
        const detectedLanguage = await detectUserLanguage(email);
        
        // 2. Configurar Firebase para o idioma detectado
        await setFirebaseLanguage(detectedLanguage);
        
        // 3. Criar usuário (Firebase v8 compat)
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log(`✅ Usuário criado: ${user.email} (idioma: ${detectedLanguage})`);
        
        // 4. Enviar email de verificação (já no idioma correto)
        await user.sendEmailVerification({
            url: `https://atalho.me/emailHandler.html?lang=${detectedLanguage}`,
            handleCodeInApp: false
        });
        
        console.log(`📧 Email de verificação enviado em ${detectedLanguage}`);
        
        // 5. Salvar preferência de idioma no Firestore
        await saveUserLanguagePreference(user.uid, detectedLanguage);
        
        return {
            success: true,
            user: user,
            language: detectedLanguage
        };
        
    } catch (error) {
        console.error('Erro no registro:', error);
        throw error;
    }
}

// Função para salvar preferência de idioma
async function saveUserLanguagePreference(uid, language) {
    try {
        const userRef = db.collection('users').doc(uid);
        await userRef.set({
            preferred_language: language,
            language_detected_at: new Date().toISOString(),
            created_at: new Date().toISOString()
        }, { merge: true });
        
        console.log(`💾 Preferência de idioma salva: ${language}`);
    } catch (error) {
        console.error('Erro ao salvar preferência de idioma:', error);
    }
}

// Função para reenviar email com idioma específico
async function resendVerificationWithLanguage(language) {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuário não autenticado');
        
        // Configurar idioma
        await setFirebaseLanguage(language);
        
        // Reenviar
        await user.sendEmailVerification({
            url: `https://atalho.me/emailHandler.html?lang=${language}`,
            handleCodeInApp: false
        });
        
        console.log(`📧 Email reenviado em ${language}`);
        
        // Atualizar preferência
        await saveUserLanguagePreference(user.uid, language);
        
        return true;
    } catch (error) {
        console.error('Erro ao reenviar email:', error);
        throw error;
    }
}    