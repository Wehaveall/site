/**
 * Script para gerar configuração estática a partir de variáveis de ambiente
 * Executa durante o build no Vercel
 */

const fs = require('fs');
const path = require('path');

function generateConfig() {
    console.log('🔧 Gerando configuração estática...');
    
    // Tentar carregar .env.local se existir (para desenvolvimento local)
    const envLocalPath = path.join(__dirname, '.env.local');
    if (fs.existsSync(envLocalPath)) {
        console.log('📁 Carregando .env.local...');
        const envContent = fs.readFileSync(envLocalPath, 'utf8');
        const envLines = envContent.split('\n');
        
        envLines.forEach(line => {
            line = line.trim();
            if (line.includes('=') && !line.startsWith('#') && line.length > 0) {
                const [key, ...valueParts] = line.split('=');
                const value = valueParts.join('=').trim();
                if (key && value && !process.env[key.trim()]) {
                    process.env[key.trim()] = value;
                    console.log(`🔧 Carregado: ${key.trim()} = ${value.substring(0, 20)}...`);
                }
            }
        });
    }
    
    // Verificar variáveis de ambiente
    const requiredVars = [
        'NEXT_PUBLIC_FIREBASE_API_KEY',
        'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
        'NEXT_PUBLIC_FIREBASE_DATABASE_URL',
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
        'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
        'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
        'NEXT_PUBLIC_FIREBASE_APP_ID',
        'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        console.log('❌ Variáveis de ambiente obrigatórias não definidas:', missingVars);
        console.log('🔧 Contexto:', {
            NODE_ENV: process.env.NODE_ENV,
            VERCEL: process.env.VERCEL,
            CI: process.env.CI,
            hasEnvLocal: require('fs').existsSync('.env.local')
        });
        
        // Avisar sobre variáveis faltando, mas continuar com fallbacks
        console.log('⚠️ Usando valores fallback para as variáveis faltando');
        console.log('✅ Continuando com a geração...');
    }

    // Gerar configuração com fallbacks para garantir que funcione
    const config = {
        firebase: {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCsIbyCkHx_E5VHQXnHZYmoZSrpnuPrPUQ",
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "shortcut-6256b.firebaseapp.com",
            databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://shortcut-6256b-default-rtdb.firebaseio.com",
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "shortcut-6256b",
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "shortcut-6256b.appspot.com",
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "526680485333",
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:526680485333:web:a5434dd5b6da2fda9ee15c",
            measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-PZ2EHV9YR6"
        },
        
        app: {
            name: "Atalho",
            version: "1.0.0",
            environment: process.env.NODE_ENV || "production"
        },
        
        services: {
            cloudFunctions: {
                syncEmailVerification: process.env.SYNC_EMAIL_VERIFICATION_URL || "https://syncemailverificationpublic-lj2of3bbgq-ue.a.run.app"
            }
        },
        
        // Timestamp para debug
        generated: new Date().toISOString()
    };

    // Gerar arquivo JSON
    const configPath = path.join(__dirname, 'assets', 'config.json');
    
    // Garantir que o diretório existe
    const assetsDir = path.dirname(configPath);
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
    }
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('✅ Configuração gerada em:', configPath);
    
    // Também gerar um arquivo JS para fallback
    const jsConfigContent = `
// Configuração gerada automaticamente - NÃO EDITAR
window.STATIC_CONFIG = ${JSON.stringify(config, null, 2)};
console.log('✅ Configuração estática carregada');
`;
    
    const jsConfigPath = path.join(__dirname, 'assets', 'js', 'static-config.js');
    fs.writeFileSync(jsConfigPath, jsConfigContent);
    console.log('✅ Configuração JS gerada em:', jsConfigPath);
}

// Executar se chamado diretamente
if (require.main === module) {
    generateConfig();
}

module.exports = generateConfig; 