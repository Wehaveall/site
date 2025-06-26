// simple-register.js - Registro simples via API (sem CORS)

async function registerUserSimple(email, password, language = 'pt-br') {
    try {
        console.log('🚀 Registrando usuário via API...');
        
        const response = await fetch('/api/register-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password,
                language: language
            })
        });

        const data = await response.json();

        if (data.success) {
            console.log('✅ Usuário registrado com sucesso!');
            return {
                success: true,
                uid: data.uid,
                message: data.message,
                emailVerificationLink: data.emailVerificationLink
            };
        } else {
            console.error('❌ Erro no registro:', data.error);
            throw new Error(data.error);
        }

    } catch (error) {
        console.error('❌ Erro na requisição:', error);
        throw error;
    }
}

// Expor globalmente
window.registerUserSimple = registerUserSimple;

console.log('📝 Sistema de registro simples carregado'); 