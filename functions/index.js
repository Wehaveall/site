const {onCall} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {getAuth} = require("firebase-admin/auth");
const logger = require("firebase-functions/logger");
const {onDocumentUpdated} = require("firebase-functions/v2/firestore");
const {onRequest} = require("firebase-functions/v2/https");
const functions = require("firebase-functions");
const nodemailer = require("nodemailer");

// Inicializar Firebase Admin
initializeApp();

// Configurar transporter do Zoho SMTP
const createZohoTransporter = () => {
  return nodemailer.createTransporter({
    host: "smtp.zoho.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: "contact@atalho.me",
      pass: functions.config().zoho.email_password,
    },
  });
};

/**
 * Função para sincronizar login do usuário
 */
exports.syncEmailOnLogin = onCall({region: "us-east1"}, async (request) => {
  try {
    const {uid} = request.auth;
    if (!uid) throw new Error("Usuário não autenticado");

    logger.info(`Sincronizando login para UID: ${uid}`);
    const db = getFirestore();
    const userDocRef = db.collection("users").doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      await userDocRef.set({
        uid: uid,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
      });
      logger.info(`Criado documento para UID: ${uid}`);
    } else {
      await userDocRef.update({
        last_login: new Date().toISOString(),
      });
    }

    logger.info(`Login atualizado para ${uid}`);
    return {success: true, message: "Login atualizado com sucesso"};
  } catch (error) {
    logger.error("Erro na sincronização de login:", error);
    throw new Error("Erro interno na sincronização de login");
  }
});

/**
 * Função para detectar idioma do usuário
 */
exports.detectUserLanguage = onCall({region: "us-east1"}, async (request) => {
  try {
    const {email, browserLanguage, country} = request.data;

    // 1. Por domínio do email
    const emailDomain = email.split("@")[1];
    const domainLanguages = {
      "gmail.com.br": "pt-br",
      "yahoo.com.br": "pt-br",
      "hotmail.com.br": "pt-br",
      "outlook.com.br": "pt-br",
      "uol.com.br": "pt-br",
      "terra.com.br": "pt-br",
      "gmail.es": "es",
      "yahoo.es": "es",
      "hotmail.es": "es",
      "gmail.fr": "fr",
      "yahoo.fr": "fr",
      "hotmail.fr": "fr",
      "gmail.de": "de",
      "yahoo.de": "de",
      "hotmail.de": "de",
      "gmail.it": "it",
      "yahoo.it": "it",
      "hotmail.it": "it",
    };

    // 2. Por país/região
    const countryLanguages = {
      "BR": "pt-br",
      "ES": "es",
      "FR": "fr",
      "DE": "de",
      "IT": "it",
      "US": "en",
      "GB": "en",
      "AU": "en",
      "CA": "en",
    };

    // 3. Por idioma do navegador
    const browserLangMap = {
      "pt": "pt-br",
      "pt-BR": "pt-br",
      "pt-PT": "pt-br",
      "es": "es",
      "es-ES": "es",
      "es-MX": "es",
      "fr": "fr",
      "fr-FR": "fr",
      "fr-CA": "fr",
      "en": "en",
      "en-US": "en",
      "en-GB": "en",
      "de": "de",
      "de-DE": "de",
      "it": "it",
      "it-IT": "it",
    };

    // Prioridade: domínio > país > navegador > padrão
    let detectedLanguage = "pt-br"; // padrão

    if (domainLanguages[emailDomain]) {
      detectedLanguage = domainLanguages[emailDomain];
    } else if (country && countryLanguages[country]) {
      detectedLanguage = countryLanguages[country];
    } else if (browserLanguage && browserLangMap[browserLanguage]) {
      detectedLanguage = browserLangMap[browserLanguage];
    }

    logger.info(`Idioma detectado: ${detectedLanguage} para ${email}`);

    return {
      detectedLanguage,
      reasons: {
        emailDomain: domainLanguages[emailDomain] || null,
        country: countryLanguages[country] || null,
        browser: browserLangMap[browserLanguage] || null,
      },
    };
  } catch (error) {
    logger.error("Erro ao detectar idioma:", error);
    return {detectedLanguage: "pt-br"};
  }
});

/**
 * Função para enviar email de verificação localizado
 */
exports.sendLocalizedEmailVerification = onCall({
  region: "us-east1",
}, async (request) => {
  try {
    const {language = "pt-br", continueUrl} = request.data;
    const uid = request.auth.uid;

    if (!uid) throw new Error("Usuário não autenticado");

    const auth = getAuth();
    const userRecord = await auth.getUser(uid);

    // Configurações por idioma
    const actionCodeSettings = {
      url: continueUrl || `https://atalho.me/emailHandler.html?lang=${language}`,
      handleCodeInApp: false,
    };

    // Gerar link de verificação
    const verificationLink = await auth.generateEmailVerificationLink(
        userRecord.email,
        actionCodeSettings,
    );

    logger.info(`Link gerado para ${userRecord.email} em ${language}`);

    return {
      success: true,
      language,
      verificationLink,
      email: userRecord.email,
    };
  } catch (error) {
    logger.error("Erro ao enviar email localizado:", error);
    throw new Error("Erro interno");
  }
});

/**
 * SINCRONIZAÇÃO AUTOMÁTICA: Monitora mudanças no documento do usuário
 * Gatilho: Quando um documento de usuário é atualizado no Firestore
 * Funciona com v2 - monitora mudanças no campo email_verified
 */
exports.syncEmailVerificationStatus = onDocumentUpdated({
  document: "users/{userId}",
  region: "us-east1",
}, async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  const userId = event.params.userId;

  // Só executa se email_verified mudou de false para true
  if (before.email_verified === false && after.email_verified === true) {
    logger.info(`[Auto Sync] Verificação de email detectada para UID: ${
      userId}`);

    try {
      const db = getFirestore();
      const userRef = db.collection("users").doc(userId);

      // Atualiza campos relacionados à verificação
      await userRef.update({
        account_status: "active",
        email_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      logger.info(`[Auto Sync] Status sincronizado para ${
        after.email || userId}: active`);
      return {success: true};
    } catch (error) {
      logger.error(`[Auto Sync] Erro ao sincronizar UID: ${userId}`, error);
      return {success: false, error: error.message};
    }
  }

  return {success: true, message: "Nenhuma sincronização necessária"};
});

/**
 * FUNÇÃO AUXILIAR: Força sincronização manual do status de verificação
 * Útil para casos onde o usuário já verificou o email mas o Firestore
 * não foi atualizado
 */
exports.forceSyncEmailVerification = onCall({
  region: "us-east1",
}, async (request) => {
  try {
    const uid = request.auth.uid;
    if (!uid) throw new Error("Usuário não autenticado");

    logger.info(`[Manual Sync] Iniciando sincronização para UID: ${uid}`);

    // Buscar dados atuais do Firebase Auth
    const auth = getAuth();
    const userRecord = await auth.getUser(uid);

    // Atualizar Firestore com dados do Auth
    const db = getFirestore();
    const userRef = db.collection("users").doc(uid);

    const updateData = {
      email_verified: userRecord.emailVerified,
      updated_at: new Date().toISOString(),
    };

    // Se email foi verificado, atualizar status
    if (userRecord.emailVerified) {
      updateData.account_status = "active";
      updateData.email_verified_at = new Date().toISOString();
    }

    await userRef.update(updateData);

    logger.info(`[Manual Sync] Sincronização concluída para ${
      userRecord.email}: ${userRecord.emailVerified ? "verified" : "pending"}`);

    return {
      success: true,
      email_verified: userRecord.emailVerified,
      account_status: userRecord.emailVerified ?
        "active" : "pending_verification",
    };
  } catch (error) {
    logger.error("[Manual Sync] Erro na sincronização:", error);
    throw new Error("Erro interno na sincronização");
  }
});

/**
 * SINCRONIZAÇÃO PÚBLICA: Usa oobCode para sincronizar sem autenticação
 * Chamada após verificação de email no emailHandler.html
 *
 * Nota: Como o Firebase Admin SDK não possui verifyActionCode,
 * vamos usar uma abordagem alternativa que busca o usuário via email
 * extraído do oobCode (que já foi verificado no frontend)
 */
exports.syncEmailVerificationPublic = onRequest({
  region: "us-east1",
  cors: true,
}, async (request, response) => {
  try {
    const {oobCode, email} = request.body;

    if (!oobCode) {
      throw new Error("oobCode é obrigatório");
    }

    logger.info(`[Public Sync] Sincronizando via oobCode: ${oobCode}`);

    const auth = getAuth();

    // Se email foi fornecido, usar diretamente
    // Se não, tentar extrair do contexto ou buscar por usuários recentes
    const targetEmail = email;
    let userRecord = null;

    if (targetEmail) {
      try {
        userRecord = await auth.getUserByEmail(targetEmail);
        logger.info(`[Public Sync] Usuário encontrado via email: ${
          userRecord.uid}`);
      } catch (error) {
        logger.error(`[Public Sync] Usuário não encontrado para email: ${
          targetEmail}`);
        throw new Error(`Usuário não encontrado para o email fornecido`);
      }
    } else {
      // Fallback: buscar usuários não verificados recentes
      // Isso é uma limitação da abordagem, mas funciona para casos simples
      throw new Error("Email é obrigatório para sincronização");
    }

    // Atualizar Firestore com dados do Auth
    const db = getFirestore();
    const userRef = db.collection("users").doc(userRecord.uid);

    // Verificar se documento existe
    const userDoc = await userRef.get();

    const updateData = {
      email_verified: userRecord.emailVerified,
      updated_at: new Date().toISOString(),
      sync_method: "public_oobcode",
      last_verification_sync: new Date().toISOString(),
    };

    // Se email foi verificado, atualizar status
    if (userRecord.emailVerified) {
      updateData.account_status = "active";
      updateData.email_verified_at = new Date().toISOString();
    }

    if (userDoc.exists) {
      // Atualizar documento existente
      await userRef.update(updateData);
      logger.info(`[Public Sync] Documento atualizado para ${
        userRecord.email}`);
    } else {
      // Criar documento se não existir
      const newUserData = {
        uid: userRecord.uid,
        email: userRecord.email,
        created_at: new Date().toISOString(),
        ...updateData,
      };

      await userRef.set(newUserData);
      logger.info(`[Public Sync] Documento criado para ${
        userRecord.email}`);
    }

    response.json({
      success: true,
      uid: userRecord.uid,
      email: userRecord.email,
      account_status: userRecord.emailVerified ?
        "active" : "pending_verification",
      email_verified: userRecord.emailVerified,
      sync_method: "public_oobcode",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[Public Sync] Erro na sincronização:", error);
    response.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Função para enviar email de verificação customizado via Zoho
 */
exports.sendCustomEmailVerification = onCall({
  region: "us-east1",
}, async (request) => {
  try {
    const {uid, language = "pt-br"} = request.data;

    if (!uid) throw new Error("UID é obrigatório");

    const auth = getAuth();
    const userRecord = await auth.getUser(uid);

    if (!userRecord.email) throw new Error("Usuário não possui email");

    // Gerar link de verificação personalizado
    const actionCodeSettings = {
      url: "https://atalho.me/emailHandler.html?verified=true",
      handleCodeInApp: false,
    };

    const verificationLink = await auth.generateEmailVerificationLink(
        userRecord.email,
        actionCodeSettings,
    );

    // Configurar email
    const transporter = createZohoTransporter();

    const emailTemplate = {
      "pt-br": {
        subject: "🚀 Atalho - Confirme seu email para ativar sua conta",
        html: `<div>Email de verificação do Atalho</div>
               <p>Clique no link: ${verificationLink}</p>`,
      },
    };

    const template = emailTemplate[language] || emailTemplate["pt-br"];

    // Enviar email
    await transporter.sendMail({
      from: "\"Atalho\" <contact@atalho.me>",
      to: userRecord.email,
      subject: template.subject,
      html: template.html,
    });

    logger.info(`Email enviado para ${userRecord.email}`);

    return {
      success: true,
      email: userRecord.email,
      message: "Email de verificação enviado com sucesso",
    };
  } catch (error) {
    logger.error("Erro ao enviar email customizado:", error);
    throw new Error("Erro interno ao enviar email de verificação");
  }
});
