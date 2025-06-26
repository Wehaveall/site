const {setGlobalOptions} = require("firebase-functions");
const {onCall} = require("firebase-functions/v2/https");
const {beforeUserSignedIn} = require("firebase-functions/v2/identity");
const {initializeApp} = require("firebase-admin/app");
const {getAuth} = require("firebase-admin/auth");
const {getFirestore} = require("firebase-admin/firestore");
const logger = require("firebase-functions/logger");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({maxInstances: 10});

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Inicializar Firebase Admin
initializeApp();

// As funções sendVerificationEmailOnSignup e onUserCreate foram removidas
// porque a extensão firestore-send-email agora cuida do envio de emails.

// ✨ NOVA FUNÇÃO: Sincronização INSTANTÂNEA quando email é verificado
// Esta função é disparada automaticamente quando o emailVerified muda no Auth
// Funciona imediatamente quando o usuário clica no link de ativação!
exports.onEmailVerificationChange = beforeUserSignedIn({
  region: "us-east1",
}, async (event) => {
  try {
    const user = event.data;

    // Só processa se o email foi verificado
    if (!user.emailVerified) {
      return;
    }

    logger.info(`🔥 TRIGGER: Email verificado para ${user.email} ` +
      `(${user.uid})`);

    const db = getFirestore();

    // Buscar documento no Firestore
    const userDocRef = db.collection("users").doc(user.uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      logger.warn(`⚠️ Documento não encontrado para UID: ${user.uid}`);
      return;
    }

    const userData = userDoc.data();
    const currentEmailVerified = userData.email_verified || false;

    // Só atualiza se ainda não foi verificado no Firestore
    if (!currentEmailVerified) {
      await userDocRef.update({
        email_verified: true,
        account_status: "active",
        email_verification_synced_at: new Date().toISOString(),
        email_verified_trigger_at: new Date().toISOString(),
      });

      logger.info(`🎉 SUCESSO: Email instantaneamente sincronizado ` +
        `para ${user.email}`);
    } else {
      logger.info(`ℹ️ Email já estava verificado no Firestore ` +
        `para ${user.email}`);
    }
  } catch (error) {
    logger.error("❌ Erro na sincronização instantânea:", error);
    // Não lança erro para não interromper o processo de login
  }
});

// ✨ NOVA FUNÇÃO: Sincronização automática no login
// Esta função é disparada automaticamente quando um usuário faz login
// e verifica se o status de verificação de email precisa ser sincronizado
exports.syncEmailOnLogin = onCall({
  region: "us-east1",
}, async (request) => {
  try {
    const {uid} = request.auth;

    if (!uid) {
      throw new Error("Usuário não autenticado");
    }

    logger.info(`🔄 Sincronizando status de email para UID: ${uid}`);

    const db = getFirestore();
    const auth = getAuth();

    // Buscar dados do usuário no Authentication
    const userAuth = await auth.getUser(uid);

    // Buscar documento no Firestore
    const userDocRef = db.collection("users").doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      logger.warn(`⚠️ Documento não encontrado para UID: ${uid}`);
      return {
        success: false,
        message: "Documento do usuário não encontrado",
      };
    }

    const userData = userDoc.data();
    const currentEmailVerified = userData.email_verified || false;
    const authEmailVerified = userAuth.emailVerified || false;

    // Só atualiza se houver diferença
    if (currentEmailVerified !== authEmailVerified) {
      await userDocRef.update({
        email_verified: authEmailVerified,
        account_status: authEmailVerified ?
          "active" : "pending_verification",
        email_verification_synced_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
      });

      logger.info(`✅ Email sincronizado para ${userAuth.email}: ` +
        `${currentEmailVerified} → ${authEmailVerified}`);

      return {
        success: true,
        message: "Status de email sincronizado com sucesso",
        emailVerified: authEmailVerified,
      };
    }

    // Apenas atualiza o last_login se não houve mudança no email
    await userDocRef.update({
      last_login: new Date().toISOString(),
    });

    return {
      success: true,
      message: "Status já sincronizado",
      emailVerified: authEmailVerified,
    };
  } catch (error) {
    logger.error("❌ Erro na sincronização automática:", error);
    throw new Error("Erro interno na sincronização");
  }
});
