const { EmbedBuilder } = require('discord.js');
const config = require('../../config');
const GRAND_PRIX = require('./grandPrix');
const { getDrivers, getDraw, getRaceResults, saveRaceResult } = require('./storage');

// Punteggio reale Formula 1: punti ai primi 10 classificati.
const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

function extractDiscordIds(text) {
  const ids = [];
  const regex = /<@!?(\d+)>|(\d{17,20})/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const id = match[1] || match[2];
    if (!ids.includes(id)) ids.push(id);
  }

  return ids;
}

function getGpByKey(key) {
  return GRAND_PRIX.find(gp => gp.key === key) || GRAND_PRIX[0];
}

function buildDriverTeamMap() {
  const draw = getDraw();
  const map = new Map();

  if (!draw.assignments) return map;

  for (const slot of draw.assignments) {
    for (const driver of slot.drivers || []) {
      map.set(driver.discordId, slot.team);
    }

    if (slot.reserve) {
      map.set(slot.reserve.discordId, `${slot.team} (Riserva)`);
    }
  }

  return map;
}

function getDriverDisplay(discordId) {
  const driver = getDrivers().find(d => d.discordId === discordId);
  return driver?.driverName || `<@${discordId}>`;
}

function getBaseDriverRows() {
  const drivers = getDrivers();
  const teamMap = buildDriverTeamMap();
  const rows = new Map();

  for (const driver of drivers) {
    if (driver.status !== 'approved') continue;

    const team = teamMap.get(driver.discordId) || driver.team || driver.reserveForTeam || 'Senza team';

    rows.set(driver.discordId, {
      discordId: driver.discordId,
      driverName: driver.driverName,
      team,
      points: 0,
      wins: 0,
      podiums: 0,
      races: 0,
      top10: 0,
      bestFinish: null,
      totalFinishPosition: 0,
      lastFinish: null
    });
  }

  return rows;
}

function calculateStandings() {
  const results = getRaceResults();
  const teamMap = buildDriverTeamMap();
  const driverTable = getBaseDriverRows();
  const teamTable = new Map();

  for (const row of driverTable.values()) {
    if (!teamTable.has(row.team)) {
      teamTable.set(row.team, {
        team: row.team,
        points: 0,
        wins: 0,
        podiums: 0,
        racesWithPoints: 0,
        top10: 0
      });
    }
  }

  for (const race of results) {
    race.positions.forEach((discordId, index) => {
      const finish = index + 1;
      const points = POINTS[index] || 0;
      const team = teamMap.get(discordId) || 'Senza team';

      const row = driverTable.get(discordId) || {
        discordId,
        driverName: getDriverDisplay(discordId),
        team,
        points: 0,
        wins: 0,
        podiums: 0,
        races: 0,
        top10: 0,
        bestFinish: null,
        totalFinishPosition: 0,
        lastFinish: null
      };

      row.points += points;
      row.races += 1;
      row.totalFinishPosition += finish;
      row.lastFinish = finish;
      row.bestFinish = row.bestFinish === null ? finish : Math.min(row.bestFinish, finish);
      if (finish === 1) row.wins += 1;
      if (finish <= 3) row.podiums += 1;
      if (finish <= 10) row.top10 += 1;
      driverTable.set(discordId, row);

      const teamRow = teamTable.get(row.team) || {
        team: row.team,
        points: 0,
        wins: 0,
        podiums: 0,
        racesWithPoints: 0,
        top10: 0
      };

      teamRow.points += points;
      if (finish === 1) teamRow.wins += 1;
      if (finish <= 3) teamRow.podiums += 1;
      if (finish <= 10) teamRow.top10 += 1;
      if (points > 0) teamRow.racesWithPoints += 1;
      teamTable.set(row.team, teamRow);
    });
  }

  const driversStanding = [...driverTable.values()].sort((a, b) =>
    b.points - a.points ||
    b.wins - a.wins ||
    b.podiums - a.podiums ||
    (a.bestFinish || 99) - (b.bestFinish || 99)
  );

  const teamsStanding = [...teamTable.values()].sort((a, b) =>
    b.points - a.points ||
    b.wins - a.wins ||
    b.podiums - a.podiums
  );

  return { driversStanding, teamsStanding };
}

function buildStandingsEmbed() {
  const { driversStanding, teamsStanding } = calculateStandings();

  const driversText = driversStanding.slice(0, 22).map((d, i) =>
    `**${i + 1}.** <@${d.discordId}> — **${d.points} pt** (${d.team})`
  ).join('\n') || 'Nessun risultato.';

  const teamsText = teamsStanding.map((t, i) =>
    `**${i + 1}.** ${t.team} — **${t.points} pt**`
  ).join('\n') || 'Nessuna scuderia.';

  return new EmbedBuilder()
    .setTitle('🏆 Classifica Campionato F1')
    .setColor(0xffcc00)
    .addFields(
      { name: '👤 Classifica Piloti', value: driversText.length > 1024 ? driversText.slice(0, 1020) + '...' : driversText },
      { name: '🏎️ Classifica Scuderie', value: teamsText.length > 1024 ? teamsText.slice(0, 1020) + '...' : teamsText }
    )
    .setFooter({ text: 'Punteggio reale F1: 25-18-15-12-10-8-6-4-2-1' })
    .setTimestamp();
}

function buildRaceResultEmbed(gp, positions) {
  const description = positions.map((id, i) => {
    const points = POINTS[i] || 0;
    return `**${i + 1}.** <@${id}> — **${points} pt**`;
  }).join('\n');

  return new EmbedBuilder()
    .setTitle(`🏁 Resoconto risultati • ${gp.name}`)
    .setColor(0x00aa55)
    .setDescription(description || 'Nessun risultato inserito.')
    .setFooter({ text: `${gp.circuit} • Punteggio ufficiale F1` })
    .setTimestamp();
}

function buildStatsEmbed(gp) {
  const { driversStanding, teamsStanding } = calculateStandings();
  const leader = driversStanding[0];
  const constructorLeader = teamsStanding[0];

  const driverStats = driversStanding.slice(0, 10).map((d, i) => {
    const avg = d.races > 0 ? (d.totalFinishPosition / d.races).toFixed(1) : '-';
    const best = d.bestFinish ? `${d.bestFinish}°` : '-';
    return `**${i + 1}.** <@${d.discordId}> — ${d.points} pt | 🥇 ${d.wins} | 🏆 ${d.podiums} | GP ${d.races} | Best ${best} | Media ${avg}`;
  }).join('\n') || 'Nessuna statistica disponibile.';

  const teamStats = teamsStanding.slice(0, 11).map((t, i) =>
    `**${i + 1}.** ${t.team} — ${t.points} pt | 🥇 ${t.wins} | 🏆 ${t.podiums} | Top10 ${t.top10}`
  ).join('\n') || 'Nessuna statistica scuderie.';

  return new EmbedBuilder()
    .setTitle(`📊 Statistiche aggiornate dopo ${gp.name}`)
    .setColor(0x3498db)
    .setDescription(
      `👑 Leader piloti: ${leader ? `<@${leader.discordId}> con **${leader.points} pt**` : 'N/D'}\n` +
      `🏎️ Leader scuderie: ${constructorLeader ? `**${constructorLeader.team}** con **${constructorLeader.points} pt**` : 'N/D'}`
    )
    .addFields(
      { name: '👤 Statistiche Piloti', value: driverStats.length > 1024 ? driverStats.slice(0, 1020) + '...' : driverStats },
      { name: '🏎️ Statistiche Scuderie', value: teamStats.length > 1024 ? teamStats.slice(0, 1020) + '...' : teamStats }
    )
    .setFooter({ text: 'Statistiche automatiche BORDO GAMING F1' })
    .setTimestamp();
}

function buildRaceNewsEmbed(gp, positions) {
  const podium = positions.slice(0, 3);
  const winner = podium[0] ? `<@${podium[0]}>` : 'N/D';
  const second = podium[1] ? `<@${podium[1]}>` : 'N/D';
  const third = podium[2] ? `<@${podium[2]}>` : 'N/D';
  const { driversStanding, teamsStanding } = calculateStandings();
  const leader = driversStanding[0];
  const constructorLeader = teamsStanding[0];

  return new EmbedBuilder()
    .setTitle(`📰 F1 News • ${gp.name}`)
    .setColor(0xff0000)
    .setDescription(
      `Si è concluso il **${gp.name} – ${gp.circuit}** del campionato BORDO GAMING.\n\n` +
      `🏆 Vittoria per ${winner}, protagonista assoluto della gara.\n` +
      `🥈 Seconda posizione per ${second}.\n` +
      `🥉 Terzo gradino del podio per ${third}.\n\n` +
      `📊 Dopo questo GP, ${leader ? `<@${leader.discordId}> guida la classifica piloti con **${leader.points} punti**` : 'la classifica piloti è stata aggiornata'}.\n` +
      `🏎️ Nei costruttori, ${constructorLeader ? `**${constructorLeader.team}** è al comando con **${constructorLeader.points} punti**` : 'la classifica scuderie è stata aggiornata'}.\n\n` +
      `Classifiche, statistiche e resoconto gara sono stati pubblicati automaticamente.`
    )
    .setFooter({ text: 'BORDO GAMING MEDIA • F1 Championship' })
    .setTimestamp();
}

async function sendToChannel(client, channelId, payload) {
  if (!channelId) return false;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return false;
  await channel.send(payload);
  return true;
}

const resultSessions = new Map();

function getSessionKey(interaction) {
  return `${interaction.guildId}:${interaction.user.id}`;
}

function getRemainingRaces() {
  const calendar = require('./storage').getCalendar();
  const savedResults = getRaceResults();
  const completed = new Set(savedResults.map(r => r.gpKey));
  const source = Array.isArray(calendar) && calendar.length ? calendar : GRAND_PRIX;
  return source.filter(gp => !completed.has(gp.key));
}

function getEligibleDriversForResults(session) {
  const selected = new Set(session.positions || []);
  return getDrivers()
    .filter(d => d.status === 'approved')
    .filter(d => !selected.has(d.discordId))
    .slice(0, 25);
}

function buildRaceSelectRow() {
  const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
  const remaining = getRemainingRaces().slice(0, 25);

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('f1_results_race_select')
      .setPlaceholder('Seleziona la gara disputata')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        remaining.map((gp, index) => ({
          label: `${index + 1}. ${gp.name}`.slice(0, 100),
          description: (gp.date ? `${gp.circuit} • ${gp.date}` : gp.circuit).slice(0, 100),
          value: gp.key
        }))
      )
  );
}

function buildDriverSelectRow(session) {
  const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
  const drivers = getEligibleDriversForResults(session);
  const position = (session.positions?.length || 0) + 1;

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('f1_results_driver_select')
      .setPlaceholder(`Seleziona il pilota arrivato ${position}°`)
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        drivers.map((driver, index) => ({
          label: `${index + 1}. ${driver.driverName || driver.discordName || driver.discordId}`.slice(0, 100),
          description: `${driver.console || 'Console N/D'} • ${driver.consoleTag || driver.gamertag || 'Tag N/D'}`.slice(0, 100),
          value: driver.discordId
        }))
      )
  );
}

function buildResultActionRow(canFinish) {
  const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
  const finishButton = new ButtonBuilder()
    .setCustomId('f1_results_finish')
    .setLabel('Conferma e pubblica risultati')
    .setEmoji('✅')
    .setStyle(ButtonStyle.Success)
    .setDisabled(!canFinish);

  const cancelButton = new ButtonBuilder()
    .setCustomId('f1_results_cancel')
    .setLabel('Annulla')
    .setEmoji('❌')
    .setStyle(ButtonStyle.Danger);

  return new ActionRowBuilder().addComponents(finishButton, cancelButton);
}

function buildResultsProgressContent(session) {
  const gp = session.gp;
  const selectedList = (session.positions || [])
    .map((id, i) => `**${i + 1}.** <@${id}> — ${POINTS[i] || 0} pt`)
    .join('\n') || 'Nessun pilota selezionato.';

  const nextPosition = (session.positions?.length || 0) + 1;
  const remainingDrivers = getEligibleDriversForResults(session).length;

  return (
    `🏁 **Inserimento risultati F1 guidato**\n\n` +
    `Gran Premio: **${gp.name} – ${gp.circuit}**${gp.date ? `\nData: **${gp.date}**` : ''}\n\n` +
    `📋 **Classifica inserita finora:**\n${selectedList}\n\n` +
    (remainingDrivers > 0
      ? `Ora seleziona il pilota arrivato **${nextPosition}°**.\nIl primo selezionato sarà P1, il secondo P2 e così via.`
      : `Tutti i piloti disponibili sono stati inseriti. Premi conferma per pubblicare.`)
  );
}

async function publishResult(interaction, session) {
  const gp = session.gp;
  const positions = session.positions || [];

  if (positions.length < 1) {
    return interaction.reply({ content: '❌ Devi selezionare almeno un pilota.', ephemeral: true });
  }

  const result = saveRaceResult({
    gpKey: gp.key,
    gpName: gp.name,
    circuit: gp.circuit,
    date: gp.date || null,
    positions,
    insertedBy: interaction.user.id
  });

  const resultEmbed = buildRaceResultEmbed(gp, result.positions);
  const standingsEmbed = buildStandingsEmbed();
  const statsEmbed = buildStatsEmbed(gp);
  const newsEmbed = buildRaceNewsEmbed(gp, result.positions);

  await sendToChannel(interaction.client, config.channels.f1RaceResults, { embeds: [resultEmbed] });
  await sendToChannel(interaction.client, config.channels.f1Standings, { embeds: [standingsEmbed] });
  await sendToChannel(interaction.client, config.channels.f1Stats, { embeds: [statsEmbed] });
  await sendToChannel(interaction.client, config.channels.f1Media, { embeds: [newsEmbed] });

  resultSessions.delete(getSessionKey(interaction));

  return interaction.update({
    content:
      `✅ Risultati **${gp.name}** salvati e pubblicati.\n` +
      `📌 Resoconto pubblicato nel canale risultati.\n` +
      `🏆 Classifiche aggiornate.\n` +
      `📊 Statistiche pubblicate.\n` +
      `📰 Articolo news pubblicato.`,
    components: []
  });
}

async function handleRisultatiF1(interaction) {
  const remaining = getRemainingRaces();

  if (!remaining.length) {
    return interaction.reply({
      content: '✅ Non ci sono gare ancora da disputare. Tutti i risultati del calendario risultano già inseriti.',
      ephemeral: true
    });
  }

  return interaction.reply({
    ephemeral: true,
    content:
      '🏁 **Risultati F1 guidati**\n\n' +
      'Seleziona dall’elenco la gara disputata.\n' +
      'Poi selezionerai i piloti uno alla volta: il primo selezionato sarà **1°**, il secondo **2°**, e così via.',
    components: [buildRaceSelectRow()]
  });
}

async function handleResultsComponent(interaction) {
  if (interaction.isStringSelectMenu() && interaction.customId === 'f1_results_race_select') {
    const gpKey = interaction.values[0];
    const gp = getRemainingRaces().find(r => r.key === gpKey) || getGpByKey(gpKey);

    const drivers = getDrivers().filter(d => d.status === 'approved');
    if (!drivers.length) {
      await interaction.update({
        content: '❌ Non ci sono piloti approvati da inserire nei risultati.',
        components: []
      });
      return true;
    }

    const session = {
      gp,
      positions: [],
      createdAt: Date.now()
    };

    resultSessions.set(getSessionKey(interaction), session);

    await interaction.update({
      content: buildResultsProgressContent(session),
      components: [buildDriverSelectRow(session), buildResultActionRow(false)]
    });
    return true;
  }

  if (interaction.isStringSelectMenu() && interaction.customId === 'f1_results_driver_select') {
    const session = resultSessions.get(getSessionKey(interaction));
    if (!session) {
      await interaction.reply({ content: '❌ Sessione risultati scaduta. Usa di nuovo /risultati_f1.', ephemeral: true });
      return true;
    }

    const driverId = interaction.values[0];
    if (!session.positions.includes(driverId)) {
      session.positions.push(driverId);
    }

    resultSessions.set(getSessionKey(interaction), session);
    const remainingDrivers = getEligibleDriversForResults(session);
    const components = [];
    if (remainingDrivers.length > 0 && session.positions.length < 22) {
      components.push(buildDriverSelectRow(session));
    }
    components.push(buildResultActionRow(session.positions.length > 0));

    await interaction.update({
      content: buildResultsProgressContent(session),
      components
    });
    return true;
  }

  if (interaction.isButton() && interaction.customId === 'f1_results_finish') {
    const session = resultSessions.get(getSessionKey(interaction));
    if (!session) {
      await interaction.reply({ content: '❌ Sessione risultati scaduta. Usa di nuovo /risultati_f1.', ephemeral: true });
      return true;
    }

    await publishResult(interaction, session);
    return true;
  }

  if (interaction.isButton() && interaction.customId === 'f1_results_cancel') {
    resultSessions.delete(getSessionKey(interaction));
    await interaction.update({ content: '❌ Inserimento risultati F1 annullato.', components: [] });
    return true;
  }

  return false;
}

module.exports = {
  handleRisultatiF1,
  handleResultsComponent,
  calculateStandings,
  buildStandingsEmbed,
  buildStatsEmbed,
  POINTS
};
