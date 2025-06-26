const {onCall} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {getAuth} = require("firebase-admin/auth");
const logger = require("firebase-functions/logger");

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
