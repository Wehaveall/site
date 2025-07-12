// Função global para atualizar o nome do usuário no header
function updateUserDisplayName(user, userData = null) {
    const navUserName = document.getElementById('nav-user-name');
    if (!navUserName) return;

    // Definir nome a ser exibido
    let displayName = '';
    if (userData?.Nome) {
        displayName = userData.Nome;
        console.log('  📛 Nome obtido do Firestore:', displayName);
    } else if (user.displayName) {
        displayName = user.displayName;
        console.log('  📛 Nome obtido do Firebase Auth:', displayName);
    } else if (user.email) {
        // Usar primeira parte do email como fallback
        displayName = user.email.split('@')[0];
        console.log('  📛 Nome obtido do email:', displayName);
    }

    // Se não tiver nome, manter o spinner
    if (!displayName) {
        navUserName.innerHTML = `
            <div class="nav-user-name">
                <div class="loading-spinner" style="width: 16px; height: 16px; border: 2px solid #28a745; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            </div>
        `;
        return;
    }

    // Separar nome em primeiro e último apenas
    const nameParts = displayName.split(' ').filter(part => part.length > 0);
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];

    // Limpar conteúdo anterior para evitar duplicatas
    navUserName.innerHTML = '';

    // Criar container seguro
    const container = document.createElement('div');
    container.className = 'nav-user-name';

    // Criar e popular o primeiro nome de forma segura
    const firstNameSpan = document.createElement('span');
    firstNameSpan.className = 'first-name';
    firstNameSpan.textContent = firstName; // ✅ SEGURO: Previne XSS
    container.appendChild(firstNameSpan);

    // Criar e popular o último nome de forma segura, se existir
    if (lastName && lastName !== firstName) {
        const lastNameSpan = document.createElement('span');
        lastNameSpan.className = 'last-name';
        lastNameSpan.textContent = lastName; // ✅ SEGURO: Previne XSS
        container.appendChild(lastNameSpan);
    }

    // Adicionar o container seguro ao elemento do header
    navUserName.appendChild(container);

    console.log(`  ✅ Nome definido com segurança no elemento: ${firstName} ${lastName}`);
}

// Exportar função globalmente
window.updateUserDisplayName = updateUserDisplayName; 