const { sendRolesPanel } = require('./rolesPanel');
const { publishF1RegistrationPanel } = require('./f1/registration');

async function publishAvailablePanels(client) {
  const published = [];
  const missing = [];

  try {
    const ok = await sendRolesPanel(client);
    if (ok) published.push('🎭 Pannello Ruoli');
    else missing.push('🎭 Pannello Ruoli - canale non trovato');
  } catch (error) {
    console.error('❌ Errore pubblicazione pannello ruoli:', error);
    missing.push('🎭 Pannello Ruoli - errore pubblicazione');
  }

  try {
    await publishF1RegistrationPanel(client);
    published.push('🏎️ Pannello Iscrizioni F1');
  } catch (error) {
    console.error('❌ Errore pubblicazione pannello F1:', error);
    missing.push('🏎️ Formula 1 - errore pubblicazione o canale non trovato');
  }

  missing.push('📜 Regolamento');
  missing.push('⚽ FC 26');
  missing.push('👥 Pro Club');
  missing.push('📋 Football Manager');
  missing.push('🎟️ Ticket');

  return { published, missing };
}

module.exports = { publishAvailablePanels };
