const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType
} = require('discord.js');
const config = require('../../config');

const IDS = {
  button: 'looking_players_start',
  modal: 'looking_players_modal',
  console: 'looking_console',
  tag: 'looking_tag',
  game: 'looking_game'
};

function buildPanelEmbed() {
  return new EmbedBuilder()
    .setTitle('🎮 CERCO COMPAGNI')
    .setColor(0x00ff99)
    .setDescription(
      'Vuoi trovare qualcuno con cui giocare?\n\n' +
      'Premi il pulsante **CERCO COMPAGNI**, inserisci:\n' +
      '• Console: **PS5, Xbox o PC**\n' +
      '• Tag console / EA / Steam\n' +
      '• Videogioco\n\n' +
      'Il bot creerà automaticamente un thread in questo canale, dove gli altri membri potranno rispondere e organizzarsi con te.'
    )
    .setFooter({ text: 'BORDO CAMPO COMMUNITY • Trova nuovi compagni di gioco' })
    .setTimestamp();
}

function buildPanelRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(IDS.button)
      .setLabel('CERCO COMPAGNI')
      .setEmoji('🎮')
      .setStyle(ButtonStyle.Success)
  );
}

async function publishLookingForPlayersPanel(client) {
  const channel = await client.channels.fetch(config.channels.lookingForPlayers).catch(() => null);
  if (!channel) throw new Error('Canale CERCO COMPAGNI non trovato.');

  await channel.send({ embeds: [buildPanelEmbed()], components: [buildPanelRow()] });
  return true;
}

function buildModal() {
  const modal = new ModalBuilder()
    .setCustomId(IDS.modal)
    .setTitle('Cerco Compagni');

  const consoleInput = new TextInputBuilder()
    .setCustomId(IDS.console)
    .setLabel('Console')
    .setPlaceholder('PS5, Xbox o PC')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(20);

  const tagInput = new TextInputBuilder()
    .setCustomId(IDS.tag)
    .setLabel('Tag console / EA / Steam')
    .setPlaceholder('Esempio: BordoPlayer99')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(50);

  const gameInput = new TextInputBuilder()
    .setCustomId(IDS.game)
    .setLabel('Videogioco')
    .setPlaceholder('Esempio: FC 26, GTA, F1, COD, Fortnite...')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(60);

  modal.addComponents(
    new ActionRowBuilder().addComponents(consoleInput),
    new ActionRowBuilder().addComponents(tagInput),
    new ActionRowBuilder().addComponents(gameInput)
  );

  return modal;
}

async function handleLookingForPlayersButton(interaction) {
  if (!interaction.isButton() || interaction.customId !== IDS.button) return false;
  await interaction.showModal(buildModal());
  return true;
}

function normalizeConsole(value) {
  const clean = String(value || '').trim().toUpperCase();
  if (clean.includes('PS')) return 'PS5';
  if (clean.includes('XBOX')) return 'Xbox';
  if (clean.includes('PC')) return 'PC';
  return String(value || '').trim();
}

async function handleLookingForPlayersModal(interaction) {
  if (!interaction.isModalSubmit() || interaction.customId !== IDS.modal) return false;

  const consoleName = normalizeConsole(interaction.fields.getTextInputValue(IDS.console));
  const tag = interaction.fields.getTextInputValue(IDS.tag).trim();
  const game = interaction.fields.getTextInputValue(IDS.game).trim();

  const allowed = ['PS5', 'Xbox', 'PC'];
  if (!allowed.includes(consoleName)) {
    await interaction.reply({ content: '❌ Console non valida. Scrivi PS5, Xbox oppure PC.', ephemeral: true });
    return true;
  }

  const channel = await interaction.client.channels.fetch(config.channels.lookingForPlayers).catch(() => null);
  if (!channel || channel.type !== ChannelType.GuildText) {
    await interaction.reply({ content: '❌ Canale CERCO COMPAGNI non trovato o non valido.', ephemeral: true });
    return true;
  }

  const embed = new EmbedBuilder()
    .setTitle(`🎮 ${interaction.user.displayName || interaction.user.username} cerca compagni`)
    .setColor(0x00ff99)
    .setDescription(
      `👤 Player: ${interaction.user}\n` +
      `🎮 Videogioco: **${game}**\n` +
      `🕹️ Console: **${consoleName}**\n` +
      `🏷️ Tag: **${tag}**\n\n` +
      'Rispondi nel thread per organizzarvi e giocare insieme.'
    )
    .setFooter({ text: 'BORDO CAMPO COMMUNITY • Cerco Compagni' })
    .setTimestamp();

  const message = await channel.send({ content: `${interaction.user} sta cercando compagni per **${game}**`, embeds: [embed] });

  const threadName = `🎮 ${game} • ${interaction.user.username}`.slice(0, 90);
  const thread = await message.startThread({
    name: threadName,
    autoArchiveDuration: 1440,
    reason: 'Richiesta Cerco Compagni'
  });

  await thread.send(
    `Benvenuti! ${interaction.user} cerca compagni per **${game}** su **${consoleName}**.\n` +
    `Tag: **${tag}**\n\nScrivete qui per organizzarvi.`
  );

  await interaction.reply({ content: `✅ Richiesta pubblicata e thread creato: ${thread}`, ephemeral: true });
  return true;
}

module.exports = {
  publishLookingForPlayersPanel,
  handleLookingForPlayersButton,
  handleLookingForPlayersModal
};
