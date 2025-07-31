const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { onCall, onRequest } = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const nodemailer = require("nodemailer");

// Inicializar Firebase Admin
admin.initializeApp();

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

// ... (código das outras funções permanece o mesmo, omitido para brevidade) ...

/**
 * Função para sincronizar login do usuário
 */
exports.syncEmailOnLogin = onCall({ region: "us-east1" }, async (request) => {
  try {
    const { uid } = request.auth;
    if (!uid) throw new Error("Usuário não autenticado");

    logger.info(`Sincronizando login para UID: ${uid}`);
    const db = admin.firestore();
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
    return { success: true, message: "Login atualizado com sucesso" };
  } catch (error) {
    logger.error("Erro na sincronização de login:", error);
    throw new Error("Erro interno na sincronização de login");
  }
});

/**
 * Função para detectar idioma do usuário
 */
exports.detectUserLanguage = onCall({ region: "us-east1" }, async (request) => {
  try {
    const { email, browserLanguage, country } = request.data;

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
    return { detectedLanguage: "pt-br" };
  }
});

/**
 * Função para enviar email de verificação localizado
 */
exports.sendLocalizedEmailVerification = onCall({
  region: "us-east1",
}, async (request) => {
  try {
    const { language = "pt-br", continueUrl } = request.data;
    const uid = request.auth.uid;

    if (!uid) throw new Error("Usuário não autenticado");

    const auth = admin.auth();
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
    logger.info(`[Auto Sync] Verificação de email detectada para UID: ${userId}`);

    try {
      const db = admin.firestore();
      const userRef = db.collection("users").doc(userId);

      // Atualiza campos relacionados à verificação
      await userRef.update({
        account_status: "active",
        email_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      logger.info(`[Auto Sync] Status sincronizado para ${after.email || userId}: active`);
      return { success: true };
    } catch (error) {
      logger.error(`[Auto Sync] Erro ao sincronizar UID: ${userId}`, error);
      return { success: false, error: error.message };
    }
  }

  return { success: true, message: "Nenhuma sincronização necessária" };
});

/**
 * FUNÇÃO AUXILIAR: Força sincronização manual do status de verificação
 */
exports.forceSyncEmailVerification = onCall({
  region: "us-east1",
}, async (request) => {
  try {
    const uid = request.auth.uid;
    if (!uid) throw new Error("Usuário não autenticado");

    logger.info(`[Manual Sync] Iniciando sincronização para UID: ${uid}`);

    // Buscar dados atuais do Firebase Auth
    const auth = admin.auth();
    const userRecord = await auth.getUser(uid);

    // Atualizar Firestore com dados do Auth
    const db = admin.firestore();
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

    logger.info(`[Manual Sync] Sincronização concluída para ${userRecord.email}: ${userRecord.emailVerified ? "verified" : "pending"}`);

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
 */
exports.syncEmailVerificationPublic = onRequest({
  region: "us-east1",
  cors: true,
}, async (request, response) => {
  try {
    const { oobCode, email } = request.body;

    if (!oobCode) {
      throw new Error("oobCode é obrigatório");
    }

    logger.info(`[Public Sync] Sincronizando via oobCode: ${oobCode}`);

    const auth = admin.auth();

    const targetEmail = email;
    let userRecord = null;

    if (targetEmail) {
      try {
        userRecord = await auth.getUserByEmail(targetEmail);
        logger.info(`[Public Sync] Usuário encontrado: ${userRecord.uid}`);
      } catch (error) {
        logger.error(`[Public Sync] Usuário não encontrado: ${targetEmail}`);
        throw new Error(`Usuário não encontrado para o email fornecido`);
      }
    } else {
      throw new Error("Email é obrigatório para sincronização");
    }

    const db = admin.firestore();
    const userRef = db.collection("users").doc(userRecord.uid);

    const userDoc = await userRef.get();

    const updateData = {
      email_verified: userRecord.emailVerified,
      updated_at: new Date().toISOString(),
      sync_method: "public_oobcode",
      last_verification_sync: new Date().toISOString(),
    };

    if (userRecord.emailVerified) {
      updateData.account_status = "active";
      updateData.email_verified_at = new Date().toISOString();
    }

    if (userDoc.exists) {
      await userRef.update(updateData);
      logger.info(`[Public Sync] Documento atualizado: ${userRecord.email}`);
    } else {
      const newUserData = {
        uid: userRecord.uid,
        email: userRecord.email,
        created_at: new Date().toISOString(),
        ...updateData,
      };

      await userRef.set(newUserData);
      logger.info(`[Public Sync] Documento criado: ${userRecord.email}`);
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
    const { uid, language = "pt-br" } = request.data;

    if (!uid) throw new Error("UID é obrigatório");

    const auth = admin.auth();
    const userRecord = await auth.getUser(uid);

    if (!userRecord.email) throw new Error("Usuário não possui email");

    const actionCodeSettings = {
      url: "https://atalho.me/emailHandler.html?verified=true",
      handleCodeInApp: false,
    };

    const verificationLink = await auth.generateEmailVerificationLink(
      userRecord.email,
      actionCodeSettings,
    );

    const transporter = createZohoTransporter();

    const emailTemplate = {
      "pt-br": {
        subject: "Atalho - Confirme seu email para ativar sua conta",
        html: `...` // Omitido para brevidade
      },
    };

    const template = emailTemplate[language] || emailTemplate["pt-br"];

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

/**
 * Função para ativar trial de 7 dias
 */
exports.activateTrial = onCall({
  region: "us-east1",
}, async (request) => {
  try {
    const { fingerprint, hardware_id, ip_address } = request.data;
    const uid = request.auth ? request.auth.uid : null;

    if (!fingerprint || !hardware_id || !ip_address) {
      throw new Error("Dados de identificação incompletos");
    }

    logger.info(`[TRIAL] Solicitação para UID: ${uid}, IP: ${ip_address}, HW: ${hardware_id.substring(0, 8)}...`);

    const db = admin.firestore();
    const currentYear = new Date().getFullYear();

    const machineFingerprint = `${ip_address}_${fingerprint}_${hardware_id}`;
    const fingerprintHash = require("crypto")
      .createHash("sha256")
      .update(machineFingerprint)
      .digest("hex");

    logger.info(`[TRIAL][TESTE] 🚧 MODO TESTE ATIVO - Permitindo trials ilimitados para desenvolvimento`);

    if (uid) {
      const userRef = db.collection("users").doc(uid);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData.license_active && userData.payment_status === "paid") {
          return {
            success: false,
            error: "ALREADY_LICENSED",
            message: "Usuário já possui licença ativa",
          };
        }
      }
    }

    const trialStart = new Date();
    const trialEnd = new Date(trialStart.getTime() + (7 * 24 * 60 * 60 * 1000));

    const trialData = {
      machine_fingerprint: fingerprintHash,
      ip_address: ip_address,
      browser_fingerprint: fingerprint,
      hardware_id: hardware_id,
      trial_start: trialStart,
      trial_end: trialEnd,
      year: currentYear,
      status: "active",
      created_at: new Date().toISOString(),
      user_uid: uid || null,
      user_email: (request.auth && request.auth.token && request.auth.token.email) ? request.auth.token.email : null,
    };

    const trialRef = await db.collection("trials").add(trialData);
    logger.info(`[TRIAL] Trial criado: ${trialRef.id}`);

    if (uid) {
      const userRef = db.collection("users").doc(uid);
      const userUpdateData = {
        trial_status: "active",
        trial_start: trialStart,
        trial_end: trialEnd,
        trial_machine_fingerprint: fingerprintHash,
        trial_id: trialRef.id,
        last_trial_year: currentYear,
        updated_at: new Date().toISOString(),
        license_active: true,
        license_type: "trial",
      };

      await userRef.set(userUpdateData, { merge: true });
      logger.info(`[TRIAL] Usuário ${uid} atualizado com dados do trial e licença.`);
    }

    logger.info(`[TRIAL] Trial ativado com sucesso: ${trialRef.id} - válido até ${trialEnd}`);

    return {
      success: true,
      trial_id: trialRef.id,
      trial_start: trialStart.toISOString(),
      trial_end: trialEnd.toISOString(),
      days_remaining: 7,
      message: "Trial de 7 dias ativado com sucesso!",
    };
  } catch (error) {
    logger.error("[TRIAL] Erro ao ativar trial:", error);
    throw new Error("Erro interno ao ativar trial");
  }
});

/**
 * Função para verificar status do trial
 */
exports.checkTrialStatus = onCall({
  region: "us-east1",
}, async (request) => {
  try {
    const { fingerprint, hardware_id, ip_address } = request.data;
    if (!fingerprint || !hardware_id || !ip_address) {
      throw new Error("Dados de identificação incompletos");
    }

    logger.info(`[TRIAL][TESTE] 🚧 checkTrialStatus em MODO TESTE - Sempre permite novos trials`);

    return {
      has_trial: false,
      can_activate: true,
      message: "🚧 MODO TESTE: Trial sempre disponível para ativação",
    };
  } catch (error) {
    logger.error("[TRIAL] Erro ao verificar status:", error);
    throw new Error("Erro interno ao verificar trial");
  }
});

/**
 * 🔄 SYNC LICENSE TYPE - Gatilho para quando o documento do usuário é atualizado
 */
exports.syncLicenseTypeOnTrialChange = onDocumentUpdated({
  document: "users/{userId}",
  region: "us-east1",
}, async (event) => {
  logger.info(`[LICENSE_SYNC] 🚀 Função iniciada para usuário: ${event.params.userId}`);

  try {
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();

    if (beforeData?.trial_status === afterData?.trial_status) {
      logger.info(`[LICENSE_SYNC] ⏭️ trial_status não mudou, ignorando...`);
      return null;
    }

    logger.info(`[LICENSE_SYNC] 🔄 Trial status changed: ${beforeData?.trial_status} -> ${afterData?.trial_status}`);

    const updateData = {};
    let needsUpdate = false;

    if (afterData?.trial_status === "active") {
      if (afterData.license_active !== true || afterData.license_type !== "trial") {
        updateData.license_active = true;
        updateData.license_type = "trial";
        needsUpdate = true;
        logger.info(`[LICENSE_SYNC] ✅ Setando license_active=true, license_type=trial`);
      }
    } else if (["expired", "inactive"].includes(afterData?.trial_status)) {
      if (afterData.license_type === "trial") {
        updateData.license_active = false;
        updateData.license_type = null;
        needsUpdate = true;
        logger.info(`[LICENSE_SYNC] ❌ Setando license_active=false, license_type=null`);
      }
    }

    if (needsUpdate) {
      logger.info(`[LICENSE_SYNC] 💾 Atualizando Firestore...`, updateData);
      await admin.firestore().collection("users").doc(event.params.userId).update(updateData);
      logger.info(`[LICENSE_SYNC] ✅ Licença atualizada para usuário ${event.params.userId}`);
    } else {
      logger.info(`[LICENSE_SYNC] ⏭️ Nenhuma atualização de licença necessária`);
    }

    logger.info(`[LICENSE_SYNC] 🎉 Função finalizada com sucesso`);
    return null;
  } catch (error) {
    logger.error(`[LICENSE_SYNC] ❌ ERRO na função:`, error);
    return null;
  }
});

/**
 * 🔧 FIX LICENSE TYPE - Função para corrigir license_type manualmente
 */
exports.fixLicenseTypeForActiveTrials = onCall({
  region: "us-east1",
}, async (request) => {
  try {
    const db = admin.firestore();
    const usersRef = db.collection("users");
    const query = usersRef.where("trial_status", "==", "active");
    const snapshot = await query.get();

    if (snapshot.empty) {
      logger.info("[FIX_LICENSE] Nenhum usuário com trial ativo encontrado.");
      return { success: true, fixed_users: 0 };
    }

    const batch = db.batch();
    let fixCount = 0;

    snapshot.docs.forEach(doc => {
      const userData = doc.data();
      if (userData.license_active !== true || userData.license_type !== "trial") {
        logger.info(`[FIX_LICENSE] Corrigindo usuário ${doc.id}`);
        batch.update(doc.ref, { license_active: true, license_type: "trial" });
        fixCount++;
      }
    });

    if (fixCount > 0) {
      await batch.commit();
      logger.info(`[FIX_LICENSE] ${fixCount} usuários corrigidos.`);
      return { success: true, fixed_users: fixCount };
    } else {
      logger.info("[FIX_LICENSE] Nenhum usuário precisou de correção.");
      return { success: true, fixed_users: 0 };
    }
  } catch (error) {
    logger.error("[FIX_LICENSE] Error:", error);
    throw new functions.https.HttpsError('internal', 'Erro ao corrigir licenças');
  }
});



exports.checkExpiredTrials = onSchedule({
  schedule: "every 24 hours",
  region: "us-east1",
}, async (event) => {
  logger.info("[TRIAL_EXPIRATION_JOB] Iniciando verificação de trials expirados.");

  const db = admin.firestore();
  const now = new Date();

  // Buscar usuários com trial ativo que já deveria ter expirado
  const query = db.collection("users")
    .where("trial_status", "==", "active")
    .where("trial_end", "<=", now);

  const snapshot = await query.get();

  if (snapshot.empty) {
    logger.info("[TRIAL_EXPIRATION_JOB] Nenhum trial expirado encontrado.");
    return null;
  }

  const updates = [];
  snapshot.forEach(doc => {
    const user = doc.data();
    logger.info(`[TRIAL_EXPIRATION_JOB] Trial expirado encontrado para o usuário: ${doc.id}`);
    
    // Atualiza o status do trial para 'expired'
    // O gatilho onDocumentUpdated (syncLicenseTypeOnTrialChange) cuidará de desativar a licença.
    const updatePromise = doc.ref.update({ trial_status: "expired" });
    updates.push(updatePromise);

    // Envia o e-mail de notificação
    if (user.email) { // Garante que o usuário tem um email
      sendTrialExpiredEmail(user);
    }
  });

  await Promise.all(updates);
  logger.info(`[TRIAL_EXPIRATION_JOB] Processados ${snapshot.size} trials expirados.`);
  return null;
});
