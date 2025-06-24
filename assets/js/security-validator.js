// VALIDADOR DE SEGURANÇA FRONTEND - ATALHO
// ==========================================
// ✅ Proteções contra manipulação client-side
// ==========================================

class SecurityValidator {
    constructor() {
        this.maxAttempts = 5;
        this.attempts = new Map();
        this.blockedIPs = new Set();
        this.initializeProtections();
    }

    // =====================================
    // 🔒 INICIALIZAÇÃO DAS PROTEÇÕES
    // =====================================

    initializeProtections() {
        this.preventDevToolsManipulation();
        this.preventConsoleManipulation();
        this.validatePageIntegrity();
        this.setupCSRFProtection();
        this.monitorDOMChanges();
    }

    // =====================================
    // 🛡️ PROTEÇÃO CONTRA DEV TOOLS
    // =====================================

    preventDevToolsManipulation() {
        // Detectar abertura do DevTools
        let devtools = {
            open: false,
            orientation: null
        };

        const threshold = 160;

        setInterval(() => {
            if (window.outerHeight - window.innerHeight > threshold || 
                window.outerWidth - window.innerWidth > threshold) {
                if (!devtools.open) {
                    devtools.open = true;
                    console.warn('🚨 DevTools detectado - Monitoramento ativo');
                    this.logSecurityEvent('devtools_opened');
                }
            } else {
                devtools.open = false;
            }
        }, 500);

        // Bloquear F12, Ctrl+Shift+I, etc.
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F12' || 
                (e.ctrlKey && e.shiftKey && e.key === 'I') ||
                (e.ctrlKey && e.shiftKey && e.key === 'C') ||
                (e.ctrlKey && e.key === 'U')) {
                e.preventDefault();
                this.logSecurityEvent('devtools_attempt');
                return false;
            }
        });

        // Bloquear menu de contexto
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.logSecurityEvent('context_menu_attempt');
        });
    }

    // =====================================
    // 🔐 PROTEÇÃO DO CONSOLE
    // =====================================

    preventConsoleManipulation() {
        // Sobrescrever console methods críticos
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;

        console.log = (...args) => {
            this.logSecurityEvent('console_access');
            return originalLog.apply(console, args);
        };

        // Detectar tentativas de execução de código no console
        Object.defineProperty(window, 'console', {
            get() {
                this.logSecurityEvent('console_property_access');
                return console;
            },
            set() {
                this.logSecurityEvent('console_override_attempt');
            }
        });
    }

    // =====================================
    // 🔍 VALIDAÇÃO DE INTEGRIDADE
    // =====================================

    validatePageIntegrity() {
        // Verificar se scripts críticos não foram modificados
        const criticalElements = [
            'script[src*="firebase"]',
            'script[src*="mercadopago"]',
            'form#customer-registration-form',
            '.payment-option'
        ];

        criticalElements.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            if (elements.length === 0) {
                this.logSecurityEvent('critical_element_missing', { selector });
            }
        });

        // Verificar integridade do DOM a cada 30 segundos
        setInterval(() => {
            this.checkDOMIntegrity();
        }, 30000);
    }

    checkDOMIntegrity() {
        // Verificar se elementos críticos ainda existem
        const paymentButtons = document.querySelectorAll('.payment-option');
        const forms = document.querySelectorAll('form');
        
        if (paymentButtons.length === 0) {
            this.logSecurityEvent('payment_buttons_removed');
            this.blockUserActions('Elementos críticos foram removidos');
        }

        // Verificar se há scripts maliciosos injetados
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
            if (script.src && !this.isAllowedScript(script.src)) {
                this.logSecurityEvent('unauthorized_script', { src: script.src });
                script.remove();
            }
        });
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
    // 🛡️ PROTEÇÃO CSRF
    // =====================================

    setupCSRFProtection() {
        // Gerar token CSRF único para a sessão
        this.csrfToken = this.generateCSRFToken();
        
        // Adicionar token a todas as requisições
        const originalFetch = window.fetch;
        window.fetch = async (url, options = {}) => {
            if (options.method && options.method.toUpperCase() !== 'GET') {
                options.headers = {
                    ...options.headers,
                    'X-CSRF-Token': this.csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                };
            }
            return originalFetch(url, options);
        };
    }

    generateCSRFToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    // =====================================
    // 👁️ MONITORAMENTO DE MUDANÇAS NO DOM
    // =====================================

    monitorDOMChanges() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // Detectar injeção de scripts maliciosos
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.tagName === 'SCRIPT') {
                                this.validateAddedScript(node);
                            }
                            
                            // Verificar se há tentativas de modificar formulários
                            if (node.tagName === 'FORM' || node.querySelector('form')) {
                                this.logSecurityEvent('form_injection_attempt');
                            }
                        }
                    });
                }

                // Detectar modificações em atributos críticos
                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    if (target.classList.contains('payment-option') || 
                        target.tagName === 'FORM') {
                        this.logSecurityEvent('critical_attribute_modified', {
                            element: target.tagName,
                            attribute: mutation.attributeName
                        });
                    }
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['action', 'method', 'src', 'href', 'onclick']
        });
    }

    validateAddedScript(scriptElement) {
        const src = scriptElement.src;
        const content = scriptElement.textContent;

        // Verificar se é um script permitido
        if (src && !this.isAllowedScript(src)) {
            this.logSecurityEvent('malicious_script_blocked', { src });
            scriptElement.remove();
            return;
        }

        // Verificar conteúdo suspeito
        const suspiciousPatterns = [
            /eval\s*\(/i,
            /document\.write/i,
            /innerHTML\s*=/i,
            /window\.location/i,
            /bitcoin|crypto|wallet/i
        ];

        if (suspiciousPatterns.some(pattern => pattern.test(content))) {
            this.logSecurityEvent('suspicious_script_content', { content: content.substring(0, 100) });
            scriptElement.remove();
        }
    }

    // =====================================
    // 🔒 VALIDAÇÃO DE FORMULÁRIOS
    // =====================================

    validateFormSubmission(formData, formType) {
        const violations = [];

        if (formType === 'registration') {
            // Validar email
            if (!this.isValidEmail(formData.email)) {
                violations.push('email_invalid');
            }

            // Validar senha
            if (!this.isValidPassword(formData.password)) {
                violations.push('password_weak');
            }

            // Verificar se não há tentativas de injeção
            Object.values(formData).forEach(value => {
                if (this.containsSuspiciousContent(value)) {
                    violations.push('injection_attempt');
                }
            });
        }

        if (violations.length > 0) {
            this.logSecurityEvent('form_validation_failed', { violations });
            return false;
        }

        return true;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) && email.length <= 254;
    }

    isValidPassword(password) {
        return password.length >= 8 &&
               /[A-Z]/.test(password) &&
               /[0-9]/.test(password) &&
               /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
    }

    containsSuspiciousContent(value) {
        const suspiciousPatterns = [
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /eval\s*\(/i,
            /document\./i,
            /window\./i
        ];

        return suspiciousPatterns.some(pattern => pattern.test(value));
    }

    // =====================================
    // 📊 LOGGING E MONITORAMENTO
    // =====================================

    logSecurityEvent(eventType, details = {}) {
        const event = {
            type: eventType,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            details
        };

        console.warn('🚨 Evento de Segurança:', event);

        // Enviar para servidor (implementar se necessário)
        // this.sendSecurityEvent(event);

        // Incrementar contador de tentativas suspeitas
        const key = `${eventType}_${Date.now()}`;
        this.attempts.set(key, event);

        // Limpar eventos antigos
        setTimeout(() => {
            this.attempts.delete(key);
        }, 300000); // 5 minutos
    }

    blockUserActions(reason) {
        console.error('🚫 Ações bloqueadas:', reason);
        
        // Desabilitar todos os botões de pagamento
        document.querySelectorAll('.payment-option').forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
        });

        // Mostrar mensagem de erro
        alert('Por motivos de segurança, as ações foram temporariamente bloqueadas. Recarregue a página.');
    }

    // =====================================
    // 🔍 VERIFICAÇÃO DE RATE LIMITING
    // =====================================

    checkRateLimit(action) {
        const now = Date.now();
        const key = `${action}_${Math.floor(now / 60000)}`; // Por minuto
        
        const count = this.attempts.get(key) || 0;
        if (count >= this.maxAttempts) {
            this.logSecurityEvent('rate_limit_exceeded', { action });
            return false;
        }

        this.attempts.set(key, count + 1);
        return true;
    }

    // =====================================
    // 🛡️ INTERFACE PÚBLICA
    // =====================================

    validatePaymentAttempt(paymentData) {
        // Verificar rate limiting
        if (!this.checkRateLimit('payment_attempt')) {
            return { valid: false, reason: 'rate_limit' };
        }

        // Validar dados
        if (this.containsSuspiciousContent(JSON.stringify(paymentData))) {
            this.logSecurityEvent('payment_data_suspicious');
            return { valid: false, reason: 'suspicious_data' };
        }

        return { valid: true };
    }

    validateRegistrationAttempt(formData) {
        return this.validateFormSubmission(formData, 'registration');
    }
}

// Inicializar validador de segurança
const securityValidator = new SecurityValidator();

// Exportar para uso global
window.SecurityValidator = SecurityValidator;
window.securityValidator = securityValidator;

console.log('🔒 Sistema de segurança frontend inicializado'); 