require('dotenv').config();

function csv(value) {
  return String(value || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
}

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,

  channels: {
    logs: process.env.LOG_CHANNEL_ID || '1514358697521053749',

    // F1
    f1Registration: process.env.F1_REGISTRATION_CHANNEL_ID || '1514358636019712100',
    f1StaffRequests: process.env.F1_STAFF_REQUESTS_CHANNEL_ID || '1514358700486430810',
    f1Paddock: process.env.F1_PADDOCK_CHANNEL_ID || '1514358677639790733',
    f1DrawResults: process.env.F1_PADDOCK_CHANNEL_ID || '1514358677639790733',
    f1Races: process.env.F1_RACES_CHANNEL_ID || '1514358679388946662',
    f1Calendar: process.env.F1_CALENDAR_CHANNEL_ID || '1514358681192366141',
    f1RaceResults: process.env.F1_RACE_RESULTS_CHANNEL_ID || '1514358682807173150',
    f1Standings: process.env.F1_STANDINGS_CHANNEL_ID || '1514358684820570142',
    f1Stats: process.env.F1_STATS_CHANNEL_ID || '1514358686942761010',
    f1Media: process.env.F1_MEDIA_CHANNEL_ID || '1514358689320931460',

    // NEWS / COMMUNITY
    newsGaming: process.env.NEWS_GAMING_CHANNEL_ID || '1514358606584352962',
    newsSport: process.env.NEWS_SPORT_CHANNEL_ID || '1514615319044558908',
    newsFc: process.env.NEWS_FC_CHANNEL_ID || '1514358613362081802',
    newsF1: process.env.NEWS_F1_CHANNEL_ID || '1514358632454688779',
    newsFootballManager: process.env.NEWS_FOOTBALL_MANAGER_CHANNEL_ID || '1514358640297902253',
    clipsScreens: process.env.CLIPS_SCREENS_CHANNEL_ID || '1514358605548097637',
    lookingForPlayers: process.env.LOOKING_FOR_PLAYERS_CHANNEL_ID || '1514358604357042287',

    // TICKET
    ticketPanel: process.env.TICKET_PANEL_CHANNEL_ID || '1514630586915098654',
    ticketLogsGeneral: process.env.TICKET_GENERAL_CHANNEL_ID || process.env.TICKET_LOGS_GENERAL_CHANNEL_ID || '1514629736754577529',
    ticketLogsFc: process.env.TICKET_FC_CHANNEL_ID || process.env.TICKET_LOGS_FC_CHANNEL_ID || '1514629993747972247',
    ticketLogsProClub: process.env.TICKET_PROCLUB_CHANNEL_ID || process.env.TICKET_LOGS_PROCLUB_CHANNEL_ID || '1514630076426354818',
    ticketLogsF1: process.env.TICKET_F1_CHANNEL_ID || process.env.TICKET_LOGS_F1_CHANNEL_ID || '1514630153953743080',
    ticketLogsFootballManager: process.env.TICKET_FM_CHANNEL_ID || process.env.TICKET_LOGS_FM_CHANNEL_ID || '1514630210262138980'
  },

  roles: {
    f1Driver: process.env.ROLE_F1_DRIVER_ID || '1512902919882670292',
    ticketStaff: process.env.TICKET_STAFF_ROLE_ID || '1514358410441654474',
    ticketStaffExtra: csv(process.env.TICKET_STAFF_EXTRA_ROLE_IDS || '1498341567105339492')
  }
};
