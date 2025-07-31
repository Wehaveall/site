// Variável para armazenar a promessa de inicialização do Firebase
let firebaseInitializationPromise = null;

// Função para buscar a configuração e inicializar o Firebase
async function initializeFirebase() {
    try {
        console.log("🔥 Buscando configuração do Firebase...");
        
        // Buscar configuração via API (única fonte agora)
        const response = await fetch('/api/firebase-config');
        if (!response.ok) {
            throw new Error(`API Firebase falhou com status ${response.status}`);
        }
        
        const firebaseConfig = await response.json();
        console.log("✅ Configuração obtida da API");

        if (!firebaseConfig?.apiKey) {
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
        
        // Firebase Functions é opcional - só carrega se disponível
        let functions = null;
        try {
            if (firebase.functions) {
                functions = firebase.app().functions('us-east1');
                console.log("✅ Firebase Functions carregado");
            } else {
                console.log("⚠️ Firebase Functions não disponível nesta página");
            }
        } catch (error) {
            console.warn("⚠️ Firebase Functions não carregou:", error.message);
        }

        // Configurações do Firebase após inicialização
        console.log("🔧 Aplicando configurações do Firebase...");
        
        // Configurar persistência de autenticação para SESSION
        try {
            await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
            console.log("✅ Persistência configurada para SESSION");
        } catch (error) {
            console.error("❌ Erro ao configurar persistência:", error);
        }

        // Configurações do Firestore (sem persistência para eliminar aviso de deprecação)
        db.settings({
            cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
            merge: true
        });
        console.log("✅ Firestore configurado (cache apenas em memória para evitar avisos de deprecação)");

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
        return Promise.reject(error instanceof Error ? error : new Error(error));
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
}

// Função para reenviar verificação com idioma
async function resendVerificationWithLanguage(language) {
    if (!window.auth?.currentUser) {
        throw new Error("Usuário não está logado");
    }

    await setFirebaseLanguage(language);
    await window.auth.currentUser.sendEmailVerification();
    
    console.log(`✅ Verificação reenviada em ${language}`);
    return true;
}

// Função para sincronizar status de email após login
async function syncEmailVerificationStatus() {
    try {
        if (!window.auth?.currentUser) {
            return null;
        }

        // Verificar se Functions está disponível
        if (!window.functions) {
            console.warn("⚠️ Firebase Functions não disponível - pulando sincronização");
            return null;
        }
        
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