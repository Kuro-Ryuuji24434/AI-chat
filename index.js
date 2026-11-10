const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const config = require('./config');
const { handleCommand, getAIResponse, settings, isSleepTime } = require('./handler');

const logger = pino({ level: 'silent' });

const groupStates = new Map();
let reconnectAttempts = 0;
let isConnecting = false;
let currentSock = null;

function getGroupState(jid) {
  if (!groupStates.has(jid)) {
    groupStates.set(jid, {
      recentMessages: [],
      isQuiet: true,
      lastBotMessageId: null
    });
  }
  return groupStates.get(jid);
}

function updateGroupActivity(jid) {
  const state = getGroupState(jid);
  const now = Date.now();
  state.recentMessages.push(now);
  state.recentMessages = state.recentMessages.filter(t => now - t < 5 * 60 * 1000);
  state.isQuiet = state.recentMessages.length < 5;
  return state;
}

async function startBot() {
  if (isConnecting) {
    console.log('Sudah dalam proses connecting, skip...');
    return;
  }
  isConnecting = true;

  try {
    const { state, saveCreds } = await useMultiFileAuthState(config.sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    if (currentSock) {
      try { currentSock.end(); } catch {}
      currentSock = null;
    }

    const sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: false,
      auth: state,
      browser: ['Ubuntu', 'Chrome', '22.0.04'],
      markOnlineOnConnect: false,          // lebih stabil
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      retryRequestDelayMs: 2000,
      maxMsgRetryCount: 3,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 25000
    });

    currentSock = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'close') {
        isConnecting = false;
        const statusCode = (lastDisconnect?.error instanceof Boom)
          ? lastDisconnect.error.output.statusCode
          : 0;

        console.log(`Koneksi tertutup. Status: ${statusCode}`);

        // Status 515 = restart required (sering bikin sesi rusak)
        if (statusCode === 515) {
          console.log('⚠️ Restart required (515). Delay lebih lama...');
          reconnectAttempts++;
          const delay = 8000; // delay lebih lama untuk 515
          setTimeout(startBot, delay);
          return;
        }

        const shouldReconnect = statusCode !== DisconnectReason.loggedOut &&
                                statusCode !== DisconnectReason.connectionReplaced;

        if (shouldReconnect) {
          reconnectAttempts++;
          const delay = Math.min(3000 * Math.pow(1.5, reconnectAttempts - 1), 30000);
          console.log(`Reconnect dalam ${Math.round(delay / 1000)} detik... (percobaan ke-${reconnectAttempts})`);
          setTimeout(startBot, delay);
        } else {
          console.log('Session logout atau digantikan. Hapus folder auth_info lalu pairing ulang.');
          reconnectAttempts = 0;
        }
      } else if (connection === 'open') {
        isConnecting = false;
        reconnectAttempts = 0;
        console.log('✅ Bot berhasil terhubung!');
        console.log(`Bot Name: ${config.botName}`);

        // Kirim pesan ke diri sendiri saat tersambung
        try {
          const selfJid = config.botNumber + '@s.whatsapp.net';
          await sock.sendMessage(selfJid, {
            text: `✅ *${config.botName}* berhasil terhubung!\n\nWaktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`
          });
          console.log('Pesan ke diri sendiri berhasil dikirim.');
        } catch (e) {
          console.error('Gagal kirim pesan ke diri sendiri:', e.message);
        }
      } else if (connection === 'connecting') {
        console.log('Menghubungkan...');
        setTimeout(async () => {
          if (!sock.authState.creds.registered) {
            try {
              const code = await sock.requestPairingCode(config.pairingNumber);
              console.log('\n=================================');
              console.log(`PAIRING CODE: ${code}`);
              console.log('Masukkan kode ini di WhatsApp > Linked Devices > Link with phone number');
              console.log('=================================\n');
            } catch (e) {
              console.error('Gagal request pairing code:', e.message);
            }
          }
        }, 4000);
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;

        const from = msg.key.remoteJid;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();

        if (!text) continue;

        console.log(`Pesan dari ${from}: ${text}`);

        if (text.startsWith(config.prefix)) {
          const handled = await handleCommand(sock, msg, text);
          if (handled) continue;
        }

        const isGroup = from.endsWith('@g.us');
        const isPrivate = from.endsWith('@s.whatsapp.net');

        if (isGroup && settings.mode !== 'public') continue;
        if (!isPrivate && !isGroup) continue;

        let groupState = null;
        if (isGroup) {
          groupState = updateGroupActivity(from);
        }

        let shouldRespondAI = false;
        let sleepWarning = false;

        if (isPrivate) {
          if (settings.sleepMode && isSleepTime()) {
            sleepWarning = true;
          } else {
            shouldRespondAI = true;
          }
        } else if (isGroup && settings.mode === 'public') {
          const botJid = (sock.user?.id || config.botNumber + '@s.whatsapp.net');
          const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
          const isMentioned = mentionedJids.some(jid => jid.includes(config.botNumber) || jid === botJid);

          const textLower = text.toLowerCase();
          const aiName = (settings.aiName || '').toLowerCase();
          const botName = (config.botName || '').toLowerCase();
          const isCalled = (aiName && textLower.includes(aiName)) || (botName && textLower.includes(botName));

          const quotedId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
          const isReplyToBot = quotedId && groupState.lastBotMessageId && quotedId === groupState.lastBotMessageId;

          if (groupState.isQuiet) {
            if (isMentioned || isCalled) shouldRespondAI = true;
          } else {
            if (isReplyToBot) shouldRespondAI = true;
          }
        }

        if (sleepWarning) {
          try {
            await sock.sendMessage(from, {
              text: 'Sudah larut malam (di atas jam 22.30). Istirahat yang cukup ya! Bot sedang dalam mode sleep.'
            }, { quoted: msg });
          } catch (e) {
            console.error('Gagal kirim sleep warning:', e.message);
          }
          continue;
        }

        if (!shouldRespondAI) continue;

        try {
          await sock.sendPresenceUpdate('composing', from);
          const senderJid = msg.key.participant || from;
          const aiReply = await getAIResponse(text, senderJid, from);
          const sent = await sock.sendMessage(from, { text: aiReply }, { quoted: msg });
          await sock.sendPresenceUpdate('paused', from);

          if (isGroup && sent?.key?.id) {
            groupState.lastBotMessageId = sent.key.id;
          }
        } catch (err) {
          console.error('Error AI reply:', err.message || err);
          try {
            await sock.sendMessage(from, { text: 'Maaf, terjadi kesalahan saat memproses pesan.' }, { quoted: msg });
          } catch {}
        }
      }
    });

  } catch (err) {
    isConnecting = false;
    console.error('Fatal error di startBot:', err);
    setTimeout(startBot, 5000);
  }
}

console.log('Memulai bot...');
startBot().catch(err => console.error('Fatal error:', err));
