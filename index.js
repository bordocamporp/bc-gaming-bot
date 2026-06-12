require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Collection,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits
} = require('discord.js');

const config = require('./config');
const { saveUser, testConnection } = require('./database');

const { publishF1RegistrationPanel, handleF1Button, handleF1Modal } = require('./modules/f1/registration');
const { startF1Draw, handleF1DrawButton, handleF1DrawModal } = require('./modules/f1/draw');
const { handleResetF1 } = require('./modules/f1/reset');
const { handleRealizzaCalendarioF1, handleCalendarComponent, handleCalendarModal } = require('./modules/f1/calendar');
const { handleRisultatiF1, handleResultsComponent } = require('./modules/f1/results');

const { startNewsScheduler, checkNewsOnce } = require('./modules/news/newsService');
const {
  publishLookingForPlayersPanel,
  handleLookingForPlayersButton,
  handleLookingForPlayersModal
} = require('./modules/community/lookingForPlayers');
const { publishClipsScreensPanel } = require('./modules/community/clipsScreensPanel');
const { publishTicketPanel, handleTicketSelect, handleTicketButton } = require('./modules/tickets');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();

const slashCommands = [
  new SlashCommandBuilder()
    .setName('pubblica_f1')
    .setDescription('Staff: pubblica il pannello iscrizioni F1')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),

  new SlashCommandBuilder()
    .setName('f1_sorteggio')
    .setDescription('Staff: avvia il sorteggio casuale dei piloti nei team F1')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),

  new SlashCommandBuilder()
    .setName('resetta_f1')
    .setDescription('Owner: resetta completamente iscrizioni, sorteggio, calendario, risultati e ruoli F1')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('realizza_calendario_f1')
    .setDescription('Staff: crea il calendario F1 con menu selezionabile e date guidate')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),

  new SlashCommandBuilder()
    .setName('risultati_f1')
    .setDescription('Staff: inserisce i risultati gara con selezione guidata di GP e piloti')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),

  new SlashCommandBuilder()
    .setName('pubblica_cerco_compagni')
    .setDescription('Staff: pubblica il pannello CERCO COMPAGNI')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),

  new SlashCommandBuilder()
    .setName('pubblica_clip_screen')
    .setDescription('Staff: pubblica il messaggio guida per CLIP E SCREEN')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),

  new SlashCommandBuilder()
    .setName('news_check')
    .setDescription('Staff: controlla subito i feed news e pubblica le ultime notizie')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),

  new SlashCommandBuilder()
    .setName('pubblica_ticket')
    .setDescription('Staff: pubblica il pannello di apertura ticket')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON()
];

async function registerSlashCommands() {
  try {
    const rest = new REST({ version: '10' }).setToken(config.token);

    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: slashCommands }
    );

    console.log('✅ Slash commands registrati:', slashCommands.map(c => `/${c.name}`).join(', '));
  } catch (error) {
    console.error('❌ Errore registrazione slash commands:', error);
  }
}

client.once('clientReady', async () => {
  console.log(`✅ BORDO CAMPO Bot online come ${client.user.tag}`);

  await testConnection();
  await registerSlashCommands();

  startNewsScheduler(client);

  console.log('✅ Sistema F1 pronto');
  console.log('✅ Sistema news pronto');
  console.log('✅ Sistema CERCO COMPAGNI pronto');
  console.log('✅ Sistema TICKET pronto');
});

client.on('guildMemberAdd', async (member) => {
  try {
    console.log(`👤 Nuovo membro: ${member.user.tag}`);
    await saveUser(member);
  } catch (err) {
    console.error('❌ Errore guildMemberAdd:', err);
  }
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isStringSelectMenu()) {
      if (await handleTicketSelect(interaction)) return;
      if (await handleResultsComponent(interaction)) return;
      if (await handleCalendarComponent(interaction)) return;
      return;
    }

    if (interaction.isButton()) {
      if (await handleTicketButton(interaction)) return;
      if (await handleResultsComponent(interaction)) return;
      if (await handleCalendarComponent(interaction)) return;
      if (await handleLookingForPlayersButton(interaction)) return;
      if (await handleF1Button(interaction)) return;
      if (await handleF1DrawButton(interaction)) return;
      return;
    }

    if (interaction.isModalSubmit()) {
      if (await handleLookingForPlayersModal(interaction)) return;
      if (await handleCalendarModal(interaction)) return;
      if (await handleF1Modal(interaction)) return;
      if (await handleF1DrawModal(interaction)) return;
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'resetta_f1') {
      await handleResetF1(interaction);
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: '❌ Solo lo staff autorizzato può usare questo comando.',
        ephemeral: true
      });
    }

    if (interaction.commandName === 'pubblica_f1') {
      await interaction.deferReply({ ephemeral: true });
      await publishF1RegistrationPanel(client);
      await interaction.editReply('✅ Pannello iscrizioni F1 pubblicato nel canale iscrizione.');
      return;
    }

    if (interaction.commandName === 'f1_sorteggio') {
      await startF1Draw(interaction);
      return;
    }

    if (interaction.commandName === 'realizza_calendario_f1') {
      await handleRealizzaCalendarioF1(interaction);
      return;
    }

    if (interaction.commandName === 'risultati_f1') {
      await handleRisultatiF1(interaction);
      return;
    }

    if (interaction.commandName === 'pubblica_cerco_compagni') {
      await interaction.deferReply({ ephemeral: true });
      await publishLookingForPlayersPanel(client);
      await interaction.editReply('✅ Pannello CERCO COMPAGNI pubblicato.');
      return;
    }

    if (interaction.commandName === 'pubblica_clip_screen') {
      await interaction.deferReply({ ephemeral: true });
      await publishClipsScreensPanel(client);
      await interaction.editReply('✅ Messaggio CLIP E SCREEN pubblicato.');
      return;
    }

    if (interaction.commandName === 'news_check') {
      await interaction.deferReply({ ephemeral: true });
      const report = await checkNewsOnce(client, { manual: true });
      await interaction.editReply(`📰 **Controllo news completato**\n\n${report.map(x => `• ${x}`).join('\n')}`);
      return;
    }

    if (interaction.commandName === 'pubblica_ticket') {
      await interaction.deferReply({ ephemeral: true });
      await publishTicketPanel(client);
      await interaction.editReply('✅ Pannello ticket pubblicato.');
      return;
    }
  } catch (error) {
    console.error('❌ Errore interactionCreate:', error);

    if (interaction.isRepliable()) {
      const payload = {
        content: '❌ Si è verificato un errore. Contatta lo staff.',
        ephemeral: true
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  }
});

client.on('error', (error) => {
  console.error('❌ Errore Discord Client:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

client.login(config.token);
