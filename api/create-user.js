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

  const { email, password, name, phone, company, language = 'pt-br' } = req.body;

  // Validação básica dos dados recebidos
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Dados insuficientes: E-mail, senha e nome são obrigatórios.' });
  }

  try {
    console.log(`[API] Recebida solicitação para criar usuário: ${email}`);
    console.log(`[API] Dados recebidos:`, { email, name, phone: phone || 'não informado', company: company || 'não informado', language });
    
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
      preferred_language: language,
      
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

    // 4. Gerar o link de verificação de email
    console.log(`[API] 🔗 Gerando link de verificação...`);
    const verificationLink = await adminInstance.auth().generateEmailVerificationLink(email, {
        url: 'https://atalho.me/login.html?verified=true',
    });
    console.log(`[API] ✅ Link de verificação gerado.`);

    // 5. Criar documento na coleção 'mail' para a extensão enviar o email
    console.log(`[API] 📧 Criando job de email para a extensão...`);
    await db.collection('mail').add({
        to: [email],
        message: {
            subject: '✅ Ative sua conta no Atalho!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
                  <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                      <h1 style="color: #dbc9ad; margin: 0;">🚀 Atalho</h1>
                      <p style="color: #666; margin: 5px 0 0 0;">Expansão automática de texto</p>
                    </div>
                    
                    <h2 style="color: #333; text-align: center;">✅ Verifique seu email</h2>
                    
                    <p style="color: #555; line-height: 1.6;">
                      Olá! Você criou uma conta no <strong>Atalho</strong>.
                    </p>
                    
                    <p style="color: #555; line-height: 1.6;">
                      Para ativar sua conta e começar a usar nossa ferramenta, clique no botão abaixo:
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${verificationLink}" 
                         style="background: linear-gradient(135deg, #dbc9ad 0%, #c8b298 100%); 
                                color: white; 
                                padding: 15px 30px; 
                                text-decoration: none; 
                                border-radius: 8px; 
                                font-weight: bold; 
                                font-size: 16px;
                                display: inline-block;">
                        🔗 Ativar Minha Conta
                      </a>
                    </div>
                    
                    <p style="color: #888; font-size: 14px; line-height: 1.5;">
                      Se o botão não funcionar, copie e cole este link no seu navegador:<br>
                      <a href="${verificationLink}" style="color: #dbc9ad; word-break: break-all;">${verificationLink}</a>
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    
                    <p style="color: #888; font-size: 12px; text-align: center;">
                      Se você não criou esta conta, por favor, ignore este email.
                    </p>
                  </div>
                </div>
            `,
        },
    });
    console.log(`[API] ✅ Job de email criado com sucesso na coleção 'mail'. A extensão fará o envio.`);

    // 6. Responde ao cliente com sucesso
    console.log(`[API] ✅ Processo concluído com sucesso para UID: ${userRecord.uid}`);
    return res.status(201).json({
        success: true,
        uid: userRecord.uid,
        email: email,
        name: name,
        message: 'Conta criada com sucesso! Email de verificação enviado.',
        emailSent: true,
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