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
        
        this.initializeValidations();
    }

    // =====================================
    // 🔒 INICIALIZAÇÃO DAS VALIDAÇÕES
    // =====================================

    initializeValidations() {
        // Validações básicas para melhorar UX
        this.validatePageIntegrity();
        this.monitorDOMForBasicIntegrity();
        
        console.log('🔒 Validações de UX ativadas');
    }

    // =====================================
    // 🔍 VALIDAÇÃO BÁSICA DE ENTRADA (UX)
    // =====================================

    validateInput(input, type = 'text') {
        if (typeof input !== 'string') return false;
        
        // Validações básicas para diferentes tipos
        switch (type) {
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(input) && input.length <= 255;
                
            case 'password':
                return input.length >= 8 && input.length <= 128;
                
            case 'name':
                // Permite letras, espaços, acentos, mas remove caracteres perigosos
                const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;
                return nameRegex.test(input) && input.length >= 2 && input.length <= 100;
                
            case 'phone':
                // Permite números, espaços, +, -, (, )
                const phoneRegex = /^[\d\s+()-]+$/;
                return phoneRegex.test(input) && input.length >= 8 && input.length <= 20;
                
            default:
                // Validação geral: sem caracteres perigosos
                return !input.includes('<') && !input.includes('>') && 
                       !input.includes('javascript:') && input.length <= 255;
        }
    }

    // =====================================
    // 📝 HELPERS PARA FORMULÁRIOS
    // =====================================

    validateFormData(formData, requiredFields = []) {
        const errors = [];
        
        // Verificar campos obrigatórios
        requiredFields.forEach(field => {
            if (!formData[field] || formData[field].trim() === '') {
                errors.push(`Campo ${field} é obrigatório`);
            }
        });
        
        // Validar tipos específicos se presentes
        if (formData.email && !this.validateInput(formData.email, 'email')) {
            errors.push('Formato de email inválido');
        }
        
        if (formData.password && !this.validateInput(formData.password, 'password')) {
            errors.push('Senha deve ter pelo menos 8 caracteres');
        }
        
        if (formData.name && !this.validateInput(formData.name, 'name')) {
            errors.push('Nome contém caracteres inválidos ou é muito curto');
        }
        
        if (formData.phone && !this.validateInput(formData.phone, 'phone')) {
            errors.push('Formato de telefone inválido');
        }
        
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
                    ${errors.map(error => `<li>${error}</li>`).join('')}
                </ul>
            </div>
        `;
        container.style.display = 'block';
    }

    // =====================================
    // 🔍 VALIDAÇÃO BÁSICA DE INTEGRIDADE
    // =====================================

    validatePageIntegrity() {
        // Detectar que tipo de página estamos
        const isPaymentPage = window.location.pathname.includes('comprar.html');
        const isRegistrationPage = window.location.pathname.includes('register.html');
        
        // Elementos críticos específicos da página
        let criticalElements = [];
        
        if (isPaymentPage) {
            criticalElements = [
                'script[src*="firebase"]',
                '.payment-option'
            ];
        } else if (isRegistrationPage) {
            criticalElements = [
                'script[src*="firebase"]',
                'form#customer-registration-form'
            ];
        } else {
            // Página genérica - verificações mínimas
            criticalElements = [
                'script[src*="firebase"]'
            ];
        }
        
        const self = this;

        criticalElements.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            if (elements.length === 0) {
                console.warn(`⚠️ Elemento crítico não encontrado: ${selector}`);
            }
        });

        // Verificar integridade do DOM ocasionalmente
        setTimeout(() => {
            self.checkBasicDOMIntegrity();
        }, 5000);
    }

    checkBasicDOMIntegrity() {
        // Verificar se elementos críticos ainda existem
        if (this.isPaymentPage) {
            const paymentButtons = document.querySelectorAll('.payment-option');
            if (paymentButtons.length === 0) {
                console.warn('⚠️ Botões de pagamento foram removidos');
            }
        }
        
        if (this.isRegistrationPage) {
            const registrationForm = document.querySelector('#customer-registration-form');
            if (!registrationForm) {
                console.warn('⚠️ Formulário de registro foi removido');
            }
        }
    }

    isAllowedScript(src) {
        const allowedDomains = [
            'firebase.googleapis.com',
            'www.gstatic.com',
            'sdk.mercadopago.com',
            'cdnjs.cloudflare.com',
            window.location.origin
        ];

        return allowedDomains.some(domain => src.includes(domain));
    }

    // =====================================
    // 👁️ MONITORAMENTO BÁSICO DO DOM
    // =====================================

    monitorDOMForBasicIntegrity() {
        const self = this;
        
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                try {
                    // Detectar apenas adição de scripts externos suspeitos
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SCRIPT') {
                                if (node.src && !self.isAllowedScript(node.src)) {
                                    console.warn('⚠️ Script não autorizado detectado:', node.src);
                                    // Apenas log, não remover (pode quebrar funcionalidades)
                                }
                            }
                        });
                    }
                } catch (error) {
                    // Silenciar erros para não afetar UX
                }
            });
        });

        observer.observe(document.body, {
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

    validatePaymentAttempt(methodOrData, userData = {}) {
        // Suporte aos dois formatos: novo (method, userData) e antigo (objeto completo)
        let method, data;
        
        if (typeof methodOrData === 'string') {
            // Formato novo: validatePaymentAttempt(method, userData)
            method = methodOrData;
            data = userData;
        } else if (typeof methodOrData === 'object' && methodOrData.method) {
            // Formato antigo: validatePaymentAttempt({ method, userEmail, timestamp })
            method = methodOrData.method;
            data = methodOrData;
        } else {
            console.log('🚫 Parâmetros inválidos para validatePaymentAttempt:', methodOrData);
            return { valid: false, reason: 'invalid_params' };
        }
        
        const validMethods = ['pix', 'stripe', 'cartao', 'paypal'];
        
        if (!validMethods.includes(method)) {
            console.log('🚫 Método de pagamento inválido:', method);
            return { valid: false, reason: 'invalid_method' };
        }

        // Log da tentativa para debug
        console.log(`💳 Validando tentativa de pagamento: ${method}`, data);
        
        return { valid: true };
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