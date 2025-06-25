# Guia Definitivo: Google Workspace Individual (Para Pessoa Física sem CNPJ)

## 🎯 **Objetivo**
Contratar o plano de email profissional correto para pessoa física usando o domínio `atalho.me`, **sem a necessidade de um CNPJ**.

## 💡 **O Segredo: O Plano Correto**
O problema que você enfrentou é comum. A solução é contratar o **Google Workspace Individual**, que é um produto diferente do *Business*.

- **Preço**: $9.99/mês (~R$ 50)
- **CNPJ**: Não é necessário.

---

## 🚀 **Passo a Passo da Contratação (Fluxo Correto)**

### **1. Use o Link Correto**
- **Acesse exclusivamente por este link**: [https://workspace.google.com/individual/](https://workspace.google.com/individual/)

### **2. Inicie com sua Conta Pessoal**
1. Clique em **"Get started"** ou **"Começar"**.
2. O Google pedirá para você fazer login. **Use sua conta Google pessoal** (ex: `seuemail@gmail.com`).
   - *Este é o passo mais importante. O plano Individual é um upgrade para sua conta existente.*
3. Siga para a tela de pagamento. **Nenhum CNPJ será solicitado**.

### **3. Conecte seu Domínio `atalho.me`**
1. Após a assinatura, o Google vai te guiar para a configuração.
2. Procure a opção **"Use a domain you already own"** ou **"Usar um domínio que já possuo"**.
3. Digite `atalho.me`.

### **4. Verifique a Propriedade do Domínio (no Cloudflare)**
1. O Google fornecerá um **código de verificação TXT**.
2. **Acesse** seu [Dashboard Cloudflare](https://dash.cloudflare.com) → `atalho.me` → DNS.
3. **Crie um novo registro**:
   - **Tipo**: `TXT`
   - **Nome**: `@`
   - **Conteúdo**: Cole o código que o Google forneceu (ex: `google-site-verification=...`)
4. **Salve** e volte para o Google para clicar em **"Verificar"**. Pode levar alguns minutos.

### **5. Configure os MX Records (no Cloudflare)**
1. Para que os emails de `atalho.me` cheguem na sua nova caixa, você precisa apontar o domínio para o Google.
2. No mesmo local do DNS no Cloudflare, **delete quaisquer MX records antigos** e adicione estes 5:
   ```
   Tipo: MX | Nome: @ | Prioridade: 1  | Conteúdo: ASPMX.L.GOOGLE.COM
   Tipo: MX | Nome: @ | Prioridade: 5  | Conteúdo: ALT1.ASPMX.L.GOOGLE.COM
   Tipo: MX | Nome: @ | Prioridade: 5  | Conteúdo: ALT2.ASPMX.L.GOOGLE.COM
   Tipo: MX | Nome: @ | Prioridade: 10 | Conteúdo: ALT3.ASPMX.L.GOOGLE.COM
   Tipo: MX | Nome: @ | Prioridade: 10 | Conteúdo: ALT4.ASPMX.L.GOOGLE.COM
   ```

### **6. Crie seus Endereços Profissionais (Aliases)**
- Com o plano Individual, você não cria "novos usuários". Você cria **"aliases"** (apelidos) para sua conta principal.
1. Vá para as configurações da sua conta Gmail.
2. **Configurações** → **Contas e Importação**.
3. Na seção **"Enviar e-mail como"**, clique em **"Adicionar outro endereço de e-mail"**.
4. Adicione `suporte@atalho.me` e `noreply@atalho.me`.

---

## 🔧 **Configuração no Código e Vercel**

A configuração no código é a mesma da solução "Gmail Gratuito", pois a autenticação SMTP ainda usa sua conta principal.

### **1. Gere uma Senha de App (App Password)**
1. Em [myaccount.google.com](https://myaccount.google.com), vá para **Segurança**.
2. Ative a **Verificação em Duas Etapas** (2FA), se ainda não estiver ativa.
3. Em "Senhas de app", gere uma nova senha para `Email` > `Outro (personalizado)`.
4. **Nome**: `Atalho API`
5. **Copie a senha de 16 dígitos**.

### **2. Configure as Variáveis na Vercel**
1. Acesse o dashboard do seu projeto no Vercel.
2. **Settings** → **Environment Variables**.
3. Configure as variáveis:
   ```
   # AUTENTICAÇÃO É FEITA COM SUA CONTA PESSOAL
   GMAIL_USER = seu-email-pessoal@gmail.com

   # SENHA DE APP GERADA NA SUA CONTA PESSOAL
   GMAIL_APP_PASSWORD = abcd efgh ijkl mnop
   ```

### **3. Deploy Final**
- O código que subimos da última vez já está correto e usará essas variáveis.
- Faça o deploy na Vercel para garantir que as novas variáveis de ambiente sejam aplicadas.

## 🎉 **Resultado**
- Você terá uma **caixa de entrada do Gmail** que recebe e envia emails tanto do seu `@gmail.com` quanto de `suporte@atalho.me`.
- Sua API enviará os emails de verificação usando seu domínio `noreply@atalho.me` através do SMTP do Google.
- **Tudo isso sem precisar de CNPJ!**

**Esta é a forma definitiva e correta para você como pessoa física. Tente seguir este guia e me diga se funciona!** 