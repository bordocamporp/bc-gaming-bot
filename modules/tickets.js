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
    channelKey: 'ticketLogsGeneral',
    channelPrefix: 'ticket-generale',
    description: 'Supporto Discord, canali, LIVE MATCH e assistenza generale.'
  },
  fc: {
    label: 'Assistenza FC',
    emoji: '⚽',
    channelKey: 'ticketLogsFc',
    channelPrefix: 'ticket-fc',
    description: 'Tornei FC, mercato, rose, classifiche e competizioni FC.'
  },
  proclub: {
    label: 'Assistenza Pro Club',
    emoji: '👥',
    channelKey: 'ticketLogsProClub',
    channelPrefix: 'ticket-proclub',
    description: 'Provini, club, campionati e attività Pro Club.'
  },
  f1: {
    label: 'Assistenza Formula 1',
    emoji: '🏎️',
    channelKey: 'ticketLogsF1',
    channelPrefix: 'ticket-f1',
    description: 'Iscrizioni campionato, regolamenti, risultati, reclami e gestione F1.'
  },
  fm: {
    label: 'Assistenza Football Manager',
    emoji: '📋',
    channelKey: 'ticketLogsFootballManager',
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

function isTextLike(channel) {
  return Boolean(channel && typeof channel.send === 'function');
}

function isThread(channel) {
  return Boolean(channel && typeof channel.isThread === 'function' && channel.isThread());
}

function buildTicketPanelEmbed() {
  return new EmbedBuilder()
    .setTitle('🎫 CENTRO ASSISTENZA BC | BORDO CAMPO')
    .setColor(0x8a2be2)
    .setDescription(
      'Hai bisogno di aiuto?\n\n' +
      'Seleziona dal menu la categoria corretta per aprire un ticket privato con il nostro staff.\n\n' +
      '⚙️ **Assistenza Generale**\nSupporto Discord, canali, eventi LIVE MATCH e assistenza generale.\n\n' +
      '⚽ **Assistenza FC**\nProblemi relativi a tornei FC, mercato, rose, classifiche e competizioni FC.\n\n' +
      '👥 **Assistenza Pro Club**\nSupporto per provini, club, campionati e attività Pro Club.\n\n' +
      '🏎️ **Assistenza Formula 1**\nIscrizioni campionato, regolamenti, risultati, reclami e gestione F1.\n\n' +
      '📋 **Assistenza Football Manager**\nSupporto per carriere online, competizioni e attività Football Manager.\n\n' +
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
  if (!channel || !isTextLike(channel)) throw new Error('Canale ticket non trovato o non testuale. Controlla TICKET_PANEL_CHANNEL_ID.');

  await channel.send({ embeds: [buildTicketPanelEmbed()], components: [buildTicketSelectRow()] });
  return true;
}

function buildTicketEmbed(interaction, category) {
  return new EmbedBuilder()
    .setTitle(`${category.emoji} ${category.label}`)
    .setColor(0x8a2be2)
    .setDescription(
      `👋 Benvenuto ${interaction.user}.\n\n` +
      'Un membro dello staff ti assisterà il prima possibile.\n\n' +
      'Descrivi nel dettaglio il problema o la richiesta di supporto.\n\n' +
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
  const targetId = config.channels[category.channelKey];
  if (!targetId) return false;
  const target = await client.channels.fetch(targetId).catch(() => null);
  if (!target || !isTextLike(target)) return false;
  await target.send(payload).catch(() => null);
  return true;
}

function buildOverwrites(guild, interaction) {
  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: interaction.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks]
    },
    {
      id: guild.members.me.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ManageThreads, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks]
    }
  ];

  const staffRoleIds = [config.roles.ticketStaff, ...(config.roles.ticketStaffExtra || [])].filter(Boolean);
  for (const roleId of staffRoleIds) {
    overwrites.push({
      id: roleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ManageThreads, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks]
    });
  }
  return overwrites;
}

async function createTicketDestination(interaction, category, channelName, overwrites) {
  const guild = interaction.guild;
  const targetId = config.channels[category.channelKey];
  const target = targetId ? await interaction.client.channels.fetch(targetId).catch(() => null) : null;

  // Se l'ID configurato è una categoria Discord, crea il canale ticket dentro quella categoria.
  if (target && target.type === ChannelType.GuildCategory) {
    return guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: target.id,
      topic: `ticketOwner:${interaction.user.id}; ticketCategory:${Object.keys(TICKET_CATEGORIES).find(k => TICKET_CATEGORIES[k] === category)}; openedAt:${new Date().toISOString()}`,
      permissionOverwrites: overwrites,
      reason: `Ticket ${category.label} aperto da ${interaction.user.tag}`
    });
  }

  // Se l'ID configurato è un canale testuale, apre il ticket come thread privato in quel canale.
  if (target && typeof target.threads?.create === 'function') {
    const thread = await target.threads.create({
      name: channelName,
      type: ChannelType.PrivateThread,
      invitable: false,
      autoArchiveDuration: 1440,
      reason: `Ticket ${category.label} aperto da ${interaction.user.tag}`
    });
    await thread.members.add(interaction.user.id).catch(() => null);
    return thread;
  }

  // Fallback: crea il canale ticket nella categoria del pannello.
  return guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: interaction.channel?.parentId || undefined,
    topic: `ticketOwner:${interaction.user.id}; ticketCategory:${Object.keys(TICKET_CATEGORIES).find(k => TICKET_CATEGORIES[k] === category)}; openedAt:${new Date().toISOString()}`,
    permissionOverwrites: overwrites,
    reason: `Ticket ${category.label} aperto da ${interaction.user.tag}`
  });
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
  if (!guild) {
    await interaction.reply({ content: '❌ Ticket disponibile solo nel server.', ephemeral: true });
    return true;
  }

  const existing = guild.channels.cache.find(channel => {
    const nameMatch = channel.name?.includes(`${category.channelPrefix}-${safeName(interaction.user.username)}`);
    const topicMatch = channel.topic?.includes(`ticketOwner:${interaction.user.id}`) && channel.topic?.includes(`ticketCategory:${categoryKey}`);
    return nameMatch || topicMatch;
  });

  if (existing) {
    await interaction.reply({ content: `⚠️ Hai già un ticket aperto per questa categoria: ${existing}`, ephemeral: true });
    return true;
  }

  const overwrites = buildOverwrites(guild, interaction);
  const channelName = `${category.channelPrefix}-${safeName(interaction.user.username)}`.slice(0, 90);
  const ticketChannel = await createTicketDestination(interaction, category, channelName, overwrites);

  const staffMentions = [config.roles.ticketStaff, ...(config.roles.ticketStaffExtra || [])]
    .filter(Boolean)
    .map(id => `<@&${id}>`)
    .join(' ');

  await ticketChannel.send({
    content: `${interaction.user}${staffMentions ? ` ${staffMentions}` : ''}`,
    embeds: [buildTicketEmbed(interaction, category)],
    components: [buildTicketControlsRow()]
  });

  const logEmbed = new EmbedBuilder()
    .setTitle('🎫 Ticket aperto')
    .setColor(0x00ff99)
    .addFields(
      { name: 'Categoria', value: `${category.emoji} ${category.label}`, inline: true },
      { name: 'Utente', value: `${interaction.user} (${interaction.user.id})`, inline: false },
      { name: 'Ticket', value: `${ticketChannel}`, inline: true }
    )
    .setTimestamp();

  await sendTicketLog(interaction.client, category, { embeds: [logEmbed] });

  await interaction.reply({ content: `✅ Ticket creato: ${ticketChannel}`, ephemeral: true });
  return true;
}

async function handleTicketButton(interaction) {
  if (!interaction.isButton() || interaction.customId !== TICKET_CLOSE_ID) return false;

  const channel = interaction.channel;
  const isTicketByName = channel?.name?.startsWith('ticket-');
  const isTicketByTopic = channel?.topic?.includes('ticketOwner:');

  if (!channel || (!isTicketByName && !isTicketByTopic)) {
    await interaction.reply({ content: '❌ Questo pulsante può essere usato solo dentro un ticket.', ephemeral: true });
    return true;
  }

  const topic = channel.topic || '';
  const ownerMatch = topic.match(/ticketOwner:(\d+)/);
  const categoryMatch = topic.match(/ticketCategory:([a-z0-9_-]+)/);
  const ownerId = ownerMatch?.[1];
  const categoryKey = categoryMatch?.[1] || Object.keys(TICKET_CATEGORIES).find(k => channel.name?.startsWith(TICKET_CATEGORIES[k].channelPrefix)) || 'generale';
  const category = TICKET_CATEGORIES[categoryKey] || TICKET_CATEGORIES.generale;

  const staffRoleIds = [config.roles.ticketStaff, ...(config.roles.ticketStaffExtra || [])].filter(Boolean);
  const canClose =
    interaction.user.id === ownerId ||
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ||
    interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
    staffRoleIds.some(roleId => interaction.member.roles?.cache?.has(roleId));

  if (!canClose) {
    await interaction.reply({ content: '❌ Non hai i permessi per chiudere questo ticket.', ephemeral: true });
    return true;
  }

  const logEmbed = new EmbedBuilder()
    .setTitle('🔒 Ticket chiuso')
    .setColor(0xff5555)
    .addFields(
      { name: 'Categoria', value: `${category.emoji} ${category.label}`, inline: true },
      { name: 'Ticket', value: `#${channel.name}`, inline: true },
      { name: 'Chiuso da', value: `${interaction.user} (${interaction.user.id})`, inline: false },
      { name: 'Aperto da', value: ownerId ? `<@${ownerId}> (${ownerId})` : 'N/D', inline: false }
    )
    .setTimestamp();

  await sendTicketLog(interaction.client, category, { embeds: [logEmbed] });

  await interaction.reply({ content: '🔒 Ticket chiuso. Verrà eliminato/archiviato tra 5 secondi.', ephemeral: true });
  setTimeout(() => {
    if (isThread(channel) && typeof channel.delete === 'function') {
      channel.delete(`Ticket chiuso da ${interaction.user.tag}`).catch(() => null);
    } else if (typeof channel.delete === 'function') {
      channel.delete(`Ticket chiuso da ${interaction.user.tag}`).catch(() => null);
    }
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
