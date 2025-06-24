const admin = require('firebase-admin');

export default async function handler(req, res) {
  try {
    // Tenta inicializar o Firebase Admin
    if (!admin.apps.length) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://shortcut-6256b-default-rtdb.firebaseio.com"
      });
    }

    // Testa uma operação simples
    const db = admin.firestore();
    const testDoc = await db.collection('test').doc('connection').get();
    
    return res.status(200).json({ 
      success: true, 
      message: 'Firebase Admin SDK está funcionando corretamente!',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro no teste do Firebase:', error);
    return res.status(500).json({ 
      error: 'Erro na configuração do Firebase',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
} 