const {
  ActionRowBuilder,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const config = require('../config');

const TICKET_SELECT_ID = 'bc_ticket_select';
const TICKET_CLOSE_ID = 'bc_ticket_close';

const TICKET_CATEGORIES = {
  generale: {
    label: 'Assistenza Generale',
    emoji: '⚙️',
    logKey: 'ticketLogsGeneral',
    channelPrefix: 'ticket-generale',
    description: 'Supporto Discord, ruoli, canali, LIVE MATCH e assistenza generale.'
  },
  fc: {
    label: 'Assistenza FC',
    emoji: '⚽',
    logKey: 'ticketLogsFc',
    channelPrefix: 'ticket-fc',
    description: 'Tornei FC, mercato, rose, classifiche e competizioni FC.'
  },
  proclub: {
    label: 'Assistenza Pro Club',
    emoji: '👥',
    logKey: 'ticketLogsProClub',
    channelPrefix: 'ticket-proclub',
    description: 'Provini, club, campionati e attività Pro Club.'
  },
  f1: {
    label: 'Assistenza Formula 1',
    emoji: '🏎️',
    logKey: 'ticketLogsF1',
    channelPrefix: 'ticket-f1',
    description: 'Iscrizioni campionato, regolamenti, risultati, reclami e gestione F1.'
  },
  fm: {
    label: 'Assistenza Football Manager',
    emoji: '📋',
    logKey: 'ticketLogsFootballManager',
    channelPrefix: 'ticket-fm',
    description: 'Carriere online, competizioni e attività Football Manager.'
  }
};

function safeName(value) {
  return String(value || 'utente')
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32) || 'utente';
}

function buildTicketPanelEmbed() {
  return new EmbedBuilder()
    .setTitle('🎫 CENTRO ASSISTENZA BC | BORDO CAMPO')
    .setColor(0x8a2be2)
    .setDescription(
      'Hai bisogno di aiuto?\n\n' +
      'Seleziona dal menu la categoria corretta per aprire un ticket privato con il nostro staff.\n\n' +
      '⚙️ **Assistenza Generale**\n' +
      'Supporto Discord, ruoli, canali, eventi LIVE MATCH e assistenza generale.\n\n' +
      '⚽ **Assistenza FC**\n' +
      'Problemi relativi a tornei FC, mercato, rose, classifiche e competizioni FC.\n\n' +
      '👥 **Assistenza Pro Club**\n' +
      'Supporto per provini, club, campionati e attività Pro Club.\n\n' +
      '🏎️ **Assistenza Formula 1**\n' +
      'Iscrizioni campionato, regolamenti, risultati, reclami e gestione F1.\n\n' +
      '📋 **Assistenza Football Manager**\n' +
      'Supporto per carriere online, competizioni e attività Football Manager.\n\n' +
      '📌 Apri un ticket solo per richieste reali di supporto.\n' +
      '🚫 L\'abuso del sistema ticket può comportare provvedimenti da parte dello staff.'
    )
    .setFooter({ text: 'BC | BORDO CAMPO • Gioca • Competi • Vinci' })
    .setTimestamp();
}

function buildTicketSelectRow() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(TICKET_SELECT_ID)
    .setPlaceholder('Seleziona il reparto di assistenza')
    .setMinValues(1)
    .setMaxValues(1);

  for (const [value, category] of Object.entries(TICKET_CATEGORIES)) {
    menu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(category.label)
        .setDescription(category.description.slice(0, 100))
        .setEmoji(category.emoji)
        .setValue(value)
    );
  }

  return new ActionRowBuilder().addComponents(menu);
}

function buildTicketControlsRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(TICKET_CLOSE_ID)
      .setLabel('Chiudi ticket')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger)
  );
}

async function publishTicketPanel(client) {
  const channel = await client.channels.fetch(config.channels.ticketPanel).catch(() => null);
  if (!channel) throw new Error('Canale ticket non trovato. Controlla TICKET_PANEL_CHANNEL_ID.');

  await channel.send({ embeds: [buildTicketPanelEmbed()], components: [buildTicketSelectRow()] });
  return true;
}

function buildTicketEmbed(interaction, category) {
  return new EmbedBuilder()
    .setTitle(`${category.emoji} ${category.label}`)
    .setColor(0x8a2be2)
    .setDescription(
      `👋 Benvenuto ${interaction.user}.\n\n` +
      'Uno membro dello staff ti assisterà il prima possibile.\n\n' +
      'Nel frattempo descrivi nel dettaglio il problema o la richiesta di supporto.\n\n' +
      '📌 Più informazioni fornisci, più velocemente potremo aiutarti.\n\n' +
      '🏆 **BC | BORDO CAMPO**'
    )
    .addFields(
      { name: 'Categoria', value: `${category.emoji} ${category.label}`, inline: true },
      { name: 'Aperto da', value: `${interaction.user}`, inline: true }
    )
    .setFooter({ text: 'BC | BORDO CAMPO • Sistema Ticket' })
    .setTimestamp();
}

async function sendTicketLog(client, category, payload) {
  const logChannelId = config.channels[category.logKey];
  if (!logChannelId) return false;
  const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
  if (!logChannel) return false;
  await logChannel.send(payload).catch(() => null);
  return true;
}

async function handleTicketSelect(interaction) {
  if (!interaction.isStringSelectMenu() || interaction.customId !== TICKET_SELECT_ID) return false;

  const categoryKey = interaction.values[0];
  const category = TICKET_CATEGORIES[categoryKey];
  if (!category) {
    await interaction.reply({ content: '❌ Categoria ticket non valida.', ephemeral: true });
    return true;
  }

  const guild = interaction.guild;
  const panelChannel = interaction.channel;
  if (!guild || !panelChannel) {
    await interaction.reply({ content: '❌ Ticket disponibile solo nel server.', ephemeral: true });
    return true;
  }

  const existing = guild.channels.cache.find(channel =>
    channel.type === ChannelType.GuildText &&
    channel.topic &&
    channel.topic.includes(`ticketOwner:${interaction.user.id}`) &&
    channel.topic.includes(`ticketCategory:${categoryKey}`)
  );

  if (existing) {
    await interaction.reply({ content: `⚠️ Hai già un ticket aperto per questa categoria: ${existing}`, ephemeral: true });
    return true;
  }

  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks
      ]
    },
    {
      id: guild.members.me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks
      ]
    }
  ];

  if (config.roles.ticketStaff) {
    overwrites.push({
      id: config.roles.ticketStaff,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks
      ]
    });
  }

  const channelName = `${category.channelPrefix}-${safeName(interaction.user.username)}`.slice(0, 90);

  const ticketChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: panelChannel.parentId || undefined,
    topic: `ticketOwner:${interaction.user.id}; ticketCategory:${categoryKey}; openedAt:${new Date().toISOString()}`,
    permissionOverwrites: overwrites,
    reason: `Ticket ${category.label} aperto da ${interaction.user.tag}`
  });

  await ticketChannel.send({
    content: `${interaction.user}${config.roles.ticketStaff ? ` <@&${config.roles.ticketStaff}>` : ''}`,
    embeds: [buildTicketEmbed(interaction, category)],
    components: [buildTicketControlsRow()]
  });

  const logEmbed = new EmbedBuilder()
    .setTitle('🎫 Ticket aperto')
    .setColor(0x00ff99)
    .addFields(
      { name: 'Categoria', value: `${category.emoji} ${category.label}`, inline: true },
      { name: 'Utente', value: `${interaction.user} (${interaction.user.id})`, inline: false },
      { name: 'Canale', value: `${ticketChannel}`, inline: true }
    )
    .setTimestamp();

  await sendTicketLog(interaction.client, category, { embeds: [logEmbed] });

  await interaction.reply({ content: `✅ Ticket creato: ${ticketChannel}`, ephemeral: true });
  return true;
}

async function handleTicketButton(interaction) {
  if (!interaction.isButton() || interaction.customId !== TICKET_CLOSE_ID) return false;

  const channel = interaction.channel;
  if (!channel || channel.type !== ChannelType.GuildText || !channel.topic?.includes('ticketOwner:')) {
    await interaction.reply({ content: '❌ Questo pulsante può essere usato solo dentro un ticket.', ephemeral: true });
    return true;
  }

  const ownerMatch = channel.topic.match(/ticketOwner:(\d+)/);
  const categoryMatch = channel.topic.match(/ticketCategory:([a-z0-9_-]+)/);
  const ownerId = ownerMatch?.[1];
  const categoryKey = categoryMatch?.[1];
  const category = TICKET_CATEGORIES[categoryKey] || TICKET_CATEGORIES.generale;

  const canClose =
    interaction.user.id === ownerId ||
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ||
    interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
    (config.roles.ticketStaff && interaction.member.roles?.cache?.has(config.roles.ticketStaff));

  if (!canClose) {
    await interaction.reply({ content: '❌ Non hai i permessi per chiudere questo ticket.', ephemeral: true });
    return true;
  }

  const logEmbed = new EmbedBuilder()
    .setTitle('🔒 Ticket chiuso')
    .setColor(0xff5555)
    .addFields(
      { name: 'Categoria', value: `${category.emoji} ${category.label}`, inline: true },
      { name: 'Canale', value: `#${channel.name}`, inline: true },
      { name: 'Chiuso da', value: `${interaction.user} (${interaction.user.id})`, inline: false },
      { name: 'Aperto da', value: ownerId ? `<@${ownerId}> (${ownerId})` : 'N/D', inline: false }
    )
    .setTimestamp();

  await sendTicketLog(interaction.client, category, { embeds: [logEmbed] });

  await interaction.reply({ content: '🔒 Ticket chiuso. Il canale verrà eliminato tra 5 secondi.', ephemeral: true });
  setTimeout(() => {
    channel.delete(`Ticket chiuso da ${interaction.user.tag}`).catch(() => null);
  }, 5000);

  return true;
}

module.exports = {
  publishTicketPanel,
  handleTicketSelect,
  handleTicketButton,
  buildTicketPanelEmbed,
  buildTicketSelectRow
};
