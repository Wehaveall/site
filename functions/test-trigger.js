const admin = require('firebase-admin');

// Configurar Firebase Admin usando credenciais padrão do CLI
admin.initializeApp({
  projectId: 'shortcut-6256b'
});

const db = admin.firestore();

// Função para forçar trigger da syncLicenseTypeOnTrialChange
async function testTrigger() {
  try {
    const userId = 'ZCIZ5xqkgPZ0teXoQDkl80lUmWO2'; // Seu usuário atual
    
    console.log('🔧 Alterando updated_at para forçar trigger...');
    
    // Primeiro, vamos alterar o trial_status temporariamente
    await db.collection('users').doc(userId).update({
      trial_status: 'testing', // Temporário
      updated_at: new Date().toISOString()
    });
    
    console.log('⏳ Aguardando 3 segundos...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Agora voltamos para 'active' - isso deve disparar a função
    await db.collection('users').doc(userId).update({
      trial_status: 'active',
      updated_at: new Date().toISOString()
    });
    
    console.log('✅ Trigger executado! Verifique os logs com:');
    console.log('firebase functions:log --only syncLicenseTypeOnTrialChange');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

testTrigger();