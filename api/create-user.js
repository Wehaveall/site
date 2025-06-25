const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

// Configurar SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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

// Função para enviar email de verificação via SendGrid
async function sendVerificationEmail(email, name, verificationLink) {
  const msg = {
    to: email,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL || 'noreply@atalho.me',
      name: 'Atalho App'
    },
    subject: '✅ Confirme seu email - Atalho App',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirme seu email - Atalho</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px 20px;">
          
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #dbc9ad; margin: 0; font-size: 28px;">🚀 Atalho</h1>
            <p style="color: #666; margin: 10px 0 0 0;">Expansão automática de texto</p>
          </div>
          
          <!-- Conteúdo Principal -->
          <div style="text-align: center; margin-bottom: 40px;">
            <div style="font-size: 48px; margin-bottom: 20px;">📧</div>
            <h2 style="color: #333; margin-bottom: 20px;">Confirme seu email</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
              Olá <strong>${name}</strong>!<br><br>
              Obrigado por se cadastrar no Atalho. Para ativar sua conta e começar a usar nossa ferramenta de expansão automática de texto, clique no botão abaixo:
            </p>
          </div>
          
          <!-- Botão de Verificação -->
          <div style="text-align: center; margin-bottom: 40px;">
            <a href="${verificationLink}" 
               style="display: inline-block; background: linear-gradient(135deg, #dbc9ad 0%, #c5b299 100%); 
                      color: #333; text-decoration: none; padding: 15px 30px; border-radius: 8px; 
                      font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              ✅ Confirmar Email
            </a>
          </div>
          
          <!-- Link alternativo -->
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <p style="color: #666; font-size: 14px; margin: 0 0 10px 0;">
              <strong>Não consegue clicar no botão?</strong> Copie e cole este link no seu navegador:
            </p>
            <p style="color: #007bff; word-break: break-all; margin: 0; font-size: 12px;">
              ${verificationLink}
            </p>
          </div>
          
          <!-- Informações importantes -->
          <div style="border-left: 4px solid #dbc9ad; padding-left: 20px; margin-bottom: 30px;">
            <h3 style="color: #333; margin: 0 0 10px 0; font-size: 16px;">⚠️ Importante:</h3>
            <ul style="color: #666; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.5;">
              <li>Este link expira em 24 horas</li>
              <li>Sua conta só funciona após a verificação</li>
              <li>Após confirmar, você pode fazer login normalmente</li>
            </ul>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
            <p style="color: #999; font-size: 12px; margin: 0 0 10px 0;">
              Este email foi enviado automaticamente. Não responda a este email.
            </p>
            <p style="color: #999; font-size: 12px; margin: 0;">
              © 2025 Atalho App. Todos os direitos reservados.
            </p>
          </div>
          
        </div>
      </body>
      </html>
    `,
    // Versão texto alternativa
    text: `
      Olá ${name}!
      
      Obrigado por se cadastrar no Atalho. Para ativar sua conta, acesse o link abaixo:
      
      ${verificationLink}
      
      Este link expira em 24 horas.
      
      Atalho App - Expansão automática de texto
    `
  };

  try {
    await sgMail.send(msg);
    console.log(`[SENDGRID] ✅ Email enviado com sucesso para: ${email}`);
    return true;
  } catch (error) {
    console.error('[SENDGRID] ❌ Erro ao enviar email:', error);
    if (error.response) {
      console.error('[SENDGRID] ❌ Resposta:', error.response.body);
    }
    return false;
  }
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
    await db.collection('users').doc(userRecord.uid).set(customerData);
    console.log(`[API] ✅ Dados do usuário salvos no Firestore.`);

    // 4. Gerar link de verificação e enviar via SendGrid
    console.log(`[API] Gerando link de verificação...`);
    
    let emailSent = false;
    let verificationLink = null;
    
    try {
      // Gerar link de verificação
      verificationLink = await adminInstance.auth().generateEmailVerificationLink(email, {
        url: 'https://www.atalho.me/login.html?verified=true',
        handleCodeInApp: false
      });
      
      console.log(`[API] ✅ Link de verificação gerado`);
      
      // Enviar email via SendGrid
      console.log(`[API] Enviando email via SendGrid...`);
      emailSent = await sendVerificationEmail(email, name, verificationLink);
      
      if (emailSent) {
        console.log(`[API] ✅ Email de verificação enviado via SendGrid para: ${email}`);
      } else {
        console.log(`[API] ❌ Falha ao enviar email via SendGrid`);
      }
      
    } catch (error) {
      console.error(`[API] ❌ Erro no processo de email:`, error);
      emailSent = false;
    }

    // 5. Resposta ao cliente
    console.log(`[API] ✅ Processo concluído para UID: ${userRecord.uid}`);
    return res.status(201).json({ 
      success: true, 
      uid: userRecord.uid,
      email: email,
      name: name,
      message: emailSent ? 
        'Conta criada com sucesso! Email de verificação enviado.' : 
        'Conta criada com sucesso! Erro no envio do email - tente fazer login.',
      requiresEmailVerification: true,
      emailSent: emailSent,
      sendEmailOnFrontend: !emailSent, // Se falhou, frontend tenta
      // Para desenvolvimento/teste
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