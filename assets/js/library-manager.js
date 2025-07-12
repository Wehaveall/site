/**
 * 📚 Sistema de Gerenciamento de Bibliotecas Atalho
 * Gerencia o carregamento e download de arquivos .ata por categoria e idioma
 */

class LibraryManager {
    constructor() {
        this.currentLanguage = 'pt-br';
        this.categories = {
            'juridico': {
                id: 'juridico',
                icon: '⚖️',
                nameKey: 'download.libraries.categories.legal.title',
                descriptionKey: 'download.libraries.categories.legal.description'
            },
            'matematica': {
                id: 'matematica',
                icon: '📐',
                nameKey: 'download.libraries.categories.math.title',
                descriptionKey: 'download.libraries.categories.math.description'
            }
        };
        
        // Arquivos disponíveis por categoria e idioma
        this.availableFiles = {
            'pt-br': {
                'juridico': [
                    {
                        name: 'termos-basicos.ata',
                        displayName: 'Termos Básicos',
                        description: 'Termos processuais e expressões jurídicas básicas',
                        size: '2.3 KB',
                        modified: '2025-01-07'
                    },
                    {
                        name: 'peticoes-iniciais.ata',
                        displayName: 'Petições Iniciais',
                        description: 'Modelos e fundamentos para petições iniciais',
                        size: '3.1 KB',
                        modified: '2025-01-07'
                    }
                ],
                'matematica': [
                    {
                        name: 'formulas-basicas.ata',
                        displayName: 'Fórmulas Básicas',
                        description: 'Fórmulas geométricas e símbolos matemáticos',
                        size: '1.8 KB',
                        modified: '2025-01-07'
                    },
                    {
                        name: 'estatistica.ata',
                        displayName: 'Estatística',
                        description: 'Fórmulas estatísticas e símbolos especiais',
                        size: '2.5 KB',
                        modified: '2025-01-07'
                    }
                ]
            }
        };
        
        this.selectedCategory = null;
        this.selectedLanguage = 'pt-br';
        this.init();
    }

    init() {
        // Sincronizar com sistema de idiomas se disponível
        if (window.i18nSystem) {
            this.currentLanguage = window.i18nSystem.getCurrentLanguage();
            this.selectedLanguage = this.currentLanguage;
        }
        
        // Escutar mudanças de idioma
        window.addEventListener('languageChanged', (event) => {
            this.currentLanguage = event.detail.language;
            this.selectedLanguage = this.currentLanguage;
            this.updateUI();
        });
        
        console.log('📚 LibraryManager inicializado');
    }

    /**
     * Renderiza a interface principal das bibliotecas
     */
    renderLibrariesSection() {
        const t = window.i18nSystem?.t || ((key) => key);
        
        return `
            <div class="libraries-section">
                <div class="libraries-header">
                    <h2>${t('download.libraries.title')}</h2>
                    <p class="libraries-subtitle">${t('download.libraries.subtitle')}</p>
                </div>
                
                <div class="language-filter">
                    <label for="library-language-select">${t('download.libraries.languageFilter')}</label>
                    <select id="library-language-select" onchange="libraryManager.onLanguageChange(this.value)">
                        <option value="all">${t('download.libraries.allLanguages')}</option>
                        <option value="pt-br" ${this.selectedLanguage === 'pt-br' ? 'selected' : ''}>Português (Brasil)</option>
                        <option value="en" ${this.selectedLanguage === 'en' ? 'selected' : ''}>English</option>
                        <option value="es" ${this.selectedLanguage === 'es' ? 'selected' : ''}>Español</option>
                        <option value="fr" ${this.selectedLanguage === 'fr' ? 'selected' : ''}>Français</option>
                        <option value="de" ${this.selectedLanguage === 'de' ? 'selected' : ''}>Deutsch</option>
                        <option value="it" ${this.selectedLanguage === 'it' ? 'selected' : ''}>Italiano</option>
                    </select>
                </div>
                
                <div class="categories-grid">
                    ${this.renderCategories()}
                </div>
                
                <div id="file-list-container" class="file-list-container" style="display: none;">
                    <div class="file-list-header">
                        <h3 id="file-list-title">${t('download.libraries.fileList.title')}</h3>
                        <button class="btn-back" onclick="libraryManager.hideFileList()">← Voltar</button>
                    </div>
                    <div id="file-list" class="file-list">
                        <!-- Arquivos serão inseridos aqui -->
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza os cartões de categoria
     */
    renderCategories() {
        const t = window.i18nSystem?.t || ((key) => key);
        
        return Object.values(this.categories).map(category => {
            const hasFiles = this.hasFilesForCategory(category.id);
            const isDisabled = !hasFiles;
            
            return `
                <div class="category-card ${isDisabled ? 'disabled' : ''}" 
                     onclick="${isDisabled ? '' : `libraryManager.selectCategory('${category.id}')`}">
                    <div class="category-icon">${category.icon}</div>
                    <div class="category-content">
                        <h3>${t(category.nameKey)}</h3>
                        <p>${t(category.descriptionKey)}</p>
                        <div class="file-count">
                            ${this.getFileCountText(category.id)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Verifica se há arquivos disponíveis para uma categoria no idioma selecionado
     */
    hasFilesForCategory(categoryId) {
        if (this.selectedLanguage === 'all') {
            return Object.values(this.availableFiles).some(langFiles => 
                langFiles[categoryId] && langFiles[categoryId].length > 0
            );
        }
        
        const langFiles = this.availableFiles[this.selectedLanguage];
        return langFiles && langFiles[categoryId] && langFiles[categoryId].length > 0;
    }

    /**
     * Obtém texto com contagem de arquivos
     */
    getFileCountText(categoryId) {
        if (this.selectedLanguage === 'all') {
            let totalFiles = 0;
            Object.values(this.availableFiles).forEach(langFiles => {
                if (langFiles[categoryId]) {
                    totalFiles += langFiles[categoryId].length;
                }
            });
            return totalFiles > 0 ? `${totalFiles} arquivo(s)` : 'Nenhum arquivo';
        }
        
        const langFiles = this.availableFiles[this.selectedLanguage];
        const files = langFiles && langFiles[categoryId] ? langFiles[categoryId] : [];
        return files.length > 0 ? `${files.length} arquivo(s)` : 'Nenhum arquivo';
    }

    /**
     * Seleciona uma categoria e mostra os arquivos
     */
    selectCategory(categoryId) {
        this.selectedCategory = categoryId;
        this.showFileList(categoryId);
    }

    /**
     * Mostra lista de arquivos da categoria
     */
    showFileList(categoryId) {
        const category = this.categories[categoryId];
        const t = window.i18nSystem?.t || ((key) => key);
        
        const fileListContainer = document.getElementById('file-list-container');
        const fileListTitle = document.getElementById('file-list-title');
        const fileList = document.getElementById('file-list');
        
        fileListTitle.textContent = `${t(category.nameKey)} - ${t('download.libraries.fileList.title')}`;
        
        const files = this.getFilesForCategory(categoryId);
        
        if (files.length === 0) {
            fileList.innerHTML = `
                <div class="no-files">
                    <p>${t('download.libraries.fileList.noFiles')}</p>
                </div>
            `;
        } else {
            fileList.innerHTML = files.map(file => `
                <div class="file-item">
                    <div class="file-info">
                        <div class="file-name">${file.displayName}</div>
                        <div class="file-description">${file.description}</div>
                        <div class="file-meta">
                            <span class="file-size">${t('download.libraries.fileList.size')}: ${file.size}</span>
                            <span class="file-modified">${t('download.libraries.fileList.modified')}: ${file.modified}</span>
                        </div>
                    </div>
                    <div class="file-actions">
                        <button class="btn-download-file" onclick="libraryManager.downloadFile('${categoryId}', '${file.name}')">
                            ${t('download.libraries.fileList.downloadBtn')}
                        </button>
                    </div>
                </div>
            `).join('');
        }
        
        fileListContainer.style.display = 'block';
        fileListContainer.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Obtém arquivos para uma categoria no idioma selecionado
     */
    getFilesForCategory(categoryId) {
        if (this.selectedLanguage === 'all') {
            let allFiles = [];
            Object.entries(this.availableFiles).forEach(([lang, langFiles]) => {
                if (langFiles[categoryId]) {
                    allFiles.push(...langFiles[categoryId].map(file => ({
                        ...file,
                        language: lang
                    })));
                }
            });
            return allFiles;
        }
        
        const langFiles = this.availableFiles[this.selectedLanguage];
        return langFiles && langFiles[categoryId] ? langFiles[categoryId] : [];
    }

    /**
     * Esconde lista de arquivos
     */
    hideFileList() {
        const fileListContainer = document.getElementById('file-list-container');
        fileListContainer.style.display = 'none';
        this.selectedCategory = null;
    }

    /**
     * Mudança de idioma no filtro
     */
    onLanguageChange(language) {
        this.selectedLanguage = language;
        this.updateUI();
    }

    /**
     * Atualiza a interface
     */
    updateUI() {
        const categoriesGrid = document.querySelector('.categories-grid');
        if (categoriesGrid) {
            categoriesGrid.innerHTML = this.renderCategories();
        }
        
        // Se está mostrando lista de arquivos, atualize também
        if (this.selectedCategory) {
            this.showFileList(this.selectedCategory);
        }
    }

    /**
     * Faz download de um arquivo
     */
    downloadFile(categoryId, fileName) {
        const filePath = `libraries/${this.selectedLanguage === 'all' ? 'pt-br' : this.selectedLanguage}/${categoryId}/${fileName}`;
        
        console.log(`📥 Iniciando download: ${filePath}`);
        
        // Criar elemento de download
        const downloadLink = document.createElement('a');
        downloadLink.href = filePath;
        downloadLink.download = fileName;
        downloadLink.style.display = 'none';
        
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        console.log(`✅ Download iniciado: ${fileName}`);
    }
}

// Inicializar o gerenciador de bibliotecas
window.libraryManager = new LibraryManager();

// Exportar para uso em outros scripts
window.LibraryManager = LibraryManager; 