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

    // Separar nome em primeiro e último apenas
    const nameParts = displayName.split(' ').filter(part => part.length > 0);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

    // Atualizar nome no header
    navUserName.innerHTML = `
        <div class="nav-user-name">
            <span class="first-name" style="color: #28a745; font-weight: 600;">${firstName}</span>
            ${lastName ? `<span class="last-name" style="color: #28a745; font-weight: 500;">${lastName}</span>` : ''}
        </div>
    `;
    console.log(`  ✅ Nome definido no elemento: ${firstName} ${lastName}`);
}

// Exportar função globalmente
window.updateUserDisplayName = updateUserDisplayName; 