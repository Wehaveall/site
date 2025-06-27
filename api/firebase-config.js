module.exports = (req, res) => {
    // Estas variáveis devem ser configuradas no seu painel da Vercel
    const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    };

    // Validação para garantir que as variáveis de ambiente foram carregadas
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        console.error("Variáveis de ambiente do Firebase não estão configuradas corretamente.");
        return res.status(500).json({ 
            error: "Configuração do servidor incompleta. O administrador foi notificado." 
        });
    }

    res.status(200).json(firebaseConfig);
}; 