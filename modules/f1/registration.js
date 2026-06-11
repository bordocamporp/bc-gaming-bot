const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const config = require('../../config');
const { getDrivers, upsertDriver, updateDriver } = require('./storage');

const IDS = {
  registerButton: 'f1_register_button',
  modal: 'f1_registration_modal',
  name: 'f1_name',
  console: 'f1_console',
  tag: 'f1_tag',
  age: 'f1_age',
  acceptPrefix: 'f1_accept_',
  rejectPrefix: 'f1_reject_'
};

async function publishF1RegistrationPanel(client) {
  const channel = await client.channels.fetch(config.channels.f1Registration).catch(() => null);
  if (!channel) throw new Error('Canale iscrizione F1 non trovato. Controlla F1_REGISTRATION_CHANNEL_ID.');

  const embed = new EmbedBuilder()
    .setTitle('🏎️ Campionato Formula 1 - BORDO GAMING')
    .setDescription(
      'Vuoi partecipare al campionato di Formula 1?\n\n' +
      'Premi il pulsante **Iscriviti** e compila il modulo con:\n' +
      '• Nome\n' +
      '• Console: PS5, Xbox o PC\n' +
      '• ID / Tag console\n' +
      '• Età\n\n' +
      'Lo staff controllerà la tua richiesta e potrà accettarla o rifiutarla.'
    )
    .setColor(0xff0000)
    .setFooter({ text: 'BORDO GAMING • F1 Championship' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(IDS.registerButton)
      .setLabel('Iscriviti')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success)
  );

  await channel.send({ embeds: [embed], components: [row] });
}

async function handleF1Button(interaction) {
  const customId = interaction.customId;

  if (customId === IDS.registerButton) {
    const existingDriver = getDrivers().find(d =>
      d.discordId === interaction.user.id && ['pending', 'approved'].includes(d.status)
    );

    if (existingDriver) {
      const statusText = existingDriver.status === 'approved'
        ? 'La tua iscrizione è già stata accettata.'
        : 'La tua richiesta è già stata inviata ed è in attesa dello staff.';

      await interaction.reply({
        content: `❌ Sei già iscritto al Campionato F1. ${statusText}`,
        ephemeral: true
      });
      return true;
    }

    const modal = new ModalBuilder()
      .setCustomId(IDS.modal)
      .setTitle('Iscrizione Campionato F1');

    const nameInput = new TextInputBuilder()
      .setCustomId(IDS.name)
      .setLabel('Nome pilota')
      .setPlaceholder('Esempio: Max')
      .setStyle(TextInputStyle.Short)
      .setMinLength(2)
      .setMaxLength(30)
      .setRequired(true);

    const consoleInput = new TextInputBuilder()
      .setCustomId(IDS.console)
      .setLabel('Console')
      .setPlaceholder('PS5, Xbox o PC')
      .setStyle(TextInputStyle.Short)
      .setMinLength(2)
      .setMaxLength(10)
      .setRequired(true);

    const tagInput = new TextInputBuilder()
      .setCustomId(IDS.tag)
      .setLabel('ID / Tag console')
      .setPlaceholder('Esempio: Max_1999')
      .setStyle(TextInputStyle.Short)
      .setMinLength(2)
      .setMaxLength(40)
      .setRequired(true);

    const ageInput = new TextInputBuilder()
      .setCustomId(IDS.age)
      .setLabel("Età")
      .setPlaceholder('Esempio: 22')
      .setStyle(TextInputStyle.Short)
      .setMinLength(1)
      .setMaxLength(2)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nameInput),
      new ActionRowBuilder().addComponents(consoleInput),
      new ActionRowBuilder().addComponents(tagInput),
      new ActionRowBuilder().addComponents(ageInput)
    );

    await interaction.showModal(modal);
    return true;
  }

  if (customId.startsWith(IDS.acceptPrefix)) {
    const discordId = customId.replace(IDS.acceptPrefix, '');
    const driver = updateDriver(discordId, { status: 'approved' });

    if (!driver) {
      await interaction.reply({ content: '❌ Iscrizione non trovata.', ephemeral: true });
      return true;
    }

    const member = await interaction.guild.members.fetch(discordId).catch(() => null);
    if (member && config.roles.f1Driver) {
      await member.roles.add(config.roles.f1Driver).catch(() => null);
    }

    const embed = EmbedBuilder.from(interaction.message.embeds[0])
      .setColor(0x00ff00)
      .setFooter({ text: `Accettata da ${interaction.user.tag}` });

    await interaction.update({
      embeds: [embed],
      components: [],
      content: `✅ Iscrizione accettata. Ruolo F1 Driver assegnato a <@${discordId}>.`
    });

    await member?.send('✅ La tua iscrizione al Campionato F1 BORDO GAMING è stata accettata!').catch(() => {});
    return true;
  }

  if (customId.startsWith(IDS.rejectPrefix)) {
    const discordId = customId.replace(IDS.rejectPrefix, '');
    const driver = updateDriver(discordId, { status: 'rejected' });

    if (!driver) {
      await interaction.reply({ content: '❌ Iscrizione non trovata.', ephemeral: true });
      return true;
    }

    const embed = EmbedBuilder.from(interaction.message.embeds[0])
      .setColor(0xff0000)
      .setFooter({ text: `Rifiutata da ${interaction.user.tag}` });

    await interaction.update({
      embeds: [embed],
      components: [],
      content: `❌ Iscrizione rifiutata per <@${discordId}>.`
    });

    const member = await interaction.guild.members.fetch(discordId).catch(() => null);
    await member?.send('❌ La tua iscrizione al Campionato F1 BORDO GAMING è stata rifiutata dallo staff.').catch(() => {});
    return true;
  }

  return false;
}

async function handleF1Modal(interaction) {
  if (interaction.customId !== IDS.modal) return false;

  const existingDriver = getDrivers().find(d =>
    d.discordId === interaction.user.id && ['pending', 'approved'].includes(d.status)
  );

  if (existingDriver) {
    const statusText = existingDriver.status === 'approved'
      ? 'La tua iscrizione è già stata accettata.'
      : 'La tua richiesta è già stata inviata ed è in attesa dello staff.';

    await interaction.reply({
      content: `❌ Sei già iscritto al Campionato F1. ${statusText}`,
      ephemeral: true
    });
    return true;
  }

  const driverName = interaction.fields.getTextInputValue(IDS.name).trim();
  const consoleName = interaction.fields.getTextInputValue(IDS.console).trim();
  const gamertag = interaction.fields.getTextInputValue(IDS.tag).trim();
  const ageRaw = interaction.fields.getTextInputValue(IDS.age).trim();
  const age = Number.parseInt(ageRaw, 10);

  if (!Number.isInteger(age) || age < 10 || age > 99) {
    await interaction.reply({ content: '❌ Età non valida. Inserisci un numero valido.', ephemeral: true });
    return true;
  }

  const allowedConsoles = ['ps5', 'xbox', 'pc'];
  if (!allowedConsoles.includes(consoleName.toLowerCase())) {
    await interaction.reply({ content: '❌ Console non valida. Scrivi PS5, Xbox oppure PC.', ephemeral: true });
    return true;
  }

  upsertDriver({
    discordId: interaction.user.id,
    discordTag: interaction.user.tag,
    driverName,
    console: consoleName,
    gamertag,
    age,
    status: 'pending',
    team: null,
    isReserve: false,
    reserveForTeam: null
  });

  const staffChannel = await interaction.client.channels.fetch(config.channels.f1StaffRequests).catch(() => null);
  if (!staffChannel) {
    await interaction.reply({ content: '❌ Canale staff non trovato. Contatta un amministratore.', ephemeral: true });
    return true;
  }

  const embed = new EmbedBuilder()
    .setTitle('🏎️ Nuova richiesta iscrizione F1')
    .setColor(0xffcc00)
    .addFields(
      { name: 'Pilota', value: driverName, inline: true },
      { name: 'Console', value: consoleName, inline: true },
      { name: 'ID / Tag', value: gamertag, inline: true },
      { name: 'Età', value: String(age), inline: true },
      { name: 'Discord', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Stato', value: 'In attesa dello staff', inline: true }
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${IDS.acceptPrefix}${interaction.user.id}`)
      .setLabel('Accetta')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`${IDS.rejectPrefix}${interaction.user.id}`)
      .setLabel('Rifiuta')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger)
  );

  await staffChannel.send({ embeds: [embed], components: [row] });
  await interaction.reply({ content: '✅ Richiesta inviata allo staff. Riceverai risposta appena verrà controllata.', ephemeral: true });
  return true;
}

module.exports = {
  publishF1RegistrationPanel,
  handleF1Button,
  handleF1Modal
};
