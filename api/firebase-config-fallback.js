// ARQUIVO TEMPORÁRIO - Use apenas para testes locais
// Remova este arquivo após configurar as variáveis de ambiente corretamente na Vercel

module.exports = (req, res) => {
    console.log('⚠️ Usando configuração temporária do Firebase (REMOVA EM PRODUÇÃO)');
    
    // Configuração temporária para testes
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

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    console.log('🔥 Retornando configuração temporária do Firebase');
    res.status(200).json(firebaseConfig);
}; 