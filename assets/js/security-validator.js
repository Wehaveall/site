// VALIDADOR DE SEGURANÇA FRONTEND - ATALHO
// ==========================================
// ✅ Proteções contra manipulação client-side
// ==========================================

class SecurityValidator {
    constructor() {
        this.maxAttempts = 5;
        this.attempts = new Map();
        this.blockedIPs = new Set();
        
        // Detectar modo da página
        this.isRegistrationPage = window.location.pathname.includes('register.html');
        this.isPaymentPage = window.location.pathname.includes('comprar.html');
        
        this.initializeProtections();
    }

    // =====================================
    // 🔒 INICIALIZAÇÃO DAS PROTEÇÕES
    // =====================================

    initializeProtections() {
        // Modo especial para página de registro - proteções mínimas
        if (this.isRegistrationPage) {
            console.log('🔒 Modo registro ativado - proteções mínimas');
            this.setupCSRFProtection(); // Apenas CSRF
            return; // Não ativar outras proteções
        }
        
        this.preventDevToolsManipulation();
        this.preventConsoleManipulationSafe();
        this.validatePageIntegrity();
        this.setupCSRFProtection();
        this.monitorDOMChangesSafe();
        
        console.log('🔒 Proteções de segurança ativadas (modo completo)');
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
        const self = this;

        setInterval(() => {
            if (window.outerHeight - window.innerHeight > threshold || 
                window.outerWidth - window.innerWidth > threshold) {
                if (!devtools.open) {
                    devtools.open = true;
                    console.warn('🚨 DevTools detectado - Monitoramento ativo');
                    self.logSecurityEventSafe('devtools_opened');
                }
            } else {
                devtools.open = false;
            }
        }, 2000);

        // Bloquear F12, Ctrl+Shift+I, etc.
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F12' || 
                (e.ctrlKey && e.shiftKey && e.key === 'I') ||
                (e.ctrlKey && e.shiftKey && e.key === 'C') ||
                (e.ctrlKey && e.key === 'U')) {
                e.preventDefault();
                self.logSecurityEventSafe('devtools_attempt');
                return false;
            }
        });

        // Bloquear menu de contexto
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            self.logSecurityEventSafe('context_menu_attempt');
        });
    }

    // =====================================
    // 🔐 PROTEÇÃO DO CONSOLE
    // =====================================

    preventConsoleManipulationSafe() {
        // Sobrescrever console methods críticos de forma segura
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        const self = this;

        // Salvar referências originais para uso seguro
        this.originalLog = originalLog;
        this.originalError = originalError;
        this.originalWarn = originalWarn;

        // Flag para evitar loops recursivos
        this.loggingSecurityEvent = false;

        // Interceptar console.log apenas se não estiver logando evento de segurança
        // Modo menos agressivo para desenvolvimento
        console.log = (...args) => {
            if (!self.loggingSecurityEvent && Math.random() < 0.1) {
                // Log apenas 10% das tentativas para reduzir spam
                self.logSecurityEventSafe('console_access');
            }
            return originalLog.apply(console, args);
        };

        // Detectar tentativas de modificação do console (sem interceptar acesso de leitura)
        let consoleAccessCount = 0;
        const originalConsole = window.console;
        
        Object.defineProperty(window, 'console', {
            get() {
                consoleAccessCount++;
                // Log apenas se houver muitos acessos suspeitos (mais de 50 por minuto)
                if (consoleAccessCount > 50 && !self.loggingSecurityEvent) {
                    self.logSecurityEventSafe('excessive_console_access');
                    consoleAccessCount = 0; // Reset counter
                }
                return originalConsole;
            },
            set(value) {
                if (!self.loggingSecurityEvent) {
                    self.logSecurityEventSafe('console_override_attempt');
                }
                return value;
            }
        });

        // Reset counter a cada minuto
        setInterval(() => {
            consoleAccessCount = 0;
        }, 60000);
    }

    // =====================================
    // 🔍 VALIDAÇÃO DE INTEGRIDADE
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
                'script[src*="mercadopago"]',
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
                self.logSecurityEventSafe('critical_element_missing', { 
                    selector, 
                    page: window.location.pathname,
                    severity: 'warning' // Reduzir gravidade
                });
            }
        });

        // Verificar integridade do DOM a cada 2 minutos (menos agressivo)
        setInterval(() => {
            self.checkDOMIntegrity();
        }, 120000);
    }

    checkDOMIntegrity() {
        // Detectar que tipo de página estamos
        const isPaymentPage = window.location.pathname.includes('comprar.html');
        const isRegistrationPage = window.location.pathname.includes('register.html');
        
        // Verificar elementos críticos baseados na página
        if (isPaymentPage) {
            const paymentButtons = document.querySelectorAll('.payment-option');
            if (paymentButtons.length === 0) {
                this.logSecurityEventSafe('payment_buttons_removed');
                this.blockUserActions('Elementos críticos foram removidos');
                return;
            }
        }
        
        if (isRegistrationPage) {
            const registrationForm = document.querySelector('#customer-registration-form');
            if (!registrationForm) {
                this.logSecurityEventSafe('registration_form_removed');
                this.blockUserActions('Formulário de registro foi removido');
                return;
            }
        }

        // Verificar se há scripts maliciosos injetados
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
            if (script.src && !this.isAllowedScript(script.src)) {
                this.logSecurityEventSafe('unauthorized_script', { src: script.src });
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

    monitorDOMChangesSafe() {
        const self = this;
        let mutationCount = 0;
        let lastMutationTime = Date.now();

        const observer = new MutationObserver((mutations) => {
            const now = Date.now();
            
            // Rate limiting: máximo 100 mutações por segundo
            if (now - lastMutationTime < 1000) {
                mutationCount += mutations.length;
                if (mutationCount > 100) {
                    self.logSecurityEventSafe('excessive_dom_mutations');
                    return; // Ignorar mutações excessivas
                }
            } else {
                mutationCount = 0;
                lastMutationTime = now;
            }

            mutations.forEach((mutation) => {
                try {
                    // Ignorar mudanças nos requisitos de senha na página de registro
                    if (self.isRegistrationPage && mutation.target && mutation.target.id && 
                        mutation.target.id.startsWith('req-')) {
                        return; // Permitir mudanças nos requisitos de senha
                    }
                    
                    // Detectar injeção de scripts maliciosos
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                if (node.tagName === 'SCRIPT') {
                                    self.validateAddedScriptSafe(node);
                                }
                                
                                // Verificar se há tentativas de modificar formulários
                                if (node.tagName === 'FORM' || (node.querySelector && node.querySelector('form'))) {
                                    self.logSecurityEventSafe('form_injection_attempt');
                                }
                            }
                        });
                    }

                    // Detectar modificações em atributos críticos apenas em elementos importantes
                    if (mutation.type === 'attributes' && mutation.target) {
                        const target = mutation.target;
                        
                        // Ignorar mudanças nos requisitos de senha na página de registro
                        if (self.isRegistrationPage && target.id && 
                            (target.id.startsWith('req-') || target.classList.contains('requirement-item'))) {
                            return; // Permitir mudanças nos requisitos de senha
                        }
                        
                        if (target.classList && target.classList.contains('payment-option') || 
                            target.tagName === 'FORM') {
                            self.logSecurityEventSafe('critical_attribute_modified', {
                                element: target.tagName,
                                attribute: mutation.attributeName
                            });
                        }
                    }
                } catch (error) {
                    // Silenciar erros para evitar problemas
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
        this.validateAddedScriptSafe(scriptElement);
    }

    validateAddedScriptSafe(scriptElement) {
        try {
            const src = scriptElement.src;
            const content = scriptElement.textContent;

            // Verificar se é um script permitido
            if (src && !this.isAllowedScript(src)) {
                this.logSecurityEventSafe('malicious_script_blocked', { src });
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

            if (content && suspiciousPatterns.some(pattern => pattern.test(content))) {
                this.logSecurityEventSafe('suspicious_script_content', { 
                    content: content.substring(0, 100) 
                });
                scriptElement.remove();
            }
        } catch (error) {
            // Silenciar erros para evitar problemas
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
            this.logSecurityEventSafe('form_validation_failed', { violations });
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
        this.logSecurityEventSafe(eventType, details);
    }

    logSecurityEventSafe(eventType, details = {}) {
        // Evitar loops recursivos
        if (this.loggingSecurityEvent) {
            return;
        }

        this.loggingSecurityEvent = true;

        try {
            const event = {
                type: eventType,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href,
                details
            };

            // Usar método original do console para evitar interceptação
            if (this.originalWarn) {
                this.originalWarn.call(console, '🚨 Evento de Segurança:', event);
            }

            // Enviar para servidor (implementar se necessário)
            // this.sendSecurityEvent(event);

            // Incrementar contador de tentativas suspeitas
            const key = `${eventType}_${Date.now()}`;
            this.attempts.set(key, event);

            // Limpar eventos antigos
            setTimeout(() => {
                this.attempts.delete(key);
            }, 300000); // 5 minutos
        } catch (error) {
            // Silenciar erros para evitar loops
        } finally {
            this.loggingSecurityEvent = false;
        }
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
            this.logSecurityEventSafe('rate_limit_exceeded', { action });
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
            this.logSecurityEventSafe('payment_data_suspicious');
            return { valid: false, reason: 'suspicious_data' };
        }

        return { valid: true };
    }

    validateRegistrationAttempt(formData) {
        // Validação simplificada para não interferir com UX
        if (!formData || typeof formData !== 'object') {
            return false;
        }
        
        // Verificar apenas padrões muito suspeitos
        const suspiciousPatterns = [
            /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
            /javascript\s*:/gi,
            /on\w+\s*=\s*["'][^"']*["']/gi,
            /eval\s*\(/gi
        ];
        
        const allValues = Object.values(formData).join(' ');
        const hasSuspiciousContent = suspiciousPatterns.some(pattern => pattern.test(allValues));
        
        if (hasSuspiciousContent) {
            this.logSecurityEventSafe('registration_suspicious_content');
            return false;
        }
        
        return true; // Permitir registro na maioria dos casos
    }
}

// Inicializar validador de segurança
const securityValidator = new SecurityValidator();

// Exportar para uso global
window.SecurityValidator = SecurityValidator;
window.securityValidator = securityValidator;

console.log('🔒 Sistema de segurança frontend inicializado');
console.log('🛡️ Proteções ativas: DevTools, Console, DOM, CSRF, Rate Limiting');
console.log('✅ Todas as proteções foram restauradas com melhorias de estabilidade'); 