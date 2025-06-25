# Google Workspace Setup - Atalho

## 🎯 **Objetivo**
Configurar email profissional completo com Google Workspace para:
- `suporte@atalho.me` - Email principal (caixa real)
- `noreply@atalho.me` - Alias para emails automáticos

## 💰 **Investimento**
- **Business Starter**: $7 USD/mês (~R$ 35/mês)
- **Business Standard**: $14 USD/mês (~R$ 70/mês) - **RECOMENDADO**

## 🚀 **Passo a Passo Completo:**

### **1. Assinar Google Workspace**

#### 1.1 Acessar e Iniciar
1. Acesse: [https://workspace.google.com](https://workspace.google.com)
2. Clique em **"Get started"** ou **"Começar"**
3. Selecione **"Para minha empresa"**

#### 1.2 Configuração Inicial
1. **Nome da empresa**: `Atalho`
2. **Número de funcionários**: `Só eu`
3. **Região**: `Brasil`
4. **Já tem domínio?**: `Sim, tenho um domínio`
5. **Seu domínio**: `atalho.me`

#### 1.3 Escolher Plano
**RECOMENDADO**: **Business Standard** ($14/mês)
- ✅ 2TB de armazenamento
- ✅ Email personalizado ilimitado
- ✅ Gravação de reuniões
- ✅ Suporte 24/7

### **2. Criar Conta de Administrador**

#### 2.1 Primeiro Usuário
1. **Nome**: `Seu Nome`
2. **Nome de usuário**: `suporte` (vai criar suporte@atalho.me)
3. **Senha**: Senha forte (guarde bem!)

#### 2.2 Informações de Pagamento
1. **Cartão de crédito** para cobrança mensal
2. **Período gratuito**: 14 dias para testar

### **3. Verificar Propriedade do Domínio**

#### 3.1 Método de Verificação
O Google vai oferecer várias opções. **Escolha**: **Registro TXT do DNS**

#### 3.2 Configurar no Cloudflare
1. **Acesse**: [Cloudflare Dashboard](https://dash.cloudflare.com)
2. **Selecione**: `atalho.me`
3. **Vá em**: DNS → Records
4. **Adicione** o registro que o Google forneceu:
   ```
   Tipo: TXT
   Nome: @
   Conteúdo: google-site-verification=ABC123XYZ... (código do Google)
   TTL: Auto
   ```
5. **Clique em**: Save
6. **Volte ao Google** e clique em "Verificar"

### **4. Configurar MX Records (Email)**

#### 4.1 No Cloudflare DNS
**REMOVA** os registros MX antigos e adicione os do Google:

```
Tipo: MX | Nome: @ | Prioridade: 1  | Conteúdo: ASPMX.L.GOOGLE.COM
Tipo: MX | Nome: @ | Prioridade: 5  | Conteúdo: ALT1.ASPMX.L.GOOGLE.COM
Tipo: MX | Nome: @ | Prioridade: 5  | Conteúdo: ALT2.ASPMX.L.GOOGLE.COM
Tipo: MX | Nome: @ | Prioridade: 10 | Conteúdo: ALT3.ASPMX.L.GOOGLE.COM
Tipo: MX | Nome: @ | Prioridade: 10 | Conteúdo: ALT4.ASPMX.L.GOOGLE.COM
```

#### 4.2 Aguardar Propagação
- **Tempo**: 1-48 horas
- **Teste**: Envie um email para suporte@atalho.me

### **5. Configurar Aliases de Email**

#### 5.1 Acessar Admin Console
1. **Acesse**: [admin.google.com](https://admin.google.com)
2. **Login**: suporte@atalho.me + sua senha

#### 5.2 Criar Alias noreply@atalho.me
1. **Vá em**: Usuários → Gerenciar usuários
2. **Clique** no usuário `suporte@atalho.me`
3. **Informações do usuário** → **Aliases de email**
4. **Adicionar**: `noreply@atalho.me`
5. **Salvar**

### **6. Configurar App Password para SMTP**

#### 6.1 Ativar 2FA (Obrigatório)
1. **Acesse**: [myaccount.google.com](https://myaccount.google.com)
2. **Login**: suporte@atalho.me
3. **Segurança** → **Verificação em duas etapas** → **Ativar**

#### 6.2 Gerar App Password
1. **Segurança** → **Senhas de app**
2. **Selecione app**: Email
3. **Selecione dispositivo**: Outro (personalizado)
4. **Nome**: `Atalho API SMTP`
5. **Gerar** → **Copie a senha** (16 caracteres)

### **7. Configurar Variáveis no Vercel**

#### 7.1 Acessar Vercel
1. **Acesse**: [vercel.com/dashboard](https://vercel.com/dashboard)
2. **Projeto**: Atalho
3. **Settings** → **Environment Variables**

#### 7.2 Adicionar Variáveis
```
GMAIL_USER = suporte@atalho.me
GMAIL_APP_PASSWORD = abcd efgh ijkl mnop (senha de 16 dígitos)
```

**IMPORTANTE**: Remova as variáveis antigas do SendGrid:
- `SENDGRID_API_KEY` (pode deletar)

### **8. Deploy e Teste**

#### 8.1 Fazer Deploy
```bash
git add .
git commit -m "feat: migrar para Google Workspace SMTP"
git push
```

#### 8.2 Testar Sistema
1. **Cadastro**: https://atalho.me/register.html
2. **Email enviado**: de noreply@atalho.me
3. **Resposta para**: suporte@atalho.me

## 🎉 **Resultado Final:**

### ✅ **O que você terá:**
- **suporte@atalho.me**: Caixa real com interface Gmail
- **noreply@atalho.me**: Alias para emails automáticos
- **Interface completa**: Gmail, Drive, Calendar, Meet
- **99.9% uptime**: Garantia do Google
- **Suporte 24/7**: Google Workspace
- **Emails ilimitados**: Sem limite de envio

### 📧 **Fluxo de Email:**
```
Sistema Atalho → Google SMTP → Envia de noreply@atalho.me → Usuário
Usuário responde → suporte@atalho.me → Sua caixa Gmail profissional
```

### 💰 **Custos:**
- **Google Workspace**: $14/mês
- **Cloudflare**: $0 (domínio já pago)
- **Total**: $14/mês para solução profissional completa

## 🆘 **Se Precisar de Ajuda:**

### **Suporte Google Workspace:**
- **Chat**: 24/7 em português
- **Telefone**: Disponível no plano Business
- **Email**: Suporte técnico incluído

### **Verificações Importantes:**
1. **DNS propagou?** Use [whatsmydns.net](https://whatsmydns.net)
2. **MX correto?** Use [mxtoolbox.com](https://mxtoolbox.com)
3. **Email chegando?** Teste envio para suporte@atalho.me

## 🎯 **Timeline Estimado:**
- **Configuração**: 30 minutos
- **Propagação DNS**: 1-24 horas
- **Teste completo**: No mesmo dia
- **Sistema funcionando**: Hoje mesmo!

**🚀 Pronto para começar? Este é o investimento que vai profissionalizar totalmente seu sistema de emails!** 