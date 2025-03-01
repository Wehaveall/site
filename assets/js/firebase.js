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

// Configurações adicionais (mantidas como estavam)
db.settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
});

// Habilita persistência offline (mantido como estava)
db.enablePersistence()
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.log('Persistência falhou: múltiplas abas abertas');
        } else if (err.code == 'unimplemented') {
            console.log('O navegador não suporta persistência');
        }
    });