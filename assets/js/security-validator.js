// VALIDADOR DE ENTRADA E UX - ATALHO
// ==========================================
// ✅ Validações de UX e integridade básica
// ⚠️  NOTA: Segurança real deve ser implementada no servidor
// ==========================================

class SecurityValidator {
    constructor() {
        // Detectar tipo da página
        this.isRegistrationPage = window.location.pathname.includes('register.html');
        this.isPaymentPage = window.location.pathname.includes('comprar.html');
        this.isLoginPage = window.location.pathname.includes('login.html');
        
        // Inicializar proteções
        this.initializeValidations();
        this.setupCSRFProtection();
        this.setupClickjackingProtection();
    }

    // =====================================
    // 🔒 INICIALIZAÇÃO DAS VALIDAÇÕES
    // =====================================

    initializeValidations() {
        this.validatePageIntegrity();
        this.monitorDOMForBasicIntegrity();
        this.setupInputValidation();
        this.setupFormProtection();
    }

    // =====================================
    // 🛡️ PROTEÇÕES DE SEGURANÇA
    // =====================================

    setupCSRFProtection() {
        // Gerar token CSRF
        const csrfToken = this.generateCSRFToken();
        
        // Adicionar token a todos os forms
        document.querySelectorAll('form').forEach(form => {
            const tokenInput = document.createElement('input');
            tokenInput.type = 'hidden';
            tokenInput.name = 'csrf_token';
            tokenInput.value = csrfToken;
            form.appendChild(tokenInput);
        });
        
        // Adicionar token ao localStorage
        localStorage.setItem('csrf_token', csrfToken);
    }

    generateCSRFToken() {
        return Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    setupClickjackingProtection() {
        // Verificar se estamos em um iframe
        if (window !== window.top) {
            // Se estiver em um iframe não autorizado, redirecionar para a página principal
            const allowedParents = ['atalho.me'];
            try {
                const parentHost = new URL(document.referrer).host;
                if (!allowedParents.includes(parentHost)) {
                    window.top.location = window.location;
                }
            } catch (e) {
                window.top.location = window.location;
            }
        }
    }

    setupInputValidation() {
        // Adicionar validação em tempo real para campos sensíveis
        document.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', (e) => {
                const type = e.target.type || 'text';
                const value = e.target.value;
                
                if (!this.validateInput(value, type)) {
                    e.target.classList.add('invalid');
                    this.showInputError(e.target);
                } else {
                    e.target.classList.remove('invalid');
                    this.hideInputError(e.target);
                }
            });
        });
    }

    setupFormProtection() {
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', (e) => {
                // Prevenir múltiplos submits
                if (form.dataset.submitting === 'true') {
                    e.preventDefault();
                    return;
                }
                
                // Validar CSRF token
                const formToken = form.querySelector('input[name="csrf_token"]')?.value;
                const storedToken = localStorage.getItem('csrf_token');
                
                if (!formToken || formToken !== storedToken) {
                    e.preventDefault();
                    console.error('Erro de validação CSRF');
                    return;
                }
                
                // Marcar form como em submissão
                form.dataset.submitting = 'true';
                
                // Resetar após timeout
                setTimeout(() => {
                    form.dataset.submitting = 'false';
                }, 5000);
            });
        });
    }

    // =====================================
    // 🔍 VALIDAÇÃO DE ENTRADA
    // =====================================

    validateInput(input, type = 'text') {
        if (typeof input !== 'string') return false;
        
        const patterns = {
            email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            password: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/,
            name: /^[a-zA-ZÀ-ÿ\s'-]{2,100}$/,
            phone: /^\+?[\d\s-()]{8,20}$/,
            url: /^https:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?$/,
            number: /^\d+$/
        };
        
        // Validações específicas por tipo
        switch (type) {
            case 'email':
                return patterns.email.test(input) && input.length <= 255;
                
            case 'password':
                return patterns.password.test(input) && 
                       input.length >= 8 && 
                       input.length <= 128;
                
            case 'name':
                return patterns.name.test(input) && 
                       input.length >= 2 && 
                       input.length <= 100;
                
            case 'phone':
                return patterns.phone.test(input) && 
                       input.length >= 8 && 
                       input.length <= 20;
                
            case 'url':
                return patterns.url.test(input) && 
                       input.length <= 2048;
                
            case 'number':
                return patterns.number.test(input) && 
                       input.length <= 20;
                
            default:
                // Sanitização padrão para texto
                return !input.includes('<') && 
                       !input.includes('>') && 
                       !input.includes('javascript:') && 
                       !input.includes('data:') && 
                       !input.includes('vbscript:') && 
                       input.length <= 255;
        }
    }

    showInputError(input) {
        let errorMessage = 'Formato inválido';
        
        switch (input.type) {
            case 'email':
                errorMessage = 'Email inválido';
                break;
            case 'password':
                errorMessage = 'A senha deve ter pelo menos 8 caracteres, incluindo letras, números e caracteres especiais';
                break;
            case 'tel':
                errorMessage = 'Telefone inválido';
                break;
            case 'url':
                errorMessage = 'URL inválida';
                break;
        }
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'input-error';
        errorDiv.textContent = errorMessage;
        
        // Remover erro anterior se existir
        this.hideInputError(input);
        
        // Adicionar novo erro
        input.parentNode.insertBefore(errorDiv, input.nextSibling);
    }

    hideInputError(input) {
        const errorDiv = input.parentNode.querySelector('.input-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    // =====================================
    // 📝 VALIDAÇÃO DE FORMULÁRIOS
    // =====================================

    validateFormData(formData, requiredFields = []) {
        const errors = [];
        
        // Verificar campos obrigatórios
        requiredFields.forEach(field => {
            if (!formData[field] || formData[field].trim() === '') {
                errors.push(`Campo ${field} é obrigatório`);
            }
        });
        
        // Validar tipos específicos
        Object.entries(formData).forEach(([field, value]) => {
            if (value) {
                let type = 'text';
                
                if (field.includes('email')) type = 'email';
                if (field.includes('password')) type = 'password';
                if (field.includes('name')) type = 'name';
                if (field.includes('phone')) type = 'phone';
                if (field.includes('url')) type = 'url';
                
                if (!this.validateInput(value, type)) {
                    errors.push(`Campo ${field} contém valor inválido`);
                }
            }
        });
        
        return errors;
    }

    showValidationErrors(errors, containerId = 'validation-errors') {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (errors.length === 0) {
            container.style.display = 'none';
            return;
        }
        
        container.innerHTML = `
            <div class="alert alert-danger">
                <ul class="mb-0">
                    ${errors.map(error => `<li>${this.sanitizeHTML(error)}</li>`).join('')}
                </ul>
            </div>
        `;
        container.style.display = 'block';
    }

    // =====================================
    // 🔍 VALIDAÇÃO DE INTEGRIDADE
    // =====================================

    validatePageIntegrity() {
        // Elementos críticos específicos da página
        let criticalElements = ['script[src*="firebase"]'];
        
        if (this.isPaymentPage) {
            criticalElements = criticalElements.concat([
                'script[src*="mercadopago"]',
                '.payment-option'
            ]);
        } else if (this.isRegistrationPage) {
            criticalElements = criticalElements.concat([
                'form#customer-registration-form'
            ]);
        } else if (this.isLoginPage) {
            criticalElements = criticalElements.concat([
                'form#login-form'
            ]);
        }
        
        criticalElements.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            if (elements.length === 0) {
                console.warn(`Elemento crítico não encontrado: ${selector}`);
                this.handleIntegrityViolation();
            }
        });

        // Verificar integridade periodicamente
        setInterval(() => this.checkBasicDOMIntegrity(), 5000);
    }

    checkBasicDOMIntegrity() {
        if (this.isPaymentPage) {
            const paymentButtons = document.querySelectorAll('.payment-option');
            if (paymentButtons.length === 0) {
                this.handleIntegrityViolation();
            }
        }
        
        if (this.isRegistrationPage || this.isLoginPage) {
            const form = document.querySelector(
                this.isRegistrationPage ? '#customer-registration-form' : '#login-form'
            );
            if (!form) {
                this.handleIntegrityViolation();
            }
        }
    }

    handleIntegrityViolation() {
        // Registrar violação
        console.error('Violação de integridade detectada');
        
        // Tentar recuperar estado
        window.location.reload();
    }

    // =====================================
    // 🛡️ UTILITÁRIOS DE SEGURANÇA
    // =====================================

    sanitizeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    isAllowedScript(src) {
        const allowedDomains = [
            'firebase.googleapis.com',
            'www.gstatic.com',
            'sdk.mercadopago.com',
            'cdnjs.cloudflare.com',
            window.location.origin
        ];

        try {
            const url = new URL(src);
            return allowedDomains.some(domain => url.hostname.endsWith(domain));
        } catch {
            return false;
        }
    }

    // =====================================
    // 👁️ MONITORAMENTO DO DOM
    // =====================================

    monitorDOMForBasicIntegrity() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.tagName === 'SCRIPT') {
                            const src = node.src;
                            if (src && !this.isAllowedScript(src)) {
                                console.warn('Script não autorizado detectado:', src);
                                node.remove();
                            }
                        }
                    });
                }
            });
        });
        
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    // =====================================
    // 🔒 VALIDAÇÃO DE FORMULÁRIOS (UX)
    // =====================================

    validateFormSubmission(formData, formType) {
        if (formType === 'registration') {
            return this.validateFormData(formData, ['email', 'password', 'name']);
        }
        
        if (formType === 'login') {
            return this.validateFormData(formData, ['email', 'password']);
        }
        
        return [];
    }

    // =====================================
    // 🛡️ INTERFACE PÚBLICA PARA UX
    // =====================================

    validatePaymentForm(paymentData) {
        // Validação básica apenas para UX - segurança real é no servidor
        if (!paymentData || typeof paymentData !== 'object') {
            return { valid: false, errors: ['Dados de pagamento inválidos'] };
        }

        return { valid: true, errors: [] };
    }

    validateRegistrationForm(formData) {
        const errors = this.validateFormSubmission(formData, 'registration');
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    // =====================================
    // 📊 LOGGING SIMPLES
    // =====================================

    logEvent(eventType, details = {}) {
        // Log simples apenas para desenvolvimento/debug
        console.log(`📊 Evento: ${eventType}`, details);
    }
}

// Inicializar validador automaticamente
if (!window.securityValidator) {
    const securityValidator = new SecurityValidator();
    window.securityValidator = securityValidator;
    
    // Disponibilizar globalmente para uso em formulários
    window.SecurityValidator = SecurityValidator;
} else {
    console.log('📋 Security Validator já foi inicializado anteriormente');
}

console.log('📋 UX Validator inicializado'); 
console.log('📋 UX Validator inicializado'); 