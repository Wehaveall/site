/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/v2/https");
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

// ✨ FUNÇÃO: Sincronização automática do status de verificação de email
// Esta função verifica se o email foi verificado no Firebase Authentication
// e atualiza o documento correspondente no Firestore para manter sincronizado
exports.syncEmailVerificationStatus = onRequest({
  cors: true,
  region: "us-east1", // Mesma região do Firestore para melhor performance
}, async (req, res) => {
  try {
    logger.info("🔄 Iniciando sincronização manual do status de emails");

    const db = getFirestore();
    const auth = getAuth();

    // Buscar todos os usuários do Authentication
    const listUsersResult = await auth.listUsers();
    const users = listUsersResult.users;

    let updatedCount = 0;
    let alreadySyncedCount = 0;
    let errorCount = 0;

    logger.info(`📊 Encontrados ${users.length} usuários no Auth`);

    for (const user of users) {
      try {
        // Buscar o documento correspondente no Firestore
        const userDocRef = db.collection("users").doc(user.uid);
        const userDoc = await userDocRef.get();

        if (!userDoc.exists) {
          logger.warn(`⚠️ Documento não encontrado para UID: ${user.uid}`);
          continue;
        }

        const userData = userDoc.data();
        const currentEmailVerified = userData.email_verified || false;
        const authEmailVerified = user.emailVerified || false;

        // Só atualiza se houver diferença
        if (currentEmailVerified !== authEmailVerified) {
          await userDocRef.update({
            email_verified: authEmailVerified,
            account_status: authEmailVerified ?
              "active" : "pending_verification",
            email_verification_synced_at: new Date().toISOString(),
          });

          logger.info(`✅ Sincronizado usuário ${user.email}: ` +
            `email_verified ${currentEmailVerified} → ` +
            `${authEmailVerified}`);
          updatedCount++;
        } else {
          alreadySyncedCount++;
        }
      } catch (userError) {
        logger.error(`❌ Erro ao processar usuário ${user.uid}:`, userError);
        errorCount++;
      }
    }

    const summary = {
      totalUsers: users.length,
      updated: updatedCount,
      alreadySynced: alreadySyncedCount,
      errors: errorCount,
      timestamp: new Date().toISOString(),
    };

    logger.info("🎯 Sincronização concluída:", summary);

    res.json({
      success: true,
      message: "Sincronização de status de verificação concluída",
      ...summary,
    });
  } catch (error) {
    logger.error("❌ Erro na sincronização:", error);
    res.status(500).json({
      success: false,
      error: "Erro interno na sincronização",
      message: error.message,
    });
  }
});
