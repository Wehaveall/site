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

    // 2. Configurar idioma para o email
    adminInstance.auth().updateUser(userRecord.uid, {
      languageCode: language === 'pt-br' ? 'pt' : language // Firebase usa 'pt' ao invés de 'pt-br'
    });

    // 3. Gerar link de verificação com idioma e URL de continuação correta
    const continueUrl = `https://atalho.me/login.html?verified=true&lang=${language}`;
    const actionCodeSettings = {
      url: `https://atalho.me/emailHandler.html?lang=${language}&continueUrl=${encodeURIComponent(continueUrl)}`,
      handleCodeInApp: false,
    };

    // 4. Gerar link de verificação
    const verificationLink = await adminInstance.auth().generateEmailVerificationLink(
      email,
      actionCodeSettings
    );

    // 5. Enviar email customizado com o idioma correto
    try {
      // Configurar email baseado no idioma
      const emailTemplates = {
        "pt-br": {
          subject: "Atalho - Confirme seu email para ativar sua conta",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
              <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <img src="https://atalho.me/assets/img/Atalho.png" alt="Logo Atalho" style="width: 80px; height: 80px; object-fit: contain; margin-bottom: 10px;">
                  <h1 style="color: #dbc9ad; margin: 0;">Atalho</h1>
                  <p style="color: #666; margin: 5px 0 0 0;">Automação e Produtividade</p>
                </div>
                
                <h2 style="color: #333; text-align: center;">✅ Confirme seu email para ativar sua conta</h2>
                
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
                    ✅ Confirmar Email
                  </a>
                </div>
                
                <p style="color: #888; font-size: 14px; line-height: 1.5;">
                  Se o botão não funcionar, copie e cole este link no seu navegador:<br>
                  <a href="${verificationLink}" style="color: #dbc9ad; word-break: break-all;">${verificationLink}</a>
                </p>
              </div>
            </div>
          `
        },
        "en": {
          subject: "Atalho - Confirm your email to activate your account",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
              <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <img src="https://atalho.me/assets/img/Atalho.png" alt="Atalho Logo" style="width: 80px; height: 80px; object-fit: contain; margin-bottom: 10px;">
                  <h1 style="color: #dbc9ad; margin: 0;">Atalho</h1>
                  <p style="color: #666; margin: 5px 0 0 0;">Automation and Productivity</p>
                </div>
                
                <h2 style="color: #333; text-align: center;">✅ Confirm your email to activate your account</h2>
                
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
                    ✅ Confirm Email
                  </a>
                </div>
                
                <p style="color: #888; font-size: 14px; line-height: 1.5;">
                  If the button doesn't work, copy and paste this link in your browser:<br>
                  <a href="${verificationLink}" style="color: #dbc9ad; word-break: break-all;">${verificationLink}</a>
                </p>
              </div>
            </div>
          `
        },
        "es": {
          subject: "Atalho - Confirma tu correo para activar tu cuenta",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
              <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <img src="https://atalho.me/assets/img/Atalho.png" alt="Logo Atalho" style="width: 80px; height: 80px; object-fit: contain; margin-bottom: 10px;">
                  <h1 style="color: #dbc9ad; margin: 0;">Atalho</h1>
                  <p style="color: #666; margin: 5px 0 0 0;">Automatización y Productividad</p>
                </div>
                
                <h2 style="color: #333; text-align: center;">✅ Confirma tu correo para activar tu cuenta</h2>
                
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
                    ✅ Confirmar Correo
                  </a>
                </div>
                
                <p style="color: #888; font-size: 14px; line-height: 1.5;">
                  Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                  <a href="${verificationLink}" style="color: #dbc9ad; word-break: break-all;">${verificationLink}</a>
                </p>
              </div>
            </div>
          `
        },
        "fr": {
          subject: "Atalho - Confirmez votre email pour activer votre compte",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
              <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <img src="https://atalho.me/assets/img/Atalho.png" alt="Logo Atalho" style="width: 80px; height: 80px; object-fit: contain; margin-bottom: 10px;">
                  <h1 style="color: #dbc9ad; margin: 0;">Atalho</h1>
                  <p style="color: #666; margin: 5px 0 0 0;">Automatisation et Productivité</p>
                </div>
                
                <h2 style="color: #333; text-align: center;">✅ Confirmez votre email pour activer votre compte</h2>
                
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
                    ✅ Confirmer l'Email
                  </a>
                </div>
                
                <p style="color: #888; font-size: 14px; line-height: 1.5;">
                  Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur:<br>
                  <a href="${verificationLink}" style="color: #dbc9ad; word-break: break-all;">${verificationLink}</a>
                </p>
              </div>
            </div>
          `
        },
        "de": {
          subject: "Atalho - Bestätigen Sie Ihre E-Mail zur Kontoaktivierung",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
              <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <img src="https://atalho.me/assets/img/Atalho.png" alt="Logo Atalho" style="width: 80px; height: 80px; object-fit: contain; margin-bottom: 10px;">
                  <h1 style="color: #dbc9ad; margin: 0;">Atalho</h1>
                  <p style="color: #666; margin: 5px 0 0 0;">Automatisierung und Produktivität</p>
                </div>
                
                <h2 style="color: #333; text-align: center;">✅ Bestätigen Sie Ihre E-Mail zur Kontoaktivierung</h2>
                
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
                    ✅ E-Mail Bestätigen
                  </a>
                </div>
                
                <p style="color: #888; font-size: 14px; line-height: 1.5;">
                  Wenn der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:<br>
                  <a href="${verificationLink}" style="color: #dbc9ad; word-break: break-all;">${verificationLink}</a>
                </p>
              </div>
            </div>
          `
        },
        "it": {
          subject: "Atalho - Conferma la tua email per attivare il tuo account",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
              <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <img src="https://atalho.me/assets/img/Atalho.png" alt="Logo Atalho" style="width: 80px; height: 80px; object-fit: contain; margin-bottom: 10px;">
                  <h1 style="color: #dbc9ad; margin: 0;">Atalho</h1>
                  <p style="color: #666; margin: 5px 0 0 0;">Automazione e Produttività</p>
                </div>
                
                <h2 style="color: #333; text-align: center;">✅ Conferma la tua email per attivare il tuo account</h2>
                
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
                    ✅ Conferma Email
                  </a>
                </div>
                
                <p style="color: #888; font-size: 14px; line-height: 1.5;">
                  Se il pulsante non funziona, copia e incolla questo link nel tuo browser:<br>
                  <a href="${verificationLink}" style="color: #dbc9ad; word-break: break-all;">${verificationLink}</a>
                </p>
              </div>
            </div>
          `
        }
      };

      // Usar o template do idioma selecionado ou fallback para pt-br
      const template = emailTemplates[language] || emailTemplates['pt-br'];

      // Enviar email usando o template correto
      await db.collection('mail').add({
        to: [email],
        message: {
          subject: template.subject,
          html: template.html,
        },
      });

      console.log(`[API] ✅ Email de verificação enviado em ${language}`);

    } catch (error) {
      console.error(`[API] ❌ Erro ao enviar email:`, error);
      console.log(`[API] 🔄 Usando método de fallback simples...`);
      
      // Fallback em caso de erro
      const verificationLink = await adminInstance.auth().generateEmailVerificationLink(email, {
          url: 'https://atalho.me/login.html?verified=true',
      });
      
      await db.collection('mail').add({
          to: [email],
          message: {
              subject: '✅ Ative sua conta no Atalho!',
              html: `Email de verificação do Atalho - Por favor, clique no link: ${verificationLink}`,
          },
      });
      console.log(`[API] ✅ Email de fallback simples enviado.`);
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