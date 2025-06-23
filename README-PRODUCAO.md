# 🚀 GUIA PRODUÇÃO - PIX REAL

## ✅ Pré-requisitos

1. **Conta Mercado Pago verificada** com documentos aprovados
2. **Aplicação criada** no painel de desenvolvedor
3. **Certificado de pessoa jurídica** (se for empresa) ou **CPF** (se pessoa física)

## 🔧 Configuração Passo a Passo

### 1. Obter Credenciais de Produção

1. Acesse: https://www.mercadopago.com.br/developers
2. Entre com sua conta **real** do Mercado Pago
3. Vá em **"Suas aplicações"** → Selecione sua aplicação
4. Na aba **"Credenciais de produção"**, copie:
   - **Access Token:** `APP-...` (não `TEST-...`)
   - **Public Key:** `APP-...` (não `TEST-...`)

### 2. Configurar o Servidor Backend

1. Abra o arquivo: `atalho-backend/server.js`
2. Na linha 9, substitua `'COLE_SEU_ACCESS_TOKEN_DE_PRODUCAO_AQUI'` pelo seu **Access Token** real
3. Salve o arquivo

```javascript
// Exemplo:
const MP_ACCESS_TOKEN = 'APP-1234567890123456-010120-abcd1234efgh5678ijkl9012mnop3456-123456789';
```

### 3. Iniciar o Servidor

```bash
cd atalho-backend
node server.js
```

**Você deve ver:**
```
🚀 Servidor PRODUÇÃO rodando em http://localhost:3000
💰 ATENÇÃO: Este servidor está configurado para PIX REAL com taxas reais!
```

### 4. Testar o PIX Real

1. Abra sua página de compra no navegador
2. Selecione **PIX**
3. Use seu celular/app bancário para escanear o QR Code **DE VERDADE**
4. Confirme o pagamento no seu banco
5. Aguarde alguns segundos - o pagamento será detectado automaticamente!

## ⚠️ IMPORTANTE

- **TAXAS REAIS:** O Mercado Pago cobrará taxas reais (cerca de 3,99% por transação PIX)
- **DINHEIRO REAL:** Os pagamentos vão direto para sua conta Mercado Pago
- **RESPONSABILIDADE:** Todos os pagamentos são irreversíveis

## 🔒 Segurança

- **NUNCA** commite suas credenciais para repositórios públicos
- Use variáveis de ambiente em produção real
- Monitore os logs de transação

## 🎯 Próximos Passos para Produção Completa

1. **Domínio próprio:** Hospedar em servidor real (não localhost)
2. **HTTPS obrigatório:** Para transações reais
3. **Webhook:** Para notificações instantâneas de pagamento
4. **Backup de dados:** Sistema de backup das transações

## 📞 Suporte

Se der algum erro, verifique:
1. Credenciais corretas (APP-, não TEST-)
2. Conta Mercado Pago verificada
3. Servidor rodando na porta 3000
4. Conexão com internet estável

---

**🎉 Pronto! Agora você está no ar com PIX real!** 