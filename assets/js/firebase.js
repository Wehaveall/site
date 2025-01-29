// Exemplo de inicialização
const firebaseConfig = {
    // Substitua pelos dados do seu projeto Firebase
    apiKey: "CHAVE",
    authDomain: "DOMINIO.firebaseapp.com",
    databaseURL: "https://...",
    projectId: "ID",
    storageBucket: "NOME.appspot.com",
    messagingSenderId: "SENDER_ID",
    appId: "APP_ID",
    measurementId: "G-XXXX"
};

try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase inicializado com sucesso");
} catch (error) {
    console.error("Erro ao inicializar Firebase:", error);
}

const auth = firebase.auth();
const db = firebase.firestore();
