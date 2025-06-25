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
    console.log(`[API] Dados recebidos:`, { email, name, phone: phone || 'não informado', company: company || 'não informado' });
    
    // 1. Cria o usuário no Firebase Authentication com email não verificado
    console.log(`[API] Tentando criar usuário no Firebase Auth...`);
    const userRecord = await adminInstance.auth().createUser({
      email: email,
      password: password,
      displayName: name,
      emailVerified: false, // Força verificação de email
    });

    console.log(`[API] ✅ Usuário criado no Auth com UID: ${userRecord.uid}`);

    // 2. Prepara os dados para salvar no Firestore - ESTRUTURA CORRIGIDA
    const customerData = {
      // Dados principais
      Nome: name, // Campo Nome (com N maiúsculo) para compatibilidade
      email: email,
      phone: phone || null,
      country: company || "Brasil", // Usando company como country por compatibilidade
      
      // Dados do usuário Firebase
      user: {
        uid: userRecord.uid,
        email: email,
        displayName: name
      },
      
      // Status da conta
      terms_accepted: true,
      terms_accepted_at: new Date().toISOString(),
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      email_verified: false,
      account_status: 'pending_verification',
      
      // Dados de licença
      license_active: false,
      license_type: null,
      payment_status: 'pending',
      pay_method: null,
      sub_start: null,
      sub_end: null,
      last_payment_date: null,
      active_machines: 0,
      
      // ID para referência
      id: userRecord.uid
    };

    // 3. Salva os dados no Firestore usando o UID como ID do documento
    console.log(`[API] Tentando salvar dados no Firestore...`);
    console.log(`[API] Dados a serem salvos:`, customerData);
    await db.collection('users').doc(userRecord.uid).set(customerData);
    console.log(`[API] ✅ Dados do usuário salvos no Firestore.`);

    // 4. Chamar Cloud Function para enviar email de verificação
    let emailSent = false;
    let cloudFunctionResult = null;
    let emailError = null;
    
    try {
      const cloudFunctionUrl = 'https://us-central1-shortcut-6256b.cloudfunctions.net/sendVerificationEmailOnSignup';
      
      console.log(`[API] 📧 Chamando Cloud Function para envio de email...`);
      console.log(`[API] 🔗 URL da Cloud Function: ${cloudFunctionUrl}`);
      console.log(`[API] 📨 Dados enviados:`, { uid: userRecord.uid, email: email });
      
      const response = await fetch(cloudFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uid: userRecord.uid,
          email: email
        })
      });

      console.log(`[API] 📡 Status da resposta Cloud Function: ${response.status}`);
      console.log(`[API] 📡 Status text: ${response.statusText}`);
      
      const result = await response.json();
      cloudFunctionResult = result;
      
      console.log(`[API] 📧 Resposta completa da Cloud Function:`, JSON.stringify(result, null, 2));
      
      if (response.ok) {
        console.log('✅ [API] Email de verificação enviado via Cloud Function com sucesso!');
        emailSent = true;
        
        // Se estiver em desenvolvimento, mostrar o link
        if (result.verificationLink) {
          console.log('🔗 [API] Link de verificação (DEV):', result.verificationLink);
        }
      } else {
        console.error('❌ [API] Erro ao enviar email via Cloud Function:', result);
        emailError = result.error || 'Erro desconhecido na Cloud Function';
      }
      
    } catch (fetchError) {
      console.error('❌ [API] Erro ao chamar Cloud Function:', fetchError);
      console.error('❌ [API] Stack trace:', fetchError.stack);
      emailError = fetchError.message;
      // Não falha o cadastro se o email não for enviado
    }

    // 5. Responde ao cliente com sucesso com informações detalhadas
    console.log(`[API] ✅ Processo concluído com sucesso para UID: ${userRecord.uid}`);
    console.log(`[API] 📧 Status final do email: ${emailSent ? 'ENVIADO' : 'FALHOU'}`);
    
    return res.status(201).json({ 
      success: true, 
      uid: userRecord.uid,
      email: email,
      name: name,
      message: emailSent ? 
        'Conta criada com sucesso! Email de verificação enviado.' : 
        'Conta criada com sucesso! Erro ao enviar email de verificação.',
      requiresEmailVerification: true,
      // Informações detalhadas sobre o processo de email
      emailSent: emailSent,
      cloudFunctionCalled: true,
      cloudFunctionResult: cloudFunctionResult,
      emailError: emailError,
      // Debug info
      debug: {
        timestamp: new Date().toISOString(),
        userCreated: true,
        firestoreDocumentCreated: true,
        cloudFunctionUrl: 'https://us-central1-shortcut-6256b.cloudfunctions.net/sendVerificationEmailOnSignup'
      }
    });

  } catch (error) {
    console.error('[API] ❌ Erro ao criar usuário:', error);
    console.error('[API] ❌ Código do erro:', error.code);
    console.error('[API] ❌ Mensagem do erro:', error.message);
    
    // Traduz os erros do Firebase para mensagens amigáveis
    let friendlyMessage = 'Ocorreu um erro inesperado ao criar sua conta.';
    if (error.code === 'auth/email-already-exists') {
      friendlyMessage = 'Este e-mail já está cadastrado. Tente fazer login ou redefinir sua senha.';
    } else if (error.code === 'auth/invalid-password') {
      friendlyMessage = 'Senha inválida. A senha precisa ter no mínimo 6 caracteres.';
    } else if (error.code === 'auth/invalid-email') {
      friendlyMessage = 'Email inválido. Verifique o formato do email.';
    } else if (error.code === 'auth/weak-password') {
      friendlyMessage = 'Senha muito fraca. Use uma senha mais forte.';
    }
    
    return res.status(500).json({ error: friendlyMessage });
  }
} 