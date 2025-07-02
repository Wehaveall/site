# Relatório Detalhado de Segurança - Site Atalho

**Data da Análise:** 25 de Julho de 2024
**Analisado por:** Gemini Security Agent

## Sumário Executivo

A análise de segurança do site "Atalho" revelou múltiplas vulnerabilidades críticas e de alta gravidade que expõem a plataforma a riscos significativos, incluindo fraude financeira, roubo de contas de clientes, e ataques de negação de serviço. As falhas mais graves residem na lógica de negócios do fluxo de pagamento e registro, bem como na configuração de regras de acesso ao banco de dados.

É de **extrema importância** que as vulnerabilidades críticas e altas sejam corrigidas com prioridade máxima para proteger os dados dos usuários, a integridade da plataforma e prevenir perdas financeiras.

## Tabela de Vulnerabilidades

| ID | Severidade | Título da Vulnerabilidade | Arquivo(s) Chave Afetado(s) |
| :--- | :--- | :--- | :--- |
| **VS-001** | **<font color="red">Crítica</font>** | Bypass de Regras de Segurança do Firestore | `firestore.rules` |
| **VS-002** | **<font color="red">Alta</font>** | Endpoint de Criação de Pagamento Não Autenticado | `api/create-pix.js` |
| **VS-003** | **<font color="red">Alta</font>** | Roubo de Licença via Token de Registro Previsível | `assets/js/pix-modal.js` |
| **VS-004** | **<font color="red">Alta</font>** | Cross-Site Scripting (XSS) no Modal de Pagamento PIX | `assets/js/pix-modal.js` |
| **VS-005** | **<font color="orange">Média</font>** | Política de CORS Insegura na Configuração do Firebase | `api/firebase-config.js` |
| **VS-006** | **<font color="gold">Baixa</font>** | Rate Limiting Ineficaz em Ambiente Serverless | `api/create-pix.js` |
| **VS-007** | **<font color="gold">Baixa</font>** | Proteção Fraca Contra XSS na Criação de Usuário | `api/create-user.js` |
| **VS-008** | **<font color="gold">Baixa</font>** | Vazamento de Informações Sensíveis nos Logs | `api/firebase-config.js` |

---

## Detalhes das Vulnerabilidades

### VS-001: Bypass de Regras de Segurança do Firestore (Crítica)
- **Descrição:** O arquivo `firestore.rules` contém duas regras `allow write` conflitantes para a coleção `users`. Uma regra permissiva (`allow write: if request.auth.uid == userId`) anula completamente a segunda regra, que deveria validar os dados através da função `validateUserData`.
- **Impacto:** Qualquer usuário autenticado pode escrever dados arbitrários em seu próprio documento de usuário, ignorando todas as validações de segurança (como formato de e-mail, campos obrigatórios, etc). Isso pode levar à corrupção de dados, escalada de privilégios se a lógica de negócio confiar nesses dados, e quebra geral da integridade do sistema.
- **Recomendação:** Combine as regras de escrita em uma única declaração para `create` e `update`, garantindo que a função `validateUserData` seja sempre executada.
  ```diff
  match /users/{userId} {
    allow read: if request.auth != null && request.auth.uid == userId;
  - allow write: if request.auth != null && request.auth.uid == userId;
  - allow write: if request.auth != null 
  -                && request.auth.uid == userId
  -                && validateUserData(request.resource.data);
  + allow create, update: if request.auth != null 
  +                   && request.auth.uid == userId
  +                   && validateUserData(request.resource.data);
  }
  ```

### VS-002: Endpoint de Criação de Pagamento Não Autenticado (Alta)
- **Descrição:** O endpoint da API em `/api/create-pix.js` não implementa nenhuma verificação de autenticação ou autorização.
- **Impacto:** Qualquer pessoa na internet pode chamar este endpoint para gerar uma cobrança PIX. Isso pode ser abusado por um atacante para (1) gerar um grande volume de requisições, potencialmente incorrendo em custos de API ou fazendo a conta ser bloqueada pelo MercadoPago (Negação de Serviço), e (2) criar "pagamentos órfãos" que não podem ser facilmente associados a um usuário, causando problemas de suporte e experiência do cliente.
- **Recomendação:** Proteja o endpoint. Ele deve extrair um token de autenticação (ex: JWT) do header `Authorization`, verificar sua validade e usar o `uid` do token para identificar o usuário, ignorando quaisquer dados de usuário enviados no corpo da requisição.

### VS-003: Roubo de Licença via Token de Registro Previsível (Alta)
- **Descrição:** Após um pagamento ser confirmado, um `registration_token` é gerado para que o usuário crie sua conta. Este token é gerado com `Date.now()` e uma string aleatória curta, tornando-o previsível e passível de adivinhação.
- **Impacto:** Um atacante que consiga adivinhar ou enumerar um par válido de `paymentId` e `registration_token` pode usar o link de registro para criar uma conta para si mesmo, efetivamente roubando a licença que outro usuário pagou.
- **Recomendação:** O token de registro deve ser uma string longa, aleatória e criptograficamente segura. Use o módulo `crypto` do Node.js para gerar pelo menos 32 bytes aleatórios e codificá-los em hexadecimal.
  ```javascript
  // Exemplo de token seguro em um ambiente Node.js
  const crypto = require('crypto');
  const secureToken = crypto.randomBytes(32).toString('hex');
  ```

### VS-004: Cross-Site Scripting (XSS) no Modal de Pagamento PIX (Alta)
- **Descrição:** O conteúdo da variável `qrCodeText`, recebida de uma API externa, é inserido diretamente em um manipulador `onclick` no `assets/js/pix-modal.js` sem qualquer tipo de codificação ou escape.
- **Impacto:** Se um invasor puder manipular a resposta da API do provedor de pagamento ou se o `qrCodeText` contiver caracteres especiais (como `'`), ele pode injetar código JavaScript arbitrário que será executado no navegador do usuário.
- **Recomendação:** Nunca insira dados dinâmicos diretamente em manipuladores de eventos no HTML. Em vez disso, adicione o listener programaticamente em JavaScript e passe o dado de forma segura.
  ```javascript
  // Ruim:
  // button.innerHTML = `<button onclick="myFunc('${data}')">Click</button>`;

  // Bom:
  const button = document.getElementById('copy-pix-button');
  button.addEventListener('click', () => {
    navigator.clipboard.writeText(qrCodeText).then(() => {
      button.textContent = 'Código Copiado!';
    });
  });
  ```

### VS-005: Política de CORS Insegura na Configuração do Firebase (Média)
- **Descrição:** O endpoint `/api/firebase-config.js` responde com o header `Access-Control-Allow-Origin: *`.
- **Impacto:** Permite que qualquer site na internet solicite e leia a configuração do seu projeto Firebase. Embora essas chaves sejam para o lado do cliente, isso facilita a vida de um atacante e remove uma camada de proteção por obscuridade.
- **Recomendação:** Restrinja a política de CORS para aceitar apenas o domínio do seu site, como já é feito em outros endpoints.

### Vulnerabilidades de Baixa Severidade (VS-006 a VS-008)
- **VS-006 (Rate Limiting Ineficaz):** O limitador de requisições é baseado na memória da instância da função e não funcionará em um ambiente serverless distribuído. **Solução:** Use um armazenamento centralizado (como Redis ou Firestore) para contagem.
- **VS-007 (Proteção Fraca contra XSS):** A função `sanitizeInput` em `api/create-user.js` usa uma blacklist, que é uma forma fraca de prevenção contra XSS. **Solução:** Use uma biblioteca de sanitização robusta e bem testada (como `dompurify` no frontend ou uma equivalente no backend) ou garanta que os dados sejam sempre renderizados como texto e não como HTML.
- **VS-008 (Vazamento de Informações nos Logs):** As funções serverless registram chaves de configuração e variáveis de ambiente, que podem ser expostas se os logs forem comprometidos. **Solução:** Remova ou mascare dados sensíveis dos logs de produção.

## Próximos Passos
1.  **Prioridade 1:** Corrigir as vulnerabilidades **Críticas** e **Altas** (VS-001, VS-002, VS-003, VS-004).
2.  **Prioridade 2:** Corrigir a vulnerabilidade **Média** (VS-005).
3.  **Prioridade 3:** Endereçar as vulnerabilidades de severidade **Baixa** como parte do ciclo regular de desenvolvimento para melhorar a postura de segurança geral da aplicação. 