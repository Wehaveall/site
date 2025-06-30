// Variável para armazenar a promessa de inicialização do Firebase
let firebaseInitializationPromise = null;

// Função para buscar a configuração e inicializar o Firebase
async function initializeFirebase() {
    try {
        console.log("🔥 Buscando configuração do Firebase...");
        
        let firebaseConfig = null;
        
        // Primeiro, tentar a API principal (segura)
        try {
            const response = await fetch('/api/firebase-config');
            if (response.ok) {
                firebaseConfig = await response.json();
                console.log("✅ Configuração obtida da API principal (segura)");
            } else {
                throw new Error(`API principal falhou: ${response.status}`);
            }
        } catch (primaryError) {
            console.warn("⚠️ API principal falhou, tentando fallback:", primaryError.message);
            
            // Fallback: tentar API temporária
            try {
                const fallbackResponse = await fetch('/api/firebase-config-fallback');
                if (fallbackResponse.ok) {
                    firebaseConfig = await fallbackResponse.json();
                    console.log("⚠️ Usando configuração de fallback (TEMPORÁRIA)");
                } else {
                    throw new Error(`Fallback também falhou: ${fallbackResponse.status}`);
                }
            } catch (fallbackError) {
                throw new Error(`Ambas as APIs falharam. Principal: ${primaryError.message}, Fallback: ${fallbackError.message}`);
            }
        }

        if (!firebaseConfig || !firebaseConfig.apiKey) {
            throw new Error("Configuração do Firebase recebida é inválida.");
        }

        if (!firebase.apps.length) {
            console.log("🚀 Inicializando Firebase...");
            firebase.initializeApp(firebaseConfig);
        } else {
            console.log("✅ Firebase já inicializado.");
        }
        
        // Retorna as instâncias dos serviços para uso
        const auth = firebase.auth();
        const db = firebase.firestore();
        const functions = firebase.functions();

        // Configurações do Firebase após inicialização
        console.log("🔧 Aplicando configurações do Firebase...");
        
        // Configurar persistência de autenticação para LOCAL (permanente)
        try {
            await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            console.log("✅ Persistência configurada para LOCAL (permanente)");
        } catch (error) {
            console.error("❌ Erro ao configurar persistência:", error);
        }

        // Configurações do Firestore
        db.settings({
            cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
            merge: true
        });

        // Habilita persistência offline do Firestore
        try {
            await db.enablePersistence();
            console.log("✅ Persistência offline do Firestore habilitada");
        } catch (err) {
            if (err.code == 'failed-precondition') {
                console.log('Persistência do Firestore falhou: múltiplas abas abertas');
            } else if (err.code == 'unimplemented') {
                console.log('O navegador não suporta persistência do Firestore');
            }
        }

        // Configurar idioma padrão
        auth.useDeviceLanguage();

        // Expor globalmente para uso em outros scripts
        window.auth = auth;
        window.db = db;
        window.functions = functions;

        // Expor funções utilitárias
        window.detectUserLanguage = detectUserLanguage;
        window.setFirebaseLanguage = setFirebaseLanguage;
        window.registerWithAutoLanguage = registerWithAutoLanguage;
        window.resendVerificationWithLanguage = resendVerificationWithLanguage;
        window.syncEmailVerificationStatus = syncEmailVerificationStatus;
        window.ensureAuthentication = ensureAuthentication;

        console.log("🚀 Firebase configurado completamente");

        return {
            auth: auth,
            db: db,
            functions: functions
        };

    } catch (error) {
        console.error("❌ Erro crítico ao inicializar o Firebase:", error);
        return Promise.reject(error);
    }
}

// Função para garantir que o Firebase seja inicializado apenas uma vez
function getFirebaseServices() {
    if (!firebaseInitializationPromise) {
        firebaseInitializationPromise = initializeFirebase();
    }
    return firebaseInitializationPromise;
}

// Função para detectar idioma automaticamente
async function detectUserLanguage(email) {
    try {
        const browserLanguage = navigator.language || navigator.userLanguage;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
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

        let detectedLanguage = 'pt-br';

        if (domainLanguages[emailDomain]) {
            detectedLanguage = domainLanguages[emailDomain];
        } else if (country && countryLanguages[country]) {
            detectedLanguage = countryLanguages[country];
        } else if (browserLanguage && browserLangMap[browserLanguage]) {
            detectedLanguage = browserLangMap[browserLanguage];
        }

        console.log(`🌍 Idioma detectado: ${detectedLanguage}`);
        return detectedLanguage;

    } catch (error) {
        console.error("❌ Erro na detecção de idioma:", error);
        return 'pt-br';
    }
}

// Função para configurar idioma do Firebase Auth
async function setFirebaseLanguage(language) {
    try {
        if (!window.auth) {
            console.warn("⚠️ Firebase Auth não está inicializado ainda");
            return;
        }

        const languageCodes = {
            'pt-br': 'pt',
            'es': 'es',
            'fr': 'fr',
            'en': 'en',
            'de': 'de',
            'it': 'it'
        };

        const firebaseLanguageCode = languageCodes[language] || 'pt';
        window.auth.languageCode = firebaseLanguageCode;
        
        console.log(`🔧 Firebase Auth configurado para: ${language} (${firebaseLanguageCode})`);
    } catch (error) {
        console.error("❌ Erro ao configurar idioma do Firebase:", error);
    }
}

// Função para registro com detecção automática de idioma
async function registerWithAutoLanguage(email, password) {
    try {
        const detectedLanguage = await detectUserLanguage(email);
        await setFirebaseLanguage(detectedLanguage);
        
        if (!window.auth) {
            throw new Error("Firebase Auth não está inicializado");
        }
        
        const userCredential = await window.auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        await user.sendEmailVerification();
        
        console.log(`✅ Usuário criado com idioma ${detectedLanguage}:`, user.uid);
        return { uid: user.uid, email: user.email, language: detectedLanguage };

    } catch (error) {
        console.error("❌ Erro no registro:", error);
        throw error;
    }
}

// Função para reenviar verificação com idioma
async function resendVerificationWithLanguage(language) {
    try {
        if (!window.auth || !window.auth.currentUser) {
            throw new Error("Usuário não está logado");
        }

        await setFirebaseLanguage(language);
        await window.auth.currentUser.sendEmailVerification();
        
        console.log(`✅ Verificação reenviada em ${language}`);
        return true;

    } catch (error) {
        console.error("❌ Erro ao reenviar verificação:", error);
        throw error;
    }
}

// Função para sincronizar status de email após login
async function syncEmailVerificationStatus() {
    try {
        if (!window.auth || !window.auth.currentUser) {
            return null;
        }

        const user = window.auth.currentUser;
        const idToken = await user.getIdToken();
        
        const syncEmail = window.functions.httpsCallable('syncEmailOnLogin');
        const result = await syncEmail();
        
        console.log("✅ Sincronização de email:", result.data.message);
        return result.data;
        
    } catch (error) {
        console.error("❌ Erro na sincronização de email:", error);
        return null;
    }
}

// Função para garantir autenticação anônima quando necessário
async function ensureAuthentication() {
    try {
        if (!window.auth) {
            throw new Error("Firebase Auth não está inicializado");
        }

        if (!window.auth.currentUser) {
            console.log("Realizando autenticação anônima para operações de pagamento...");
            await window.auth.signInAnonymously();
            console.log("Autenticação anônima bem-sucedida para pagamento");
        }
    } catch (error) {
        console.error("Erro na autenticação anônima:", error);
    }
}    