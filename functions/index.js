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

// Function que gera email de verificação
exports.sendVerificationEmailOnSignup = onRequest({
  cors: true,
  region: "us-central1",
}, async (req, res) => {
  logger.info("🚀 Cloud Function sendVerificationEmailOnSignup iniciada");
  logger.info(`📨 Método da requisição: ${req.method}`);
  logger.info(`📨 Headers da requisição:`, req.headers);
  logger.info(`📨 Body da requisição:`, req.body);

  if (req.method !== "POST") {
    logger.error(`❌ Método não permitido: ${req.method}`);
    return res.status(405).json({error: "Method not allowed"});
  }

  const {uid, email} = req.body;
  logger.info(`📧 Dados recebidos - UID: ${uid}, Email: ${email}`);

  if (!uid || !email) {
    logger.error("❌ Dados insuficientes - UID ou email não fornecidos");
    return res.status(400).json({error: "UID and email are required"});
  }

  try {
    logger.info(`🔄 Gerando email de verificação para usuário: ${email}`);
    logger.info(`🔄 UID do usuário: ${uid}`);

    const link = await getAuth().generateEmailVerificationLink(email, {
      url: "https://atalho.me/login.html?verified=true",
      handleCodeInApp: false,
    });

    logger.info(`✅ Link de verificação gerado com sucesso para: ${email}`);
    logger.info(`🔗 Link gerado: ${link.substring(0, 50)}...`);

    // Aqui seria onde integramos com provedor de email real
    logger.info("📧 NOTA: Firebase Admin gera link, mas não envia email real");
    logger.info("📧 Para envio real, precisa integrar SendGrid/Resend/etc");

    res.status(200).json({
      success: true,
      message: "Verification email link generated successfully",
      emailActuallySent: false,
      note: "Link gerado, mas email real não foi enviado (precisa provedor)",
      verificationLink: process.env.NODE_ENV === "development" ?
        link : undefined,
      debug: {
        timestamp: new Date().toISOString(),
        uid: uid,
        email: email,
        linkGenerated: true,
        environment: process.env.NODE_ENV || "production",
      },
    });
  } catch (error) {
    logger.error("❌ Erro ao gerar email de verificação:", error);
    logger.error("❌ Stack trace:", error.stack);
    logger.error("❌ Código do erro:", error.code);

    res.status(500).json({
      error: "Failed to generate verification email",
      details: error.message,
      code: error.code,
      debug: {
        timestamp: new Date().toISOString(),
        uid: uid,
        email: email,
        errorType: error.constructor.name,
      },
    });
  }
});

// Function alternativa usando trigger automático
exports.onUserCreate = onRequest({
  cors: true,
  region: "us-central1",
}, async (req, res) => {
  logger.info("User creation trigger activated");
  res.status(200).json({message: "User creation handled"});
});

// Function para testar
exports.testFunction = onRequest({
  cors: true,
  region: "us-central1",
}, (req, res) => {
  logger.info("Test function called");
  res.json({
    message: "Firebase Cloud Functions funcionando!",
    timestamp: new Date().toISOString(),
    method: req.method,
  });
});
