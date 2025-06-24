const admin = require('firebase-admin');

// Função para inicializar o Firebase Admin SDK de forma segura
function initializeFirebaseAdmin() {
  // A Vercel armazena as variáveis de ambiente, então podemos acessá-las diretamente
  if (!admin.apps.length) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://shortcut-6256b-default-rtdb.firebaseio.com"
      });
      console.log('Firebase Admin SDK inicializado com sucesso.');
    } catch (error) {
      console.error('Falha na inicialização do Firebase Admin SDK:', error);
    }
  }
  return admin;
}

export default async function handler(req, res) {
  // Garante que só aceitamos requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Inicializa o admin
  const adminInstance = initializeFirebaseAdmin();
  const db = adminInstance.firestore();

  const { email, password, name, phone, company } = req.body;

  // Validação básica dos dados recebidos
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Dados insuficientes: E-mail, senha e nome são obrigatórios.' });
  }

  try {
    console.log(`[API] Recebida solicitação para criar usuário: ${email}`);
    
    // 1. Cria o usuário no Firebase Authentication
    const userRecord = await adminInstance.auth().createUser({
      email: email,
      password: password,
      displayName: name,
    });

    console.log(`[API] Usuário criado no Auth com UID: ${userRecord.uid}`);

    // 2. Prepara os dados para salvar no Firestore
    const customerData = {
      name,
      email,
      phone: phone || null,
      company: company || null,
      country: "Brasil",
      terms_accepted: true,
      terms_accepted_at: new Date().toISOString(),
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      license_active: false,
      license_type: null,
      payment_status: 'pending',
      pay_method: null,
      sub_start: null,
      sub_end: null,
      last_payment_date: null,
      active_machines: 0,
      id: null // Pode ser preenchido posteriormente se necessário
    };

    // 3. Salva os dados no Firestore usando o UID como ID do documento
    await db.collection('users').doc(userRecord.uid).set(customerData);
    console.log(`[API] Dados do usuário salvos no Firestore.`);

    // 4. Responde ao cliente com sucesso
    return res.status(201).json({ success: true, uid: userRecord.uid });

  } catch (error) {
    console.error('[API] Erro ao criar usuário:', error);
    
    // Traduz os erros do Firebase para mensagens amigáveis
    let friendlyMessage = 'Ocorreu um erro inesperado ao criar sua conta.';
    if (error.code === 'auth/email-already-exists') {
      friendlyMessage = 'Este e-mail já está cadastrado. Tente fazer login.';
    } else if (error.code === 'auth/invalid-password') {
      friendlyMessage = 'Senha inválida. A senha precisa ter no mínimo 6 caracteres.';
    }
    
    return res.status(500).json({ error: friendlyMessage });
  }
} 