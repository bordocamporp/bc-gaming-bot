const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const ROLES_CHANNEL_ID = '1513198775588618402';

const ROLE_GROUPS = {
  fc: {
    label: '⚽ FC 26',
    successLabel: 'FC 26',
    roles: ['1512903280437624904', '1512903546939510885']
  },
  proclub: {
    label: '👥 PRO CLUB',
    successLabel: 'PRO CLUB',
    roles: ['1512905330391126097', '1513200676833067160']
  },
  f1: {
    label: '🏎️ FORMULA 1',
    successLabel: 'FORMULA 1',
    roles: ['1513218778836766790', '1512903200221564979']
  },
  fm: {
    label: '📋 FOOTBALL MANAGER',
    successLabel: 'FOOTBALL MANAGER',
    roles: ['1512903635384926318', '1512903801097683015']
  },
  live: {
    label: '🔔 LIVE MATCH',
    successLabel: 'LIVE MATCH',
    roles: ['1513565990208667648']
  }
};

function buildRolesPanelEmbed() {
  return new EmbedBuilder()
    .setTitle('🎭 SCEGLI I TUOI RUOLI')
    .setColor(0x8A2BE2)
    .setDescription(
      `Personalizza la tua esperienza su **BC Gaming Community**.\n\n` +
      `**1️⃣ ⚽ FC 26**\n` +
      `Tornei, eventi, classifiche e competizioni FC.\n\n` +
      `**2️⃣ 👥 PRO CLUB**\n` +
      `Club, provini, competizioni e attività Pro Club.\n\n` +
      `**3️⃣ 🏎️ FORMULA 1**\n` +
      `Campionati, classifiche piloti e costruttori.\n\n` +
      `**4️⃣ 📋 FOOTBALL MANAGER**\n` +
      `Carriere online, sfide e contenuti Football Manager.\n\n` +
      `**5️⃣ 🔔 LIVE MATCH**\n` +
      `Notifiche per partite ed eventi live.\n\n` +
      `📌 Clicca una volta per ricevere i ruoli. Clicca di nuovo per rimuoverli.`
    )
    .setFooter({ text: 'BC Gaming Community • Gioca • Competi • Vinci' });
}

function buildRolesPanelRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('role_fc')
        .setLabel('FC 26')
        .setEmoji('⚽')
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId('role_proclub')
        .setLabel('PRO CLUB')
        .setEmoji('👥')
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId('role_f1')
        .setLabel('FORMULA 1')
        .setEmoji('🏎️')
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId('role_fm')
        .setLabel('FOOTBALL MANAGER')
        .setEmoji('📋')
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId('role_live')
        .setLabel('LIVE MATCH')
        .setEmoji('🔔')
        .setStyle(ButtonStyle.Success)
    )
  ];
}

async function sendRolesPanel(client) {
  const channel = await client.channels.fetch(ROLES_CHANNEL_ID).catch(() => null);

  if (!channel) {
    console.log('❌ Canale ruoli non trovato');
    return false;
  }

  await channel.send({
    embeds: [buildRolesPanelEmbed()],
    components: buildRolesPanelRows()
  });

  console.log('✅ Pannello ruoli inviato');
  return true;
}

async function handleRoleButton(interaction) {
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith('role_')) return;

  const key = interaction.customId.replace('role_', '');
  const group = ROLE_GROUPS[key];

  if (!group) return;

  const member = interaction.member;
  const guild = interaction.guild;

  if (!member || !guild) {
    return interaction.reply({
      content: '❌ Operazione disponibile solo nel server.',
      ephemeral: true
    });
  }

  const roles = group.roles
    .map(roleId => guild.roles.cache.get(roleId))
    .filter(Boolean);

  if (roles.length !== group.roles.length) {
    return interaction.reply({
      content: '❌ Uno o più ruoli non sono stati trovati. Contatta lo staff.',
      ephemeral: true
    });
  }

  const botMember = guild.members.me;

  const notManageable = roles.filter(role =>
    !botMember ||
    !role.editable ||
    botMember.roles.highest.position <= role.position
  );

  if (notManageable.length > 0) {
    return interaction.reply({
      content:
        '❌ Non posso assegnare questi ruoli. Sposta il ruolo del bot sopra i ruoli FC/Pro Club/F1/FM/Live Match.',
      ephemeral: true
    });
  }

  const hasEveryRole = group.roles.every(roleId =>
    member.roles.cache.has(roleId)
  );

  if (hasEveryRole) {
    await member.roles.remove(roles, `Rimozione ruoli ${group.successLabel} tramite pannello`);

    return interaction.reply({
      content: `❌ Hai rimosso i ruoli **${group.label}**.`,
      ephemeral: true
    });
  }

  await member.roles.add(roles, `Assegnazione ruoli ${group.successLabel} tramite pannello`);

  return interaction.reply({
    content: `✅ Hai ricevuto i ruoli **${group.label}**.`,
    ephemeral: true
  });
}

module.exports = {
  sendRolesPanel,
  handleRoleButton,
  buildRolesPanelEmbed,
  buildRolesPanelRows
};
