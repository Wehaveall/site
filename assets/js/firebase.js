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
        
        // A sincronização agora é automática via Auth Trigger!
        // Mantém a função manual como backup apenas
        if (user.emailVerified) {
            console.log("✅ Email já verificado - sincronização automática ativa");
        }
    }
});

// Expor para uso global (mas NÃO executar automaticamente)
window.ensureAuthentication = ensureAuthentication;
window.syncEmailVerificationStatus = syncEmailVerificationStatus;

console.log("🚀 Firebase configurado - Login manual ativado");    