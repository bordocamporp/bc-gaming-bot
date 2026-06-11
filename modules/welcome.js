const { AttachmentBuilder } = require('discord.js');
const Canvas = require('canvas');
const config = require('../config');

function formatNumber(num) {
  return String(num).padStart(6, '0');
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawText(ctx, text, x, y, size, color = '#ffffff', align = 'center', weight = 'bold') {
  ctx.font = `${weight} ${size}px Arial`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
}

async function sendWelcome(member) {
  try {
    const channel = member.guild.channels.cache.get(config.channels.welcome);
    if (!channel) return;

    const width = 1400;
    const height = 760;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const memberNumber = member.guild.memberCount;
    const formattedNumber = formatNumber(memberNumber);
    const username = member.user.globalName || member.user.username;

    const avatar = await Canvas.loadImage(
      member.user.displayAvatarURL({ extension: 'png', size: 256 })
    );

    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, '#020006');
    bg.addColorStop(0.45, '#090016');
    bg.addColorStop(1, '#020006');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.shadowColor = '#8A2BE2';
    ctx.shadowBlur = 30;
    ctx.strokeStyle = '#8A2BE2';
    ctx.lineWidth = 5;
    roundRect(ctx, 35, 35, width - 70, height - 70, 32);
    ctx.stroke();

    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#8A2BE2';
    ctx.lineWidth = 2;

    for (let i = 0; i < 22; i++) {
      ctx.beginPath();
      ctx.moveTo(60, 90 + i * 25);
      ctx.lineTo(340, 50 + i * 25);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(width - 60, 90 + i * 25);
      ctx.lineTo(width - 340, 50 + i * 25);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;

    drawText(ctx, 'BC', width / 2, 105, 86);
    drawText(ctx, 'GAMING COMMUNITY', width / 2, 145, 24, '#ffffff', 'center', 'normal');

    drawText(ctx, 'BENVENUTO', width / 2, 225, 72);
    drawText(ctx, 'IN BC GAMING!', width / 2, 275, 42, '#8A2BE2');

    drawText(
      ctx,
      'Entra a far parte di una community competitiva, appassionata e sempre pronta alla sfida.',
      width / 2,
      330,
      26,
      '#ffffff',
      'center',
      'normal'
    );

    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, 430, 62, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, width / 2 - 62, 368, 124, 124);
    ctx.restore();

    ctx.shadowBlur = 20;
    ctx.strokeStyle = '#8A2BE2';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(width / 2, 430, 66, 0, Math.PI * 2);
    ctx.stroke();

    drawText(ctx, username, width / 2, 525, 34);

    const games = [
      ['FC 26', '⚽'],
      ['PRO CLUB', '👥'],
      ['FORMULA 1', '🏎️'],
      ['FOOTBALL MANAGER', '📋']
    ];

    const gameY = 575;
    const gameW = 245;
    const gameH = 62;
    const startX = 145;
    const gap = 285;

    for (let i = 0; i < games.length; i++) {
      const x = startX + i * gap;

      ctx.shadowBlur = 18;
      ctx.strokeStyle = '#8A2BE2';
      ctx.lineWidth = 3;
      roundRect(ctx, x, gameY, gameW, gameH, 16);
      ctx.stroke();

      drawText(ctx, games[i][1], x + 45, gameY + 42, 28);
      drawText(ctx, games[i][0], x + 145, gameY + 40, 22, '#8A2BE2');
    }

    const panelX = 180;
    const panelY = 660;
    const panelW = 1040;
    const panelH = 72;

    ctx.shadowBlur = 25;
    ctx.strokeStyle = '#8A2BE2';
    ctx.lineWidth = 4;
    roundRect(ctx, panelX, panelY, panelW, panelH, 20);
    ctx.stroke();

    drawText(ctx, 'SEI IL NUMERO', panelX + 260, panelY + 48, 34);

    drawText(ctx, String(memberNumber), panelX + 480, panelY + 55, 62);

    drawText(ctx, 'UTENTE REGISTRATO', panelX + 760, panelY + 25, 18, '#ffffff', 'center', 'normal');

    const digits = formattedNumber.split('');
    const boxSize = 44;
    const boxGap = 10;
    const boxesStartX = panelX + 620;
    const boxY = panelY + 30;

    for (let i = 0; i < digits.length; i++) {
      const x = boxesStartX + i * (boxSize + boxGap);

      ctx.shadowBlur = 12;
      ctx.strokeStyle = '#8A2BE2';
      ctx.lineWidth = 2;
      roundRect(ctx, x, boxY, boxSize, boxSize, 8);
      ctx.stroke();

      drawText(ctx, digits[i], x + boxSize / 2, boxY + 34, 30);
    }

    ctx.shadowBlur = 10;
    drawText(ctx, 'GIOCA  •  COMPETI  •  VINCI', width / 2, height - 18, 22, '#ffffff', 'center', 'normal');

    const attachment = new AttachmentBuilder(
      canvas.toBuffer('image/png'),
      { name: 'welcome.png' }
    );

    await channel.send({ files: [attachment] });

    console.log(`[WELCOME] Card inviata a ${member.user.tag} - Numero ${memberNumber}`);
  } catch (error) {
    console.error('[WELCOME ERROR]', error);
  }
}

module.exports = {
  sendWelcome
};