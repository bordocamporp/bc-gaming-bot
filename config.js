require('dotenv').config();

const pick = (...values) => values.find(v => typeof v === 'string' && v.trim() !== '') || undefined;

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,

  channels: {
    welcome: process.env.WELCOME_CHANNEL_ID,
    logs: pick(process.env.LOG_CHANNEL_ID, process.env.BOT_LOG_CHANNEL_ID),

    // F1
    f1Registration: process.env.F1_REGISTRATION_CHANNEL_ID,
    f1StaffRequests: pick(process.env.F1_STAFF_REQUESTS_CHANNEL_ID, process.env.F1_STAFF_APPROVAL_CHANNEL_ID),
    f1Paddock: process.env.F1_PADDOCK_CHANNEL_ID,
    f1Races: process.env.F1_RACES_CHANNEL_ID,
    f1DrawResults: pick(process.env.F1_DRAW_RESULTS_CHANNEL_ID, process.env.F1_PADDOCK_CHANNEL_ID),
    f1Calendar: process.env.F1_CALENDAR_CHANNEL_ID,
    f1Standings: process.env.F1_STANDINGS_CHANNEL_ID,
    f1Stats: process.env.F1_STATS_CHANNEL_ID,
    f1RaceResults: pick(process.env.F1_RACE_RESULTS_CHANNEL_ID, process.env.F1_RESULTS_CHANNEL_ID),
    f1Media: process.env.F1_MEDIA_CHANNEL_ID,

    // NEWS / COMMUNITY
    newsGaming: process.env.NEWS_GAMING_CHANNEL_ID,
    newsSport: process.env.NEWS_SPORT_CHANNEL_ID,
    newsFc: process.env.NEWS_FC_CHANNEL_ID,
    newsF1: process.env.NEWS_F1_CHANNEL_ID,
    newsFootballManager: process.env.NEWS_FOOTBALL_MANAGER_CHANNEL_ID,
    clipsScreens: process.env.CLIPS_SCREENS_CHANNEL_ID,
    lookingForPlayers: process.env.LOOKING_FOR_PLAYERS_CHANNEL_ID,
  },

  roles: {
    fc: process.env.ROLE_FC_ID,
    proclub: process.env.ROLE_PROCLUB_ID,
    f1: process.env.ROLE_F1_ID,
    fm: process.env.ROLE_FM_ID,
    community: process.env.ROLE_COMMUNITY_ID,
    notifications: process.env.ROLE_NOTIFICATIONS_ID,
    f1Driver: process.env.ROLE_F1_DRIVER_ID,
  }
};
