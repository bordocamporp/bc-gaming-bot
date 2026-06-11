const config = require('../../config');
const { getDrivers, resetF1Data } = require('./storage');

async function handleResetF1(interaction) {
  if (interaction.user.id !== interaction.guild.ownerId) {
    return interaction.reply({ content: '❌ Solo il creatore del server può usare `/resetta_f1`.', ephemeral: true });
  }

  const drivers = getDrivers();
  await interaction.deferReply({ ephemeral: true });

  let removed = 0;
  for (const driver of drivers) {
    const member = await interaction.guild.members.fetch(driver.discordId).catch(() => null);
    if (member && config.roles.f1Driver && member.roles.cache.has(config.roles.f1Driver)) {
      await member.roles.remove(config.roles.f1Driver, 'Reset completo F1').catch(() => null);
      removed++;
    }
  }

  resetF1Data();
  await interaction.editReply(`✅ Reset F1 completato. Iscrizioni, sorteggio, calendario e risultati eliminati. Ruolo F1 Driver rimosso a **${removed}** membri.`);
}

module.exports = { handleResetF1 };
