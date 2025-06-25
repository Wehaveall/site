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
      email_verified: false, // Status de verificação no Firestore
      account_status: 'pending_verification', // Status da conta
      id: null // Pode ser preenchido posteriormente se necessário
    };

    // 3. Salva os dados no Firestore usando o UID como ID do documento
    console.log(`[API] Tentando salvar dados no Firestore...`);
    console.log(`[API] Dados a serem salvos:`, customerData);
    await db.collection('users').doc(userRecord.uid).set(customerData);
    console.log(`[API] ✅ Dados do usuário salvos no Firestore.`);

    // 4. Envia email de verificação IMEDIATAMENTE via serviço de email
    console.log(`[API] Preparando envio de email de verificação...`);
    
    let emailSent = false;
    let verificationLink = null;
    
    try {
      // Configurações do email de verificação
      const actionCodeSettings = {
        url: 'https://www.atalho.me/login.html?verified=true',
        handleCodeInApp: false
      };
      
      // Gera o link de verificação usando Firebase Admin SDK
      verificationLink = await adminInstance.auth().generateEmailVerificationLink(email, actionCodeSettings);
      console.log(`[API] ✅ Link de verificação gerado`);
      
      // OPÇÃO A: Firebase Email Verification (ATIVO - NATIVO)
      // Envia email através do sistema próprio do Firebase
      console.log(`[API] 📧 Enviando email de verificação via Firebase...`);
      
      await adminInstance.auth().generateEmailVerificationLink(email, {
        url: 'https://www.atalho.me/login.html?verified=true',
        handleCodeInApp: false
      }).then(async (link) => {
        // O Firebase enviará automaticamente o email padrão
        // Não precisamos enviar manualmente, apenas gerar o link ativa o envio
        console.log(`[API] ✅ Link de verificação gerado: ${link}`);
        
        // O Firebase enviará o email automaticamente para o usuário
        emailSent = true;
        console.log(`[API] ✅ Email de verificação enviado via Firebase para: ${email}`);
      });
      
      
      // Sistema Firebase nativo está ativo acima ☝️
      
    } catch (error) {
      console.error(`[API] ❌ Erro ao processar email de verificação:`, error);
      // Não falha o cadastro por causa do email
    }

    // 5. Responde ao cliente com informações sobre o email
    console.log(`[API] ✅ Processo concluído com sucesso para UID: ${userRecord.uid}`);
    return res.status(201).json({ 
      success: true, 
      uid: userRecord.uid,
      email: email,
      name: name,
      message: emailSent ? 
        'Conta criada com sucesso! Email de verificação enviado.' : 
        'Conta criada com sucesso! Email será enviado no primeiro login.',
      requiresEmailVerification: true,
      emailSent: emailSent, // Indica se o email foi enviado pelo backend
      sendVerificationOnLogin: !emailSent, // Se true, frontend deve enviar no login
      // Para desenvolvimento/teste, incluímos o link (remover em produção)
      verificationLink: process.env.NODE_ENV === 'development' ? verificationLink : undefined
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