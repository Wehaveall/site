const fetch = require('node-fetch');

module.exports = async (req, res) => {
    try {
        const mercadopagoSdkUrl = 'https://sdk.mercadopago.com/js/v2';
        const response = await fetch(mercadopagoSdkUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch MercadoPago SDK: ${response.statusText}`);
        }

        const scriptContent = await response.text();

        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate'); // Cache for 1 hour
        res.status(200).send(scriptContent);
    } catch (error) {
        console.error('Error serving MercadoPago SDK proxy:', error);
        res.status(500).send('Error loading MercadoPago SDK');
    }
};