const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const config = require('../../config');
const GRAND_PRIX = require('./grandPrix');
const { saveCalendar } = require('./storage');

const calendarSessions = new Map();

function buildGrandPrixList() {
  return GRAND_PRIX.map((gp, i) => `${i + 1}. ${gp.name} – ${gp.circuit}`).join('\n');
}

function buildCalendarEmbed(calendar) {
  const list = calendar
    .map((gp, index) => `**${index + 1}. ${gp.name} – ${gp.circuit}**\n📅 ${gp.date}`)
    .join('\n\n');

  return new EmbedBuilder()
    .setTitle('📅 Calendario Campionato F1')
    .setDescription(list || 'Nessuna gara inserita.')
    .setColor(0x00aaff)
    .setFooter({ text: 'BORDO GAMING • Calendario F1' })
    .setTimestamp();
}

function buildCalendarSelectRow() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('f1_calendar_select')
      .setPlaceholder('Seleziona i Gran Premi da inserire nel calendario')
      .setMinValues(1)
      .setMaxValues(GRAND_PRIX.length)
      .addOptions(
        GRAND_PRIX.map((gp, index) => ({
          label: `${index + 1}. ${gp.name}`.slice(0, 100),
          description: gp.circuit.slice(0, 100),
          value: gp.key
        }))
      )
  );
}

function getSessionKey(interaction) {
  return `${interaction.guildId}:${interaction.user.id}`;
}

function getSelectedGps(keys) {
  return GRAND_PRIX.filter(gp => keys.includes(gp.key));
}

function buildProgressText(session) {
  const done = session.selected.filter(gp => session.dates[gp.key]).length;
  const total = session.selected.length;
  const current = session.selected[session.currentIndex];

  const completedList = session.selected
    .filter(gp => session.dates[gp.key])
    .map(gp => `✅ **${gp.name} – ${gp.circuit}**: ${session.dates[gp.key]}`)
    .join('\n');

  return (
    `📅 **Creazione calendario F1**\n\n` +
    `Progresso: **${done}/${total}** date inserite.\n\n` +
    (completedList ? `${completedList}\n\n` : '') +
    `Ora devi inserire la data per:\n` +
    `🏁 **${current.name} – ${current.circuit}**\n\n` +
    `Formato consigliato: **08.09.2026**`
  );
}

function buildDateButtonRow(session) {
  const current = session.selected[session.currentIndex];
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`f1_calendar_date_btn_${current.key}`)
      .setLabel(`Inserisci data: ${current.name}`.slice(0, 80))
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📅')
  );
}

function buildDateModal(gp) {
  const modal = new ModalBuilder()
    .setCustomId(`f1_calendar_date_modal_${gp.key}`)
    .setTitle(`Data ${gp.name}`.slice(0, 45));

  const dateInput = new TextInputBuilder()
    .setCustomId('date')
    .setLabel(`Data per ${gp.name} – ${gp.circuit}`.slice(0, 45))
    .setPlaceholder('Esempio: 08.09.2026')
    .setRequired(true)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(20);

  modal.addComponents(new ActionRowBuilder().addComponents(dateInput));
  return modal;
}

async function publishCalendar(interaction, session) {
  const calendar = session.selected.map(gp => ({
    ...gp,
    date: session.dates[gp.key]
  }));

  saveCalendar(calendar);

  const embed = buildCalendarEmbed(calendar);
  const channel = await interaction.client.channels.fetch(config.channels.f1Calendar).catch(() => null);
  if (!channel) {
    return interaction.reply({ content: '❌ Canale calendario F1 non trovato.', ephemeral: true });
  }

  await channel.send({ embeds: [embed] });
  calendarSessions.delete(getSessionKey(interaction));

  return interaction.reply({
    ephemeral: true,
    content: `✅ Calendario F1 completato e pubblicato nel canale calendario con **${calendar.length}** Gran Premi.`
  });
}

async function handleRealizzaCalendarioF1(interaction) {
  return interaction.reply({
    ephemeral: true,
    content:
      '📅 **Calendario F1 guidato**\n\n' +
      'Seleziona dall’elenco qui sotto tutti i Gran Premi che vuoi inserire nel calendario.\n' +
      'Dopo la selezione, il bot ti chiederà la data di ogni gara una alla volta.',
    components: [buildCalendarSelectRow()]
  });
}

async function handleCalendarComponent(interaction) {
  if (interaction.isStringSelectMenu() && interaction.customId === 'f1_calendar_select') {
    const selected = getSelectedGps(interaction.values);
    if (!selected.length) {
      await interaction.reply({ content: '❌ Nessun Gran Premio selezionato.', ephemeral: true });
      return true;
    }

    const session = {
      selected,
      dates: {},
      currentIndex: 0,
      createdAt: Date.now()
    };

    calendarSessions.set(getSessionKey(interaction), session);

    await interaction.update({
      content: buildProgressText(session),
      components: [buildDateButtonRow(session)]
    });
    return true;
  }

  if (interaction.isButton() && interaction.customId.startsWith('f1_calendar_date_btn_')) {
    const session = calendarSessions.get(getSessionKey(interaction));
    if (!session) {
      await interaction.reply({ content: '❌ Sessione calendario scaduta. Usa di nuovo `/realizza_calendario_f1`.', ephemeral: true });
      return true;
    }

    const gpKey = interaction.customId.replace('f1_calendar_date_btn_', '');
    const current = session.selected[session.currentIndex];

    if (!current || current.key !== gpKey) {
      await interaction.reply({ content: '❌ Questo pulsante non è più valido. Continua dall’ultimo messaggio del bot.', ephemeral: true });
      return true;
    }

    await interaction.showModal(buildDateModal(current));
    return true;
  }

  return false;
}

async function handleCalendarModal(interaction) {
  if (!interaction.isModalSubmit() || !interaction.customId.startsWith('f1_calendar_date_modal_')) return false;

  const session = calendarSessions.get(getSessionKey(interaction));
  if (!session) {
    await interaction.reply({ content: '❌ Sessione calendario scaduta. Usa di nuovo `/realizza_calendario_f1`.', ephemeral: true });
    return true;
  }

  const gpKey = interaction.customId.replace('f1_calendar_date_modal_', '');
  const current = session.selected[session.currentIndex];
  const date = interaction.fields.getTextInputValue('date').trim();

  if (!current || current.key !== gpKey) {
    await interaction.reply({ content: '❌ Gran Premio non valido. Usa di nuovo `/realizza_calendario_f1`.', ephemeral: true });
    return true;
  }

  session.dates[current.key] = date;
  session.currentIndex += 1;

  if (session.currentIndex >= session.selected.length) {
    await publishCalendar(interaction, session);
    return true;
  }

  calendarSessions.set(getSessionKey(interaction), session);

  await interaction.reply({
    ephemeral: true,
    content: buildProgressText(session),
    components: [buildDateButtonRow(session)]
  });
  return true;
}

module.exports = {
  handleRealizzaCalendarioF1,
  handleCalendarComponent,
  handleCalendarModal,
  buildGrandPrixList,
  buildCalendarEmbed
};
