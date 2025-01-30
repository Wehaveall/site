// firebase.js

// Configuração do Firebase
const firebaseConfig = {
    projectId: "shortcut-6256b",
    apiKey: "AIzaSyA-vJ-HZXdstFkA1O0_O-YD5R2W2kzxS8E",
    authDomain: "shortcut-6256b.firebaseapp.com",
    storageBucket: "shortcut-6256b.appspot.com",
    messagingSenderId: "107722255662262226541",
    appId: "1:107722255662262226541:web:abc123def456"
};

try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase inicializado com sucesso");
} catch (error) {
    console.error("Erro ao inicializar Firebase:", error);
}

// Exporta as instâncias do Firebase para uso em outros arquivos
const auth = firebase.auth();
const db = firebase.firestore();

// Configurações adicionais do Firestore (opcional)
db.settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
});

// Habilita persistência offline (opcional)
db.enablePersistence()
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.log('Persistência falhou: múltiplas abas abertas');
        } else if (err.code == 'unimplemented') {
            console.log('O navegador não suporta persistência');
        }
    });