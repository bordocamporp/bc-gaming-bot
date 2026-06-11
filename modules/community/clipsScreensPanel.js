const { EmbedBuilder } = require('discord.js');
const config = require('../../config');

function buildClipsScreensEmbed() {
  return new EmbedBuilder()
    .setTitle('📸 CLIP E SCREEN')
    .setColor(0xff00cc)
    .setDescription(
      'Condividi qui le tue migliori **clip**, **screenshot** e momenti gaming.\n\n' +
      'Puoi pubblicare contenuti di:\n' +
      '• FC / EA Sports FC\n' +
      '• Formula 1\n' +
      '• Football Manager\n' +
      '• GTA, COD, Fortnite e altri videogiochi\n\n' +
      '📌 Consiglio: scrivi anche il nome del gioco e una breve descrizione della clip.'
    )
    .setFooter({ text: 'BORDO CAMPO COMMUNITY • Clip e Screen' })
    .setTimestamp();
}

async function publishClipsScreensPanel(client) {
  const channel = await client.channels.fetch(config.channels.clipsScreens).catch(() => null);
  if (!channel) throw new Error('Canale CLIP E SCREEN non trovato.');

  await channel.send({ embeds: [buildClipsScreensEmbed()] });
  return true;
}

module.exports = {
  publishClipsScreensPanel,
  buildClipsScreensEmbed
};
