// Função global para atualizar o nome do usuário no header
function updateUserDisplayName(user, userData = null) {
    const navUserName = document.getElementById('nav-user-name');
    if (!navUserName) return;

    // Definir nome a ser exibido
    let displayName = '';
    if (userData && userData.Nome) {
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

    // Atualizar nome no header
    navUserName.innerHTML = `
        <div class="nav-user-name">
            <span class="first-name">${firstName}</span>
            ${lastName && lastName !== firstName ? `<span class="last-name">${lastName}</span>` : ''}
        </div>
    `;
    console.log(`  ✅ Nome definido no elemento: ${firstName} ${lastName}`);
}

// Exportar função globalmente
window.updateUserDisplayName = updateUserDisplayName; 