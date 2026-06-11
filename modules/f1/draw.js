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
const TEAMS = require('./teams');
const { getApprovedDrivers, saveDrivers, getDrivers, saveDraw, resetDrawAssignments } = require('./storage');

const IDS = {
  reserveYes: 'f1_draw_reserves_yes',
  reserveNo: 'f1_draw_reserves_no',
  reserveModal: 'f1_draw_reserves_modal',
  reserveTeamsCount: 'f1_reserve_teams_count',
  confirmNoReserves: 'f1_draw_confirm_no_reserves',
  publishLatest: 'f1_draw_publish_latest'
};

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildDraw({ reserveTeamsCount = 0 }) {
  resetDrawAssignments();

  const approved = shuffle(getApprovedDrivers());
  const driversNeeded = TEAMS.length * 2;
  const reserveTeams = shuffle(TEAMS).slice(0, Math.max(0, Math.min(reserveTeamsCount, TEAMS.length)));
  const totalSlots = driversNeeded + reserveTeams.length;

  const selected = approved.slice(0, totalSlots);
  const notDrawn = approved.slice(totalSlots);

  const assignments = TEAMS.map(team => ({
    team,
    drivers: [],
    reserve: null
  }));

  let index = 0;

  for (const teamSlot of assignments) {
    for (let i = 0; i < 2; i++) {
      if (!selected[index]) break;
      teamSlot.drivers.push(selected[index]);
      index++;
    }
  }

  for (const team of reserveTeams) {
    if (!selected[index]) break;
    const teamSlot = assignments.find(t => t.team === team);
    teamSlot.reserve = selected[index];
    index++;
  }

  const allDrivers = getDrivers();
  const updatedDrivers = allDrivers.map(driver => {
    let patch = { team: null, isReserve: false, reserveForTeam: null };

    for (const slot of assignments) {
      if (slot.drivers.some(d => d.discordId === driver.discordId)) {
        patch = { team: slot.team, isReserve: false, reserveForTeam: null };
      }

      if (slot.reserve?.discordId === driver.discordId) {
        patch = { team: null, isReserve: true, reserveForTeam: slot.team };
      }
    }

    return { ...driver, ...patch };
  });

  saveDrivers(updatedDrivers);

  const draw = {
    reserveTeamsCount,
    reserveTeams,
    assignments: assignments.map(slot => ({
      team: slot.team,
      drivers: slot.drivers.map(d => ({ discordId: d.discordId, driverName: d.driverName, console: d.console })),
      reserve: slot.reserve ? { discordId: slot.reserve.discordId, driverName: slot.reserve.driverName, console: slot.reserve.console } : null
    })),
    notDrawn: notDrawn.map(d => ({ discordId: d.discordId, driverName: d.driverName, console: d.console })),
    stats: {
      approvedDrivers: approved.length,
      officialSlots: driversNeeded,
      reserveSlots: reserveTeams.length,
      usedDrivers: selected.length
    }
  };

  saveDraw(draw);
  return draw;
}

function buildDrawEmbed(draw) {
  const lines = [];

  for (const slot of draw.assignments) {
    const d1 = slot.drivers[0] ? `• ${slot.drivers[0].driverName} (<@${slot.drivers[0].discordId}>)` : '• Libero';
    const d2 = slot.drivers[1] ? `• ${slot.drivers[1].driverName} (<@${slot.drivers[1].discordId}>)` : '• Libero';
    const reserve = slot.reserve ? `\n• ${slot.reserve.driverName} (<@${slot.reserve.discordId}>) - Riserva` : '';

    lines.push(`**${slot.team}**\n${d1}\n${d2}${reserve}`);
  }

  const embed = new EmbedBuilder()
    .setTitle('🏎️ Sorteggio Team F1')
    .setDescription(lines.join('\n\n'))
    .setColor(0xff0000)
    .addFields(
      { name: 'Piloti approvati', value: String(draw.stats.approvedDrivers), inline: true },
      { name: 'Posti ufficiali', value: String(draw.stats.officialSlots), inline: true },
      { name: 'Scuderie con riserva', value: String(draw.reserveTeamsCount), inline: true }
    )
    .setFooter({ text: 'Ogni team ha massimo 2 piloti ufficiali. I team completi vengono bloccati automaticamente.' })
    .setTimestamp();

  if (draw.notDrawn.length) {
    embed.addFields({
      name: 'Non sorteggiati per mancanza posti',
      value: draw.notDrawn.map(d => `• ${d.driverName} (<@${d.discordId}>)`).slice(0, 20).join('\n')
    });
  }

  return embed;
}

async function startF1Draw(interaction) {
  const approved = getApprovedDrivers();

  const embed = new EmbedBuilder()
    .setTitle('🏎️ Sorteggio F1')
    .setDescription(
      `Piloti approvati trovati: **${approved.length}**\n\n` +
      `Le scuderie sono **${TEAMS.length}** e ogni scuderia può avere massimo **2 piloti ufficiali**.\n\n` +
      'Vuoi attivare le riserve prima del sorteggio?'
    )
    .setColor(0xffcc00);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(IDS.reserveYes)
      .setLabel('Sì, usa riserve')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(IDS.reserveNo)
      .setLabel('No, sorteggia senza riserve')
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

async function handleF1DrawButton(interaction) {
  if (interaction.customId === IDS.reserveYes) {
    const modal = new ModalBuilder()
      .setCustomId(IDS.reserveModal)
      .setTitle('Riserve F1');

    const countInput = new TextInputBuilder()
      .setCustomId(IDS.reserveTeamsCount)
      .setLabel('Quante scuderie avranno una riserva?')
      .setPlaceholder('Da 1 a 11')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(2);

    modal.addComponents(new ActionRowBuilder().addComponents(countInput));
    await interaction.showModal(modal);
    return true;
  }

  if (interaction.customId === IDS.reserveNo) {
    const draw = buildDraw({ reserveTeamsCount: 0 });
    const embed = buildDrawEmbed(draw);

    await interaction.update({
      content: '✅ Sorteggio completato senza riserve.',
      embeds: [embed],
      components: []
    });

    const channel = await interaction.client.channels.fetch(config.channels.f1Paddock || config.channels.f1DrawResults).catch(() => null);
    if (channel) await channel.send({ content: '🏎️ **Sorteggio ufficiale pubblicato nel paddock**', embeds: [embed] });
    return true;
  }

  return false;
}

async function handleF1DrawModal(interaction) {
  if (interaction.customId !== IDS.reserveModal) return false;

  const rawCount = interaction.fields.getTextInputValue(IDS.reserveTeamsCount).trim();
  const count = Number.parseInt(rawCount, 10);

  if (!Number.isInteger(count) || count < 1 || count > TEAMS.length) {
    await interaction.reply({
      content: `❌ Numero non valido. Inserisci un numero da 1 a ${TEAMS.length}.`,
      ephemeral: true
    });
    return true;
  }

  const draw = buildDraw({ reserveTeamsCount: count });
  const embed = buildDrawEmbed(draw);

  await interaction.reply({
    content: `✅ Sorteggio completato con **${count}** scuderie con riserva.`,
    embeds: [embed],
    ephemeral: true
  });

  const channel = await interaction.client.channels.fetch(config.channels.f1Paddock || config.channels.f1DrawResults).catch(() => null);
  if (channel) await channel.send({ content: '🏎️ **Sorteggio ufficiale pubblicato nel paddock**', embeds: [embed] });
  return true;
}

module.exports = {
  startF1Draw,
  handleF1DrawButton,
  handleF1DrawModal,
  buildDraw,
  buildDrawEmbed
};
