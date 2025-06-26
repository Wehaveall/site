const {onCall} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {getAuth} = require("firebase-admin/auth");
const logger = require("firebase-functions/logger");
const {onDocumentUpdated} = require("firebase-functions/v2/firestore");

// Inicializar Firebase Admin
initializeApp();

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
