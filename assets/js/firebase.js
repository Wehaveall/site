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

// Configurar persistência de autenticação para SESSION (apenas durante a sessão do navegador)
auth.setPersistence(firebase.auth.Auth.Persistence.SESSION)
    .then(() => {
        console.log("✅ Persistência configurada para SESSION (não mantém login após fechar navegador)");
    })
    .catch((error) => {
        console.error("❌ Erro ao configurar persistência:", error);
    });

// Configurações do Firestore
db.settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
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

// Expor para uso global (mas NÃO executar automaticamente)
window.ensureAuthentication = ensureAuthentication;

console.log("🚀 Firebase configurado - Login manual ativado");    