# 📧 Configuração SendGrid - Atalho

## 🚀 Passo 1: Criar Conta SendGrid

1. **Acesse**: https://sendgrid.com/
2. **Clique**: "Start for Free"
3. **Preencha**: Dados da conta
4. **Plano gratuito**: 100 emails/dia

## 🔧 Passo 2: Configurar SendGrid

### **2.1 Verificar Conta**
1. Verifique email de confirmação
2. Complete setup inicial

### **2.2 Criar API Key**
1. Vá em **Settings** → **API Keys**
2. Clique **"Create API Key"**
3. Nome: `Atalho Production`
4. Permissões: **Full Access** (ou Mail Send)
5. **COPIE A CHAVE** (só aparece uma vez!)

### **2.3 Verificar Sender**
**Opção A: Single Sender (Recomendado para início)**
1. **Settings** → **Sender Authentication**
2. **Single Sender Verification**
3. **From Email**: seu@email.com (seu email pessoal)
4. **From Name**: "Atalho App"
5. **Reply To**: mesmo email
6. Clique **"Create"** e verifique o email

**Opção B: Domain Authentication (Profissional)**
- Requer domínio próprio
- Configuração DNS mais complexa

## ⚙️ Passo 3: Configurar Variáveis de Ambiente

### **3.1 No Vercel Dashboard**
1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto **Atalho**
3. Vá em **Settings** → **Environment Variables**
4. Adicione as variáveis:

```bash
# SendGrid API Key
SENDGRID_API_KEY=SG.sua_chave_aqui_muito_longa

# Email remetente (verificado no SendGrid)
SENDGRID_FROM_EMAIL=seu@email.com
```

### **3.2 Exemplo de Configuração**
```bash
SENDGRID_API_KEY=SG.ABC123def456ghi789jkl012mno345pqr678stu901vwx234yz
SENDGRID_FROM_EMAIL=contato@atalho.me
```

## 🧪 Passo 4: Testar Implementação

### **4.1 Deploy das Mudanças**
```bash
git add -A
git commit -m "feat: Implementar SendGrid para emails de verificação"
git push
```

### **4.2 Testar Registro**
1. Acesse: `https://www.atalho.me/register.html`
2. Preencha formulário
3. Clique "Criar Conta"
4. **Verifique logs** no console
5. **Verifique email** na caixa de entrada

### **4.3 Logs Esperados**
```
[API] ✅ Link de verificação gerado
[API] Enviando email via SendGrid...
[SENDGRID] ✅ Email enviado com sucesso para: usuario@email.com
[API] ✅ Email de verificação enviado via SendGrid
```

## 🔍 Troubleshooting

### **Erro: "Unauthorized"**
- ✅ Verificar se API Key está correta
- ✅ Verificar se tem permissões Mail Send

### **Erro: "The from address does not match a verified Sender Identity"**
- ✅ Verificar se email está verificado no SendGrid
- ✅ Usar exato mesmo email da verificação

### **Erro: "Bad Request"**
- ✅ Verificar formato do email destinatário
- ✅ Verificar se template HTML está válido

### **Email não chega**
- ✅ Verificar pasta spam/lixo eletrônico
- ✅ Verificar logs do SendGrid Dashboard
- ✅ Aguardar alguns minutos

## 📊 Monitoramento

### **SendGrid Dashboard**
1. **Activity** → **Email Activity**
2. Veja status dos emails enviados:
   - ✅ **Delivered**: Email entregue
   - ⏳ **Processed**: Em processamento
   - ❌ **Bounced**: Email inválido
   - 📧 **Opened**: Email aberto pelo usuário

### **Métricas Importantes**
- **Delivery Rate**: % de emails entregues
- **Open Rate**: % de emails abertos
- **Bounce Rate**: % de emails rejeitados

## 🔐 Segurança

### **Proteção da API Key**
- ❌ **NUNCA** commitar API Key no código
- ✅ Usar apenas variáveis de ambiente
- ✅ Regenerar chave se comprometida

### **Configuração Produção vs Desenvolvimento**
```bash
# Produção
SENDGRID_FROM_EMAIL=noreply@atalho.me

# Desenvolvimento/Teste
SENDGRID_FROM_EMAIL=seu.email.pessoal@gmail.com
```

## ✅ Checklist Final

- [ ] Conta SendGrid criada e verificada
- [ ] API Key gerada e copiada
- [ ] Single Sender verificado
- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] Código atualizado e deployado
- [ ] Teste de registro realizado
- [ ] Email de verificação recebido
- [ ] Link de verificação funcionando

## 🆘 Suporte

Se tiver problemas:
1. **Verificar logs** no console do navegador
2. **Verificar logs** no Vercel Functions
3. **Verificar Activity** no SendGrid Dashboard
4. **Testar** com email diferente

---

**📧 Com SendGrid configurado, os emails de verificação serão enviados automaticamente sem necessidade de login temporário!** 