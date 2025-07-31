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
 * CORREÇÃO: Força recarregamento dos dados do usuário do Firebase Auth
 * para garantir que o status de verificação mais recente seja obtido
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

    if (!email) {
      throw new Error("Email é obrigatório para sincronização");
    }

    logger.info(`[Public Sync] Sincronizando via oobCode: ${oobCode} para email: ${email}`);

    const auth = getAuth();
    let userRecord = null;

    try {
      // Buscar usuário pelo email
      userRecord = await auth.getUserByEmail(email);
      logger.info(`[Public Sync] Usuário encontrado: ${userRecord.uid}`);

      // CORREÇÃO: Recarregar dados do usuário para garantir status mais recente
      userRecord = await auth.getUser(userRecord.uid);
      logger.info(`[Public Sync] Dados recarregados - email_verified: ${userRecord.emailVerified}`);

    } catch (error) {
      logger.error(`[Public Sync] Usuário não encontrado: ${email}`, error);
      throw new Error(`Usuário não encontrado para o email fornecido`);
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
      logger.info(`[Public Sync] Email verificado confirmado - atualizando para ativo`);
    } else {
      logger.warn(`[Public Sync] Email ainda não verificado no Firebase Auth`);
    }

    if (userDoc.exists) {
      // Atualizar documento existente
      await userRef.update(updateData);
      logger.info(`[Public Sync] Documento atualizado: ${userRecord.email} - verified: ${userRecord.emailVerified}`);
    } else {
      // Criar documento se não existir
      const newUserData = {
        uid: userRecord.uid,
        email: userRecord.email,
        created_at: new Date().toISOString(),
        ...updateData,
      };

      await userRef.set(newUserData);
      logger.info(`[Public Sync] Documento criado: ${userRecord.email} - verified: ${userRecord.emailVerified}`);
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
 * REMOVIDO TEMPORARIAMENTE: O trigger beforeSignIn estava causando erro 503
 * Não é essencial para o funcionamento básico do sistema
 * Pode ser reimplementado no futuro se necessário
 */

/**
 * FUNÇÃO AUXILIAR: Autenticação simples de usuário
 * Restaurada para compatibilidade com sistema existente
 */
exports.authenticateUser = onRequest({
  region: "us-east1",
  cors: true,
}, async (request, response) => {
  try {
    const {token} = request.body;
    
    if (!token) {
      return response.status(400).json({
        success: false,
        error: "Token não fornecido"
      });
    }

    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);
    
    response.json({
      success: true,
      uid: decodedToken.uid,
      email: decodedToken.email,
      verified: decodedToken.email_verified
    });
    
  } catch (error) {
    logger.error("[Auth User] Erro na autenticação:", error);
    response.status(401).json({
      success: false,
      error: "Token inválido"
    });
  }
});

/**
 * FUNÇÃO AUXILIAR: Dados do usuário
 * Restaurada para compatibilidade
 */
exports.getUserData = onRequest({
  region: "us-east1",
  cors: true,
}, async (request, response) => {
  try {
    const {uid} = request.body;
    
    if (!uid) {
      return response.status(400).json({
        success: false,
        error: "UID não fornecido"
      });
    }

    const db = getFirestore();
    const userDoc = await db.collection("users").doc(uid).get();
    
    if (!userDoc.exists) {
      return response.status(404).json({
        success: false,
        error: "Usuário não encontrado"
      });
    }
    
    response.json({
      success: true,
      data: userDoc.data()
    });
    
  } catch (error) {
    logger.error("[Get User Data] Erro:", error);
    response.status(500).json({
      success: false,
      error: "Erro interno"
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
        subject: "Atalho - Confirme seu email para ativar sua conta",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; 
               margin: 0 auto; background: #f8f9fa; padding: 20px;">
            <div style="background: white; padding: 30px; border-radius: 10px; 
                 box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <img src="https://atalho.me/assets/img/Atalho.png" 
                     alt="Logo Atalho" 
                     style="width: 80px; height: 80px; 
                            object-fit: contain; margin-bottom: 10px;">
                <h1 style="color: #dbc9ad; margin: 0;">Atalho</h1>
                <p style="color: #666; margin: 5px 0 0 0;">
                  Automação e Produtividade
                </p>
              </div>
              
              <h2 style="color: #333; text-align: center;">
                ✅ Confirme seu email para ativar sua conta
              </h2>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationLink}" 
                   style="background: linear-gradient(
                            135deg, #dbc9ad 0%, #c8b298 100%); 
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
                Se o botão não funcionar, copie e cole este link:<br>
                <a href="${verificationLink}" 
                   style="color: #dbc9ad; word-break: break-all;">
                  ${verificationLink}
                </a>
              </p>
            </div>
          </div>
        `,
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

/**
 * Função para ativar trial de 7 dias
 * Controla por IP + fingerprint + hardware ID
 * Limite: uma vez por ano por combinação única
 */
exports.activateTrial = onCall({
  region: "us-east1",
}, async (request) => {
  try {
    const {fingerprint, hardware_id, ip_address} = request.data;
    const uid = request.auth ? request.auth.uid : null;

    // Validações básicas
    if (!fingerprint || !hardware_id || !ip_address) {
      throw new Error("Dados de identificação incompletos");
    }

    logger.info(`[TRIAL] Solicitação para UID: ${uid}, IP: ${ip_address}, HW: ${hardware_id.substring(0, 8)}...`);

    const db = getFirestore();
    const currentYear = new Date().getFullYear();

    // Criar identificador único baseado na combinação de fatores
    const machineFingerprint = `${ip_address}_${fingerprint}_${hardware_id}`;
    const fingerprintHash = require("crypto")
        .createHash("sha256")
        .update(machineFingerprint)
        .digest("hex");

    // Verificar se já existe trial ativo para esta máquina no ano atual
    const trialQuery = db.collection("trials")
        .where("machine_fingerprint", "==", fingerprintHash)
        .where("year", "==", currentYear)
        .limit(1);

    const existingTrials = await trialQuery.get();

    if (!existingTrials.empty) {
      const existingTrial = existingTrials.docs[0].data();

      // Verificar se o trial ainda está ativo
      const now = new Date();
      const trialEnd = existingTrial.trial_end.toDate();

      if (trialEnd > now) {
        logger.info(`[TRIAL] Trial já ativo para máquina até ${trialEnd}`);
        return {
          success: false,
          error: "TRIAL_ALREADY_ACTIVE",
          message: "Você já possui um trial ativo nesta máquina",
          trial_end: trialEnd.toISOString(),
          days_remaining: Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)),
        };
      } else {
        // Trial expirado, mas já foi usado este ano
        logger.info(`[TRIAL] Trial já usado neste ano para máquina`);
        return {
          success: false,
          error: "TRIAL_ALREADY_USED",
          message: "Trial já foi utilizado nesta máquina este ano",
          next_available: `01/01/${currentYear + 1}`,
        };
      }
    }

    // Se usuário está logado, verificar também no documento do usuário
    if (uid) {
      const userRef = db.collection("users").doc(uid);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        const userData = userDoc.data();

        // Verificar se usuário já tem licença ativa
        if (userData.license_active && userData.payment_status === "paid") {
          const licenseEnd = userData.sub_end ? userData.sub_end.toDate() : null;
          if (licenseEnd && licenseEnd > new Date()) {
            return {
              success: false,
              error: "ALREADY_LICENSED",
              message: "Usuário já possui licença ativa",
              license_end: licenseEnd.toISOString(),
              license_type: userData.license_type || "unknown",
            };
          }
        }

        // Verificar se usuário já usou trial este ano
        if (userData.last_trial_year === currentYear) {
          return {
            success: false,
            error: "USER_TRIAL_USED",
            message: "Usuário já utilizou trial este ano",
            next_available: `01/01/${currentYear + 1}`,
          };
        }
      }
    }

    // Criar novo trial
    const trialStart = new Date();
    const trialEnd = new Date(trialStart.getTime() + (7 * 24 * 60 * 60 * 1000)); // +7 dias

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
      user_email: request.auth?.token?.email || null,
    };

    // Salvar trial na coleção trials
    const trialRef = await db.collection("trials").add(trialData);
    logger.info(`[TRIAL] Trial criado: ${trialRef.id}`);

    // Se usuário está logado, atualizar documento do usuário
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
      };

      await userRef.set(userUpdateData, {merge: true});
      logger.info(`[TRIAL] Usuário ${uid} atualizado com dados do trial`);
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
    const {fingerprint, hardware_id, ip_address} = request.data;

    if (!fingerprint || !hardware_id || !ip_address) {
      throw new Error("Dados de identificação incompletos");
    }

    const db = getFirestore();
    const currentYear = new Date().getFullYear();

    // Criar identificador único
    const machineFingerprint = `${ip_address}_${fingerprint}_${hardware_id}`;
    const fingerprintHash = require("crypto")
        .createHash("sha256")
        .update(machineFingerprint)
        .digest("hex");

    // Buscar trial ativo para esta máquina
    const trialQuery = db.collection("trials")
        .where("machine_fingerprint", "==", fingerprintHash)
        .where("year", "==", currentYear)
        .limit(1);

    const trialDocs = await trialQuery.get();

    if (trialDocs.empty) {
      return {
        has_trial: false,
        can_activate: true,
        message: "Trial disponível para ativação",
      };
    }

    const trialData = trialDocs.docs[0].data();
    const now = new Date();
    const trialEnd = trialData.trial_end.toDate();
    const isActive = trialEnd > now;

    if (isActive) {
      const daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
      return {
        has_trial: true,
        is_active: true,
        can_activate: false,
        trial_end: trialEnd.toISOString(),
        days_remaining: daysRemaining,
        message: `Trial ativo - ${daysRemaining} dias restantes`,
      };
    } else {
      return {
        has_trial: true,
        is_active: false,
        can_activate: false,
        trial_end: trialEnd.toISOString(),
        message: "Trial expirado - aguarde próximo ano para novo trial",
      };
    }
  } catch (error) {
    logger.error("[TRIAL] Erro ao verificar status:", error);
    throw new Error("Erro interno ao verificar trial");
  }
});

/**
 * TRIGGER: Monitora mudanças no trial_status e atualiza license_type automaticamente
 * Gatilho: Quando um documento de usuário é atualizado no Firestore
 * Funciona com v2 - monitora mudanças no campo trial_status
 */
exports.syncLicenseTypeOnTrialChange = onDocumentUpdated({
  document: "users/{userId}",
  region: "us-east1",
}, async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  const userId = event.params.userId;

  try {
    const db = getFirestore();
    const userRef = db.collection("users").doc(userId);
    
    // Detecta mudança no trial_status
    if (before.trial_status !== after.trial_status) {
      logger.info(`[License Type Sync] Trial status mudou para UID: ${userId} - ${before.trial_status} → ${after.trial_status}`);
      
      const updateData = {
        updated_at: new Date().toISOString(),
      };

      // Se trial_status for "active", definir license_type como "trial"
      if (after.trial_status === "active") {
        updateData.license_type = "trial";
        logger.info(`[License Type Sync] Definindo license_type como "trial" para UID: ${userId}`);
      }
      // Se trial_status não for "active" e não há licença paga ativa, remover license_type
      else if (after.trial_status !== "active" && (!after.license_active || after.payment_status !== "paid")) {
        updateData.license_type = null;
        logger.info(`[License Type Sync] Removendo license_type para UID: ${userId} - trial não ativo e sem licença paga`);
      }

      // Só atualizar se houver mudanças necessárias
      if (updateData.license_type !== undefined) {
        await userRef.update(updateData);
        logger.info(`[License Type Sync] License type sincronizado para ${after.email || userId}: ${updateData.license_type}`);
      }
    }

    return {success: true};
  } catch (error) {
    logger.error(`[License Type Sync] Erro ao sincronizar license_type para UID: ${userId}`, error);
    return {success: false, error: error.message};
  }
});

/**
 * FUNÇÃO MANUAL: Força sincronização do license_type baseado no status atual
 * Útil para corrigir usuários que já têm trial ativo mas não têm license_type definido
 */
exports.fixLicenseTypeForActiveTrials = onCall({
  region: "us-east1",
}, async (request) => {
  try {
    const uid = request.auth ? request.auth.uid : null;
    
    if (!uid) {
      throw new Error("Usuário não autenticado");
    }

    logger.info(`[Fix License Type] Iniciando correção para UID: ${uid}`);

    const db = getFirestore();
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error("Usuário não encontrado");
    }

    const userData = userDoc.data();
    
    const updateData = {
      updated_at: new Date().toISOString(),
    };

    // Se trial_status for "active" mas license_type não estiver definido ou estiver incorreto
    if (userData.trial_status === "active") {
      // Verificar se trial ainda está válido
      const now = new Date();
      const trialEnd = userData.trial_end ? userData.trial_end.toDate() : null;
      
      if (trialEnd && trialEnd > now) {
        updateData.license_type = "trial";
        logger.info(`[Fix License Type] Definindo license_type como "trial" para UID: ${uid}`);
      } else {
        // Trial expirado, atualizar status
        updateData.trial_status = "expired";
        updateData.license_type = null;
        logger.info(`[Fix License Type] Trial expirado para UID: ${uid} - removendo license_type`);
      }
    }
    // Se tem licença paga ativa
    else if (userData.license_active && userData.payment_status === "paid") {
      updateData.license_type = userData.license_type || "paid";
      logger.info(`[Fix License Type] Mantendo license_type para licença paga: ${updateData.license_type}`);
    }
    // Se não tem trial ativo nem licença paga
    else {
      updateData.license_type = null;
      logger.info(`[Fix License Type] Removendo license_type - sem trial ou licença ativa`);
    }

    await userRef.update(updateData);

    logger.info(`[Fix License Type] Correção concluída para ${userData.email || uid}: license_type = ${updateData.license_type}`);

    return {
      success: true,
      license_type: updateData.license_type,
      trial_status: userData.trial_status,
      license_active: userData.license_active,
      payment_status: userData.payment_status,
    };
  } catch (error) {
    logger.error("[Fix License Type] Erro na correção:", error);
    throw new Error("Erro interno na correção do license_type");
  }
});
