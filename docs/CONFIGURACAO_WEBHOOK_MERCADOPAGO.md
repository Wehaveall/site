# Configuração do Webhook do Mercado Pago

## Por que o Webhook não Existia?

O sistema anterior funcionava com **polling** (verificação a cada 5 segundos) do status do pagamento. Isso apresentava vários problemas:

1. **Ineficiência**: Muitas requisições desnecessárias
2. **Não confiável**: Se o usuário fechasse o navegador, o pagamento não era processado
3. **Demora**: Até 5 segundos para detectar aprovação
4. **Desperdício de recursos**: Polling constante

## Solução Implementada

Criamos um endpoint webhook seguro (`/api/webhook`) que:

- ✅ **Valida a assinatura** da requisição do Mercado Pago
- ✅ **Processa pagamentos instantaneamente** quando aprovados
- ✅ **Funciona mesmo se o usuário fechar o navegador**
- ✅ **Implementa rate limiting** para prevenir abuso
- ✅ **Evita processamento duplicado** de pagamentos

## Configuração Necessária

### 1. Variáveis de Ambiente

Adicione as seguintes variáveis no painel da Vercel:

```bash
# Já existente
MERCADOPAGO_ACCESS_TOKEN=seu_access_token_aqui

# NOVA - Necessária para validar webhooks
MERCADOPAGO_WEBHOOK_SECRET=sua_secret_key_aqui
```

### 2. Configurar Webhook no Mercado Pago

1. Acesse o [painel do Mercado Pago](https://www.mercadopago.com.br/developers/panel)
2. Vá em **Webhooks** → **Configurar notificações**
3. Adicione a URL: `https://atalho.me/api/webhook`
4. Selecione os eventos: **Pagamentos**
5. Copie a **Secret Key** gerada e adicione na variável `MERCADOPAGO_WEBHOOK_SECRET`

### 3. Testar o Webhook

Você pode testar o webhook de várias formas:

#### Teste Local com ngrok

```bash
# Instalar ngrok
npm install -g ngrok

# Expor localhost:3000
ngrok http 3000

# Usar a URL do ngrok no painel do Mercado Pago
# Exemplo: https://abc123.ngrok.io/api/webhook
```

#### Teste com Postman

```bash
POST https://atalho.me/api/webhook
Content-Type: application/json
x-signature: sua_assinatura_aqui

{
  "type": "payment",
  "data": {
    "id": "123456789"
  }
}
```

## Fluxo de Funcionamento

### Antes (Polling)
1. Usuário faz pagamento PIX
2. Frontend verifica status a cada 5 segundos
3. Se aprovado, processa no frontend
4. **Problema**: Se usuário fechar navegador, pagamento não é processado

### Agora (Webhook)
1. Usuário faz pagamento PIX
2. Mercado Pago aprova o pagamento
3. **Mercado Pago envia webhook instantaneamente**
4. Nosso servidor valida e processa o pagamento
5. **Funciona mesmo se usuário fechar navegador**

## Recursos de Segurança

### 1. Validação de Assinatura
```javascript
// Validamos que a requisição realmente veio do Mercado Pago
function validateMercadoPagoSignature(body, signature, secret) {
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');
    
    return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
    );
}
```

### 2. Rate Limiting
- Máximo 100 webhooks por minuto por IP
- Previne ataques de negação de serviço

### 3. Prevenção de Duplicação
- Verifica se pagamento já foi processado antes
- Evita processamento duplo

### 4. CORS Restritivo
- Apenas aceita requisições do Mercado Pago
- Bloqueia tentativas de outros domínios

## Monitoramento

### Logs Importantes
```bash
# Webhook recebido e validado
✅ Webhook do Mercado Pago recebido e validado

# Pagamento processado
✅ Pagamento 123456789 processado com sucesso via webhook

# Tentativa de fraude
❌ Assinatura do webhook inválida
```

### Métricas a Acompanhar
- Taxa de sucesso dos webhooks
- Tempo de processamento
- Tentativas de webhook com assinatura inválida
- Rate limiting ativado

## Próximos Passos

1. **Configurar as variáveis de ambiente**
2. **Configurar o webhook no painel do Mercado Pago**
3. **Testar com um pagamento real**
4. **Monitorar os logs**
5. **Considerar implementar notificações por email automáticas**

## Troubleshooting

### Erro: "MERCADOPAGO_WEBHOOK_SECRET não configurado"
- Verifique se a variável foi adicionada na Vercel
- Redeploy a aplicação após adicionar a variável

### Erro: "Assinatura do webhook inválida"
- Verifique se a secret key está correta
- Confirme que a URL do webhook está configurada corretamente

### Pagamentos não sendo processados
- Verifique os logs da função webhook
- Confirme que o webhook está sendo chamado pelo Mercado Pago
- Teste com a ferramenta de webhooks do Mercado Pago

## Vantagens da Nova Implementação

1. **🚀 Instantâneo**: Pagamentos processados em segundos
2. **🔒 Seguro**: Validação criptográfica das notificações
3. **💪 Confiável**: Funciona mesmo se usuário sair da página
4. **⚡ Eficiente**: Elimina polling desnecessário
5. **📊 Monitorável**: Logs detalhados para debugging 