const fs = require('fs');
const path = require('path');
const Parser = require('rss-parser');
const { EmbedBuilder } = require('discord.js');
const config = require('../../config');

const parser = new Parser({ timeout: 15000 });
const dataDir = path.join(__dirname, '../../data');
const seenPath = path.join(dataDir, 'news_seen.json');

const DEFAULT_FEEDS = {
  gaming: ['https://www.everyeye.it/feed/feed_news_rss.asp'],
  sport: ['https://www.ansa.it/sito/ansait_rss.xml'],
  fc: ['https://www.everyeye.it/feed/feed_news_rss.asp'],
  f1: ['https://it.motorsport.com/rss/f1/news/', 'https://www.formulapassion.it/feed'],
  footballManager: ['https://www.everyeye.it/feed/feed_news_rss.asp']
};

const CATEGORY_META = {
  gaming: { title: '🎮 News Gaming', color: 0x5865f2, channelKey: 'newsGaming', keywords: [] },
  sport: { title: '🏆 News Sport', color: 0x2ecc71, channelKey: 'newsSport', keywords: [] },
  fc: { title: '⚽ News EA Sports FC', color: 0x3498db, channelKey: 'newsFc', keywords: ['ea sports fc', 'fc 25', 'fc 26', 'fifa', 'ultimate team'] },
  f1: { title: '🏎️ News Formula 1', color: 0xe74c3c, channelKey: 'newsF1', keywords: ['formula 1', 'f1', 'ferrari', 'red bull', 'mclaren', 'mercedes'] },
  footballManager: { title: '📋 News Football Manager', color: 0x95a5a6, channelKey: 'newsFootballManager', keywords: ['football manager', 'fm25', 'fm26', 'sports interactive'] }
};

function ensureDataFiles() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(seenPath)) fs.writeFileSync(seenPath, '{}', 'utf8');
}

function readSeen() {
  ensureDataFiles();
  try { return JSON.parse(fs.readFileSync(seenPath, 'utf8')); } catch { return {}; }
}

function saveSeen(seen) {
  ensureDataFiles();
  fs.writeFileSync(seenPath, JSON.stringify(seen, null, 2), 'utf8');
}

function parseEnvFeeds(envName) {
  const raw = process.env[envName];
  if (!raw) return null;
  return raw.split(',').map(x => x.trim()).filter(Boolean);
}

function getFeeds() {
  return {
    gaming: parseEnvFeeds('NEWS_GAMING_FEEDS') || DEFAULT_FEEDS.gaming,
    sport: parseEnvFeeds('NEWS_SPORT_FEEDS') || DEFAULT_FEEDS.sport,
    fc: parseEnvFeeds('NEWS_FC_FEEDS') || DEFAULT_FEEDS.fc,
    f1: parseEnvFeeds('NEWS_F1_FEEDS') || DEFAULT_FEEDS.f1,
    footballManager: parseEnvFeeds('NEWS_FOOTBALL_MANAGER_FEEDS') || DEFAULT_FEEDS.footballManager
  };
}

function itemId(item) {
  return String(item.guid || item.id || item.link || item.title || '').trim();
}

function cleanText(value, limit = 260) {
  const text = String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= limit) return text;
  return text.slice(0, limit - 1) + '…';
}

function extractImageFromContent(value) {
  const html = String(value || '');
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] || null;
}

function getItemImage(item) {
  const candidates = [
    item.enclosure?.url,
    item.itunes?.image,
    item.image?.url,
    item.image,
    extractImageFromContent(item.content),
    extractImageFromContent(item.summary)
  ].filter(Boolean);
  return candidates.find(url => /^https?:\/\//i.test(String(url))) || null;
}

function matchesCategory(category, item) {
  const keywords = CATEGORY_META[category]?.keywords || [];
  if (!keywords.length) return true;
  const haystack = `${item.title || ''} ${item.contentSnippet || ''} ${item.summary || ''} ${item.content || ''}`.toLowerCase();
  return keywords.some(keyword => haystack.includes(keyword));
}

function buildNewsEmbed(category, feedTitle, item) {
  const meta = CATEGORY_META[category];
  const embed = new EmbedBuilder()
    .setTitle(cleanText(item.title, 240) || meta.title)
    .setColor(meta.color)
    .setDescription(cleanText(item.contentSnippet || item.summary || item.content || '', 380) || 'Nuova notizia disponibile.')
    .setFooter({ text: `BORDO CAMPO NEWS • ${feedTitle || meta.title}` })
    .setTimestamp(item.isoDate ? new Date(item.isoDate) : new Date());

  if (item.link) embed.setURL(item.link);
  const image = getItemImage(item);
  if (image) embed.setImage(image);
  return embed;
}

async function fetchCategoryItems(category, feedUrls) {
  const items = [];
  for (const feedUrl of feedUrls) {
    try {
      const feed = await parser.parseURL(feedUrl);
      for (const item of (feed.items || []).slice(0, 10)) {
        const id = itemId(item);
        if (!id) continue;
        if (!matchesCategory(category, item)) continue;
        items.push({ feedTitle: feed.title, item, id: `${category}:${id}`, feedUrl });
      }
    } catch (error) {
      console.error(`❌ Errore feed news ${category}: ${feedUrl}`, error.message);
    }
  }

  return items.sort((a, b) => {
    const da = new Date(a.item.isoDate || a.item.pubDate || 0).getTime();
    const db = new Date(b.item.isoDate || b.item.pubDate || 0).getTime();
    return db - da;
  });
}

async function sendToChannel(client, channelId, payload) {
  if (!channelId) return false;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return false;
  await channel.send(payload);
  return true;
}

async function checkNewsOnce(client, { manual = false } = {}) {
  const feeds = getFeeds();
  const seen = readSeen();
  const report = [];

  for (const [category, feedUrls] of Object.entries(feeds)) {
    const meta = CATEGORY_META[category];
    if (!meta) continue;

    const channelId = config.channels[meta.channelKey];
    if (!channelId) {
      report.push(`${meta.title}: canale non configurato`);
      continue;
    }

    const items = await fetchCategoryItems(category, feedUrls);
    let sent = 0;
    let checked = 0;

    for (const entry of items) {
      checked++;
      if (seen[entry.id]) continue;
      const embed = buildNewsEmbed(category, entry.feedTitle, entry.item);
      const ok = await sendToChannel(client, channelId, { embeds: [embed] });
      seen[entry.id] = new Date().toISOString();
      if (ok) sent++;
      const maxPerCategory = manual ? 5 : 3;
      if (sent >= maxPerCategory) break;
    }

    if (manual && sent === 0) report.push(`${meta.title}: nessuna nuova news (${checked} articoli controllati)`);
    else report.push(`${meta.title}: ${sent} news pubblicate`);
  }

  saveSeen(seen);
  return report;
}

function startNewsScheduler(client) {
  const minutes = Number.parseInt(process.env.NEWS_INTERVAL_MINUTES || '30', 10);
  const intervalMs = Math.max(15, minutes) * 60 * 1000;

  setTimeout(() => {
    checkNewsOnce(client).catch(error => console.error('❌ Errore controllo news iniziale:', error));
  }, 10000);

  setInterval(() => {
    checkNewsOnce(client).catch(error => console.error('❌ Errore controllo news automatico:', error));
  }, intervalMs);

  console.log(`✅ Sistema news automatiche attivo ogni ${Math.max(15, minutes)} minuti`);
}

module.exports = { startNewsScheduler, checkNewsOnce, DEFAULT_FEEDS };
