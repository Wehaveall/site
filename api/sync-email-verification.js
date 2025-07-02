// SYNC EMAIL VERIFICATION API
// ========================================
// Endpoint para sincronizar verificação de email
// Chama a Cloud Function correspondente

export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Responder a requisições OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Apenas aceitar POST
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Método não permitido' 
        });
    }

    try {
        const { oobCode, email } = req.body;

        if (!oobCode) {
            return res.status(400).json({
                success: false,
                error: 'oobCode é obrigatório'
            });
        }

        console.log(`🔄 Sincronizando verificação de email para: ${email}`);

        // URL da Cloud Function
        const cloudFunctionUrl = 'https://syncemailverificationpublic-lj2of3bbgq-ue.a.run.app';
        
        // Fazer requisição para a Cloud Function
        const response = await fetch(cloudFunctionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                oobCode,
                email
            })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            console.log(`✅ Sincronização bem-sucedida para: ${email}`);
            return res.status(200).json(result);
        } else {
            console.warn(`⚠️ Falha na sincronização para: ${email}`, result);
            return res.status(response.status || 500).json(result);
        }

    } catch (error) {
        console.error('❌ Erro na API de sincronização:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno na sincronização',
            details: error.message
        });
    }
} 