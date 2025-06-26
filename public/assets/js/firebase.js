// firebase.js - versão corrigida
const firebaseConfig = {
    apiKey: "AIzaSyCsIbyCkHx_E5VHQXnHZYmoZSrpnuPrPUQ",
    authDomain: "shortcut-6256b.firebaseapp.com",
    databaseURL: "https://shortcut-6256b-default-rtdb.firebaseio.com",
    projectId: "shortcut-6256b",
    storageBucket: "shortcut-6256b.appspot.com",
    messagingSenderId: "526680485333",
    appId: "1:526680485333:web:a5434dd5b6da2fda9ee15c",
    measurementId: "G-PZ2EHV9YR6"
};

// Verificar se já foi inicializado
if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase inicializado com sucesso");
} else {
    console.log("Firebase já estava inicializado");
}

// Exporta as instâncias do Firebase
const auth = firebase.auth();
const db = firebase.firestore();

// Configuração específica para resolver CORS
auth.useDeviceLanguage();

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
        
        // 3. Criar usuário
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        console.log(`✅ Usuário criado: ${user.email} (idioma: ${detectedLanguage})`);
        
        // 4. Enviar email de verificação (já no idioma correto)
        await sendEmailVerification(user, {
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
        const userRef = doc(db, 'users', uid);
        await setDoc(userRef, {
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
        await sendEmailVerification(user, {
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