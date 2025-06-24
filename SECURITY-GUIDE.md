# 🔒 GUIA DE SEGURANÇA - ATALHO

## ⚡ IMPLEMENTAÇÃO URGENTE

### 1. 🚨 CONFIGURAÇÃO DO SERVIDOR SEGURO

**PASSO 1: Instalar dependências de segurança**
```bash
cd atalho-backend
npm install helmet express-rate-limit express-validator dotenv bcrypt express-mongo-sanitize hpp
```

**PASSO 2: Criar arquivo .env (CRÍTICO)**
```bash
# Copie o .env.example e configure:
cp .env.example .env
```

Edite o `.env` com suas credenciais REAIS:
```env
MP_ACCESS_TOKEN=SUA_CHAVE_REAL_AQUI
ALLOWED_ORIGINS=https://seudominio.com,https://www.seudominio.com
FORCE_HTTPS=true
```

**PASSO 3: Usar servidor seguro**
```bash
# Substituir server.js por server-secure.js
mv server.js server-old.js
mv server-secure.js server.js
```

### 2. 🔐 CONFIGURAÇÃO HTTPS/SSL

**OPÇÃO A: Cloudflare (Recomendado)**
- Configure seu domínio no Cloudflare
- Ative SSL/TLS Full (Strict)
- Ative "Always Use HTTPS"

**OPÇÃO B: Let's Encrypt**
```bash
sudo apt install certbot
sudo certbot --nginx -d seudominio.com
```

**OPÇÃO C: Reverse Proxy (Nginx)**
```nginx
server {
    listen 443 ssl;
    server_name seudominio.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🛡️ PROTEÇÕES IMPLEMENTADAS

### ✅ BACKEND (server-secure.js)

1. **Helmet** - Headers de segurança
   - CSP (Content Security Policy)
   - HSTS (HTTP Strict Transport Security)
   - X-Frame-Options
   - X-Content-Type-Options

2. **Rate Limiting**
   - 100 requests/15min por IP (geral)
   - 10 requests/15min para pagamentos
   - Bloqueio automático de IPs suspeitos

3. **CORS Restritivo**
   - Apenas domínios autorizados
   - Headers controlados
   - Métodos limitados

4. **Validação de Entrada**
   - Express-validator para todos os inputs
   - Sanitização automática
   - Verificação de tipos

5. **Proteção contra Injeção**
   - NoSQL injection (mongo-sanitize)
   - HTTP Parameter Pollution
   - XSS protection

6. **Logging de Segurança**
   - Monitoramento de tentativas suspeitas
   - IPs bloqueados
   - Eventos de segurança

### ✅ FRONTEND (security-validator.js)

1. **Proteção DevTools**
   - Detecção de abertura
   - Bloqueio de F12, Ctrl+Shift+I
   - Desabilitação do menu de contexto

2. **Monitoramento DOM**
   - Detecção de scripts maliciosos
   - Proteção contra injeção
   - Verificação de integridade

3. **Validação de Formulários**
   - Verificação rigorosa de senhas
   - Detecção de tentativas de injeção
   - Rate limiting client-side

4. **Proteção CSRF**
   - Tokens únicos por sessão
   - Validação automática

## 🚨 VULNERABILIDADES CORRIGIDAS

### ❌ ANTES (CRÍTICO)
- Token exposto no código
- CORS aberto para qualquer origem
- Ausência de rate limiting
- Sem validação de entrada
- Headers de segurança ausentes
- Logs verbosos com dados sensíveis

### ✅ DEPOIS (SEGURO)
- Credenciais em variáveis de ambiente
- CORS restrito a domínios específicos
- Rate limiting rigoroso
- Validação completa de entrada
- Headers de segurança implementados
- Logs sanitizados

## 🔍 CHECKLIST DE SEGURANÇA

### 📋 PRÉ-PRODUÇÃO

- [ ] Arquivo .env configurado com credenciais reais
- [ ] HTTPS ativado e funcionando
- [ ] CORS configurado apenas para domínios de produção
- [ ] Rate limiting testado
- [ ] Validação de formulários funcionando
- [ ] Logs de segurança ativos
- [ ] Backup das configurações

### 📋 PÓS-PRODUÇÃO

- [ ] Monitorar logs de segurança diariamente
- [ ] Verificar tentativas de acesso suspeitas
- [ ] Atualizar dependências mensalmente
- [ ] Revisar configurações de CORS
- [ ] Testar endpoints de segurança
- [ ] Backup regular do sistema

## 🚀 COMANDOS DE PRODUÇÃO

### Iniciar servidor seguro:
```bash
cd atalho-backend
NODE_ENV=production npm start
```

### Verificar logs de segurança:
```bash
tail -f logs/security.log
```

### Testar endpoints:
```bash
# Teste de rate limiting
for i in {1..20}; do curl -X POST https://seudominio.com/api/create-pix; done

# Teste de CORS
curl -H "Origin: https://site-malicioso.com" https://seudominio.com/api/test
```

## 🔧 MANUTENÇÃO DE SEGURANÇA

### Semanal:
- Revisar logs de segurança
- Verificar tentativas de acesso bloqueadas
- Monitorar performance do rate limiting

### Mensal:
- Atualizar dependências: `npm audit fix`
- Revisar configurações de CORS
- Testar todos os endpoints de segurança

### Trimestral:
- Auditoria completa de segurança
- Penetration testing básico
- Revisão de credenciais e tokens

## 🆘 RESPOSTA A INCIDENTES

### Se detectar ataque:
1. **Bloquear IP imediatamente**
2. **Revisar logs das últimas 24h**
3. **Verificar integridade dos dados**
4. **Notificar equipe técnica**
5. **Documentar o incidente**

### Comandos de emergência:
```bash
# Bloquear IP específico (adicionar ao firewall)
sudo ufw deny from IP_SUSPEITO

# Reiniciar servidor com configurações mínimas
NODE_ENV=production RATE_LIMIT_MAX_REQUESTS=10 npm start

# Verificar conexões ativas
netstat -an | grep :3000
```

## 📞 CONTATOS DE EMERGÊNCIA

- **Equipe Técnica**: [seu-email]
- **Provedor de Hospedagem**: [contato-provedor]
- **Cloudflare Support**: [caso aplicável]

---

## ⚠️ IMPORTANTE

Este guia implementa **segurança de nível empresarial**. Todas as proteções são **OBRIGATÓRIAS** para produção. Não pule nenhuma etapa!

**Lembre-se**: Segurança não é opcional, é essencial! 🔐 