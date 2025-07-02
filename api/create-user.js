const admin = require('firebase-admin');

// ✅ Função para sanitizar dados de entrada (CORRIGIDA: mais robusta)
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  // Usa whitelist approach - apenas caracteres alfanuméricos, espaços e alguns símbolos seguros
  return input
    .replace(/[^\w\s\-\.@áéíóúàèìòùâêîôûãõçñü]/gi, '') // Permite apenas caracteres seguros
    .trim()
    .substring(0, 255); // Limita o tamanho
}

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
  // Headers CORS mais restritivos
  res.setHeader('Access-Control-Allow-Origin', 'https://atalho.me');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
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

  // Validação de força da senha
  if (password.length < 8) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres.' });
  }

  // Verificar se a senha contém pelo menos um número e uma letra
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  if (!hasNumber || !hasLetter) {
    return res.status(400).json({ error: 'A senha deve conter pelo menos uma letra e um número.' });
  }

  // Validação de email básica
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Formato de e-mail inválido.' });
  }

  try {
    console.log(`[API] Recebida solicitação para criar usuário: ${email}`);
    console.log(`[API] Dados recebidos:`, { email, name, phone: phone || 'não informado', company: company || 'não informado', language });
    
    // 1. Cria o usuário no Firebase Authentication com email não verificado
    console.log(`[API] Tentando criar usuário no Firebase Auth...`);
    const userRecord = await adminInstance.auth().createUser({
      email: email.toLowerCase().trim(),
      password: password,
      displayName: sanitizeInput(name),
      emailVerified: false, // Força verificação de email
    });

    console.log(`[API] ✅ Usuário criado no Auth com UID: ${userRecord.uid}`);

    // 2. Prepara os dados para salvar no Firestore - ESTRUTURA CORRIGIDA
    const customerData = {
      // Dados principais (sanitizados para prevenir XSS)
      Nome: sanitizeInput(name), // Campo Nome (com N maiúsculo) para compatibilidade
      email: email.toLowerCase().trim(), // Email sempre em lowercase
      phone: sanitizeInput(phone) || null,
      country: sanitizeInput(company) || "Brasil", // Usando company como country por compatibilidade
      
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

    // 4. Tentar enviar email via Zoho usando método de fallback direto
    console.log(`[API] 📧 Enviando email de verificação em ${language}...`);
    
    // Templates de email por idioma
    const emailTemplates = {
      'pt-br': {
        subject: 'Atalho - Confirme seu email para ativar sua conta',
        greeting: 'Olá!',
        intro: `Você se cadastrou no <strong>Atalho</strong> com o email: <strong>${email}</strong>`,
        instruction: 'Para ativar sua conta e começar a usar nossos recursos de automação, confirme seu email clicando no botão abaixo:',
        buttonText: '✅ Confirmar Email',
        fallbackText: 'Se o botão não funcionar, copie e cole este link no seu navegador:',
        expiryText: '⚠️ Este link expira em 24 horas por segurança.',
        footer: '<strong>Atalho</strong> - Automação e Produtividade'
      },
      'en': {
        subject: 'Atalho - Confirm your email to activate your account',
        greeting: 'Hello!',
        intro: `You signed up for <strong>Atalho</strong> with the email: <strong>${email}</strong>`,
        instruction: 'To activate your account and start using our automation features, confirm your email by clicking the button below:',
        buttonText: '✅ Confirm Email',
        fallbackText: 'If the button doesn\'t work, copy and paste this link in your browser:',
        expiryText: '⚠️ This link expires in 24 hours for security.',
        footer: '<strong>Atalho</strong> - Automation and Productivity'
      },
      'es': {
        subject: 'Atalho - Confirma tu email para activar tu cuenta',
        greeting: '¡Hola!',
        intro: `Te registraste en <strong>Atalho</strong> con el email: <strong>${email}</strong>`,
        instruction: 'Para activar tu cuenta y comenzar a usar nuestras funciones de automatización, confirma tu email haciendo clic en el botón de abajo:',
        buttonText: '✅ Confirmar Email',
        fallbackText: 'Si el botón no funciona, copia y pega este enlace en tu navegador:',
        expiryText: '⚠️ Este enlace expira en 24 horas por seguridad.',
        footer: '<strong>Atalho</strong> - Automatización y Productividad'
      },
      'fr': {
        subject: 'Atalho - Confirmez votre email pour activer votre compte',
        greeting: 'Bonjour !',
        intro: `Vous vous êtes inscrit sur <strong>Atalho</strong> avec l'email : <strong>${email}</strong>`,
        instruction: 'Pour activer votre compte et commencer à utiliser nos fonctionnalités d\'automatisation, confirmez votre email en cliquant sur le bouton ci-dessous :',
        buttonText: '✅ Confirmer Email',
        fallbackText: 'Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :',
        expiryText: '⚠️ Ce lien expire dans 24 heures pour des raisons de sécurité.',
        footer: '<strong>Atalho</strong> - Automatisation et Productivité'
      },
      'de': {
        subject: 'Atalho - Bestätigen Sie Ihre E-Mail, um Ihr Konto zu aktivieren',
        greeting: 'Hallo!',
        intro: `Sie haben sich bei <strong>Atalho</strong> mit der E-Mail registriert: <strong>${email}</strong>`,
        instruction: 'Um Ihr Konto zu aktivieren und unsere Automatisierungsfunktionen zu nutzen, bestätigen Sie Ihre E-Mail, indem Sie auf die Schaltfläche unten klicken:',
        buttonText: '✅ E-Mail Bestätigen',
        fallbackText: 'Wenn die Schaltfläche nicht funktioniert, kopieren Sie diesen Link und fügen Sie ihn in Ihren Browser ein:',
        expiryText: '⚠️ Dieser Link läuft aus Sicherheitsgründen in 24 Stunden ab.',
        footer: '<strong>Atalho</strong> - Automatisierung und Produktivität'
      },
      'it': {
        subject: 'Atalho - Conferma la tua email per attivare il tuo account',
        greeting: 'Ciao!',
        intro: `Ti sei registrato su <strong>Atalho</strong> con l'email: <strong>${email}</strong>`,
        instruction: 'Per attivare il tuo account e iniziare a utilizzare le nostre funzionalità di automazione, conferma la tua email cliccando il pulsante qui sotto:',
        buttonText: '✅ Conferma Email',
        fallbackText: 'Se il pulsante non funziona, copia e incolla questo link nel tuo browser:',
        expiryText: '⚠️ Questo link scade in 24 ore per sicurezza.',
        footer: '<strong>Atalho</strong> - Automazione e Produttività'
      }
    };

    // Usar o template do idioma solicitado ou fallback para pt-br
    const template = emailTemplates[language] || emailTemplates['pt-br'];
    
    try {
      // Por enquanto, usar método de fallback que sabemos que funciona
      const verificationLink = await adminInstance.auth().generateEmailVerificationLink(email, {
          url: `https://atalho.me/emailHandler.html?lang=${language}`,
      });
      
      await db.collection('mail').add({
          to: [email],
          message: {
              subject: template.subject,
              html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
                    <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                      <div style="text-align: center; margin-bottom: 30px;">
                        <img src="https://atalho.me/assets/img/Atalho.png" alt="Logo Atalho" style="width: 80px; height: 80px; object-fit: contain; margin-bottom: 10px;">
                        <h1 style="color: #dbc9ad; margin: 0;">Atalho</h1>
                        <p style="color: #666; margin: 5px 0 0 0;">Automação e Produtividade</p>
                      </div>
                      
                      <h2 style="color: #333; text-align: center;">${template.buttonText}</h2>
                      
                      <p style="color: #555; line-height: 1.6;">
                        ${template.greeting} ${template.intro}
                      </p>
                      
                      <p style="color: #555; line-height: 1.6;">
                        ${template.instruction}
                      </p>
                      
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationLink}" 
                           style="background: linear-gradient(135deg, #dbc9ad 0%, #c8b298 100%); 
                                  color: #333; 
                                  padding: 15px 30px; 
                                  text-decoration: none; 
                                  border-radius: 8px; 
                                  font-weight: bold; 
                                  font-size: 16px;
                                  display: inline-block;">
                          ${template.buttonText}
                        </a>
                      </div>
                      
                      <p style="color: #888; font-size: 14px; line-height: 1.5;">
                        ${template.fallbackText}<br>
                        <a href="${verificationLink}" style="color: #dbc9ad; word-break: break-all;">${verificationLink}</a>
                      </p>
                      
                      <p style="color: #888; font-size: 14px; line-height: 1.5; margin-top: 20px;">
                        ${template.expiryText}
                      </p>
                      
                      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                      
                      <div style="text-align: center;">
                        <p style="color: #666; font-size: 14px; margin: 0;">
                          ${template.footer}<br>
                          📧 contact@atalho.me | 🌐 https://atalho.me
                        </p>
                      </div>
                    </div>
                  </div>
              `,
          },
      });
      console.log(`[API] ✅ Email de verificação enviado via extensão em ${language}.`);
    } catch (error) {
      console.error(`[API] ❌ Erro ao enviar email:`, error);
      console.log(`[API] 🔄 Usando método de fallback simples...`);
      
      // Fallback em caso de erro
      const verificationLink = await adminInstance.auth().generateEmailVerificationLink(email, {
          url: `https://atalho.me/emailHandler.html?lang=${language}`,
      });
      
      await db.collection('mail').add({
          to: [email],
          message: {
              subject: template.subject,
              html: `${template.greeting} Email de verificação do Atalho - Por favor, clique no link: ${verificationLink}`,
          },
      });
      console.log(`[API] ✅ Email de fallback simples enviado em ${language}.`);
    }

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