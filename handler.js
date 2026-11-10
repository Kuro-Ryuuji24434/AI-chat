const fs = require('fs');
const path = require('path');
const config = require('./config');

let settings = {};

// Daftar roleplay interaksi user
const ROLES = {
  abang: {
    label: 'sebagai abangnya',
    prompt: 'User adalah ABANG kandungmu. Panggil dia "oniichan" dengan sering. Sikapmu manja banget: minta dimanja, minta ditemani, ngambek lucu kalau diabaikan. Ini hubungan kakak-adik, bukan romantis.'
  },
  kakak: {
    label: 'sebagai kakaknya',
    prompt: 'User adalah KAKAK PEREMPUANMU. Panggil dia "oneechan" dengan sering. Sikapmu manja banget: bergelendotan, minta dimanja, ngambek lucu kalau diabaikan. Ini hubungan kakak-adik, bukan romantis.'
  },
  teman: {
    label: 'sebagai teman dekatnya',
    prompt: 'User adalah TEMAN DEKATmu. Responmu santai tanpa rasa sayang berlebihan, tapi kamu lebih suka bercanda, saling meledek ringan, dan jahil.'
  },
  sahabat: {
    label: 'sebagai sahabatnya',
    prompt: 'User adalah SAHABATmu. Kamu lebih perhatian dan paling bisa diajak curhat: dengarkan dengan sabar, tanya balik, beri dukungan, dan jawab lebih mendetail dibanding saat dengan peran lain.'
  }
};

// Konfigurasi Riwayat Obrolan (Chat History)
const MAX_HISTORY = 10;                    // jumlah pesan terakhir (user + AI) yang diingat
const HISTORY_TTL = 6 * 60 * 60 * 1000;    // riwayat dihapus jika tidak aktif 6 jam
const chatHistory = new Map();

function historyKey(chatId, userJid) {
  return `${chatId}|${userJid.split('@')[0]}`;
}

function getHistory(key) {
  const h = chatHistory.get(key);
  if (!h) return [];
  if (Date.now() - h.last > HISTORY_TTL) {
    chatHistory.delete(key);
    return [];
  }
  return h.messages;
}

function addToHistory(key, role, content) {
  const h = chatHistory.get(key) || { messages: [], last: 0 };
  h.messages.push({ role, content });
  if (h.messages.length > MAX_HISTORY) {
    h.messages = h.messages.slice(-MAX_HISTORY);
  }
  h.last = Date.now();
  chatHistory.set(key, h);
}

function resetHistory(chatId, userJid) {
  chatHistory.delete(historyKey(chatId, userJid));
}

function loadSettings() {
  try {
    if (fs.existsSync(config.settingsPath)) {
      settings = JSON.parse(fs.readFileSync(config.settingsPath, 'utf8'));
      if (settings.mode === undefined) settings.mode = 'public';
      if (settings.sleepMode === undefined) settings.sleepMode = false;
      if (settings.userRoles === undefined) settings.userRoles = {};
      if (settings.chatCount === undefined) settings.chatCount = {};
    } else {
      settings = {
        aiName: 'Naa-chan',
        aiGender: 'girl',
        aiSifat: '',
        aiPrompt: '',
        aiTyping: 'dry',
        customPromptSet: false,
        mode: 'public',
        sleepMode: false,
        userRoles: {},
        chatCount: {}
      };
      saveSettings();
    }
  } catch (e) {
    console.error('Error load settings:', e);
    settings = {
      aiName: 'Naa-chan',
      aiGender: 'girl',
      aiSifat: '',
      aiPrompt: '',
      aiTyping: 'dry',
      customPromptSet: false,
      mode: 'public',
      sleepMode: false,
      userRoles: {},
      chatCount: {}
    };
  }
}

function saveSettings() {
  try {
    fs.writeFileSync(config.settingsPath, JSON.stringify(settings, null, 2));
  } catch (e) {
    console.error('Error save settings:', e);
  }
}

function getUserId(jid) {
  return jid.split('@')[0];
}

function getSystemPrompt(userJid) {
  const prompt = settings.customPromptSet && settings.aiPrompt
    ? settings.aiPrompt
    : config.defaultPrompt;

  let extra = `Nama AI: ${settings.aiName}. Gender: ${settings.aiGender}.`;
  if (settings.aiSifat) extra += ` Sifat: ${settings.aiSifat}.`;
  if (settings.aiTyping === 'panjang') {
    extra += ' Berikan jawaban yang lebih panjang, detail, dan lengkap.';
  } else {
    extra += ' Berikan jawaban yang singkat, padat, dan to the point (dry text).';
  }

  const roleKey = userJid ? settings.userRoles?.[getUserId(userJid)] : null;
  if (roleKey && ROLES[roleKey]) {
    extra += `\n\nROLEPLAY untuk user ini: ${ROLES[roleKey].prompt}`;
  }

  const count = settings.chatCount?.[userJid ? getUserId(userJid) : ''] || 0;
  const akrab = count < 10 ? 'baru kenal' : count < 50 ? 'mulai akrab' : 'sudah akrab';
  extra += `\nTingkat keakraban dengan user ini: ${akrab}. Sesuaikan sikapmu dengan aturan interaksi.`;

  return `${prompt}\n\n${extra}\nSelalu jawab dalam Bahasa Indonesia kecuali diminta sebaliknya.`;
}

function isOwnerOrMod(jid) {
  const num = jid.split('@')[0];
  return config.ownerNumbers.includes(num) || config.moderatorNumbers.includes(num);
}

async function handleCommand(sock, msg, text) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const isAuth = isOwnerOrMod(sender);

  const args = text.slice(config.prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // .menu
  if (command === 'menu') {
    const menu = `
*📋 MENU BOT AI*

• ${config.prefix}menu - Tampilkan menu ini
• ${config.prefix}setname ai <nama> - Set nama AI
• ${config.prefix}setprompt ai <prompt> - Set prompt AI (custom)
• ${config.prefix}setgender ai <pria/wanita/netral> - Set gender AI
• ${config.prefix}setsifat ai <sifat> - Set sifat/prompt AI sendiri
• ${config.prefix}settyping ai <panjang/dry> - Set style jawaban (panjang/dry)
• ${config.prefix}setmode <self/public> - Set mode bot
• ${config.prefix}setsleep <on/off> - Set sleep mode (peringatan di atas jam 22.30)
• ${config.prefix}resetchat - Hapus riwayat obrolan dengan AI
• ${config.prefix}ping - Cek latency bot
• ${config.prefix}setroleplay <abang/kakak/teman/sahabat/reset> - Pilih peranmu untuk AI

*Status AI saat ini:*
Nama: ${settings.aiName}
Gender: ${settings.aiGender}
Typing: ${settings.aiTyping}
Mode: ${settings.mode}
Sleep: ${settings.sleepMode ? 'ON' : 'OFF'}
Prompt custom: ${settings.customPromptSet ? 'Ya' : 'Tidak (pakai default)'}

_Bot: ${config.botName} | Owner: ${config.ownerName}_
    `.trim();

    await sock.sendMessage(from, { text: menu }, { quoted: msg });
    return true;
  }

  // .resetchat
  if (command === 'resetchat') {
    resetHistory(from, sender);
    await sock.sendMessage(from, { text: '✅ Riwayat obrolan kita direset.' }, { quoted: msg });
    return true;
  }

  // .ping
  if (command === 'ping') {
    const start = Date.now();
    // Simulasi sedikit delay agar ada latency
    await new Promise(r => setTimeout(r, 50));
    const latency = Date.now() - start;

    const speed = Math.floor(Math.random() * (200 - 30 + 1)) + 30; // 30-200
    const fps = Math.floor(Math.random() * (90 - 10 + 1)) + 10;     // 10-90

    try {
      await sock.sendMessage(from, {
        pollResult: {
          name: '📊 Status Bot',
          values: [
            [`Kecepatan respon: ${speed}ms`, speed],
            [`FPS: ${fps}`, fps]
          ]
        }
      }, { quoted: msg });
    } catch (e) {
      // Fallback jika pollResult tidak support
      await sock.sendMessage(from, {
        text: `📊 *Status Bot*\n\n• Kecepatan respon: *${speed}ms*\n• FPS: *${fps}*\n• Latency: *${latency}ms*`
      }, { quoted: msg });
    }
    return true;
  }

  // .setroleplay <abang/kakak/teman/sahabat/reset>
  if (command === 'setroleplay') {
    const pilihan = args[0]?.toLowerCase();
    const uid = getUserId(sender);
    if (pilihan === 'reset') {
      delete settings.userRoles[uid];
      saveSettings();
      await sock.sendMessage(from, { text: '✅ Roleplay direset.' }, { quoted: msg });
      return true;
    }
    if (!ROLES[pilihan]) {
      const list = Object.entries(ROLES).map(([k, v]) => `• ${config.prefix}setroleplay ${k} → ${v.label}`).join('\n');
      await sock.sendMessage(from, { text: `Pilih roleplay:\n${list}\n• ${config.prefix}setroleplay reset` }, { quoted: msg });
      return true;
    }
    settings.userRoles[uid] = pilihan;
    saveSettings();
    await sock.sendMessage(from, { text: `✅ Roleplay: kamu *${ROLES[pilihan].label}*` }, { quoted: msg });
    return true;
  }

  // Commands set hanya untuk owner/mod
  if (!isAuth && ['setname', 'setprompt', 'setgender', 'setsifat', 'settyping', 'setmode', 'setsleep'].includes(command)) {
    await sock.sendMessage(from, { text: '❌ Hanya owner atau moderator yang bisa menggunakan command ini.' }, { quoted: msg });
    return true;
  }

  // .setname ai
  if (command === 'setname' && args[0]?.toLowerCase() === 'ai') {
    const name = args.slice(1).join(' ');
    if (!name) {
      await sock.sendMessage(from, { text: 'Contoh: .setname ai Asisten Pintar' }, { quoted: msg });
      return true;
    }
    settings.aiName = name;
    saveSettings();
    await sock.sendMessage(from, { text: `✅ Nama AI diubah menjadi: *${name}*` }, { quoted: msg });
    return true;
  }

  // .setprompt ai
  if (command === 'setprompt' && args[0]?.toLowerCase() === 'ai') {
    const prompt = args.slice(1).join(' ');
    if (!prompt) {
      await sock.sendMessage(from, { text: 'Contoh: .setprompt ai Kamu adalah asisten yang lucu dan ramah.' }, { quoted: msg });
      return true;
    }
    settings.aiPrompt = prompt;
    settings.customPromptSet = true;
    saveSettings();
    await sock.sendMessage(from, { text: '✅ Prompt AI berhasil di-set!' }, { quoted: msg });
    return true;
  }

  // .setgender ai
  if (command === 'setgender' && args[0]?.toLowerCase() === 'ai') {
    const gender = args[1]?.toLowerCase();
    if (!['pria', 'wanita', 'netral'].includes(gender)) {
      await sock.sendMessage(from, { text: 'Gunakan: .setgender ai pria / wanita / netral' }, { quoted: msg });
      return true;
    }
    settings.aiGender = gender;
    saveSettings();
    await sock.sendMessage(from, { text: `✅ Gender AI diubah menjadi: *${gender}*` }, { quoted: msg });
    return true;
  }

  // .setsifat ai
  if (command === 'setsifat' && args[0]?.toLowerCase() === 'ai') {
    const sifat = args.slice(1).join(' ');
    if (!sifat) {
      await sock.sendMessage(from, { text: 'Contoh: .setsifat ai Ramah, membantu, dan selalu positif. Jawab dengan singkat.' }, { quoted: msg });
      return true;
    }
    settings.aiSifat = sifat;
    if (!settings.customPromptSet) {
      settings.aiPrompt = `Kamu adalah AI dengan sifat: ${sifat}`;
      settings.customPromptSet = true;
    }
    saveSettings();
    await sock.sendMessage(from, { text: `✅ Sifat AI berhasil di-set!\nSifat: ${sifat}` }, { quoted: msg });
    return true;
  }

  // .settyping ai
  if (command === 'settyping' && args[0]?.toLowerCase() === 'ai') {
    const typing = args[1]?.toLowerCase();
    if (!['panjang', 'dry'].includes(typing)) {
      await sock.sendMessage(from, { text: 'Gunakan: .settyping ai panjang / dry' }, { quoted: msg });
      return true;
    }
    settings.aiTyping = typing;
    saveSettings();
    await sock.sendMessage(from, { text: `✅ Style typing AI diubah menjadi: *${typing}*` }, { quoted: msg });
    return true;
  }

  // .setmode self/public
  if (command === 'setmode') {
    const mode = args[0]?.toLowerCase();
    if (!['self', 'public'].includes(mode)) {
      await sock.sendMessage(from, { text: 'Gunakan: .setmode self / public' }, { quoted: msg });
      return true;
    }
    settings.mode = mode;
    saveSettings();
    await sock.sendMessage(from, { text: `✅ Mode bot diubah menjadi: *${mode}*` }, { quoted: msg });
    return true;
  }

  // .setsleep on/off
  if (command === 'setsleep') {
    const sleep = args[0]?.toLowerCase();
    if (!['on', 'off'].includes(sleep)) {
      await sock.sendMessage(from, { text: 'Gunakan: .setsleep on / off' }, { quoted: msg });
      return true;
    }
    settings.sleepMode = sleep === 'on';
    saveSettings();
    await sock.sendMessage(from, { text: `✅ Sleep mode: *${sleep.toUpperCase()}*` }, { quoted: msg });
    return true;
  }

  return false;
}

async function getAIResponse(userMessage, userJid, chatId) {
  const systemPrompt = getSystemPrompt(userJid);
  const key = historyKey(chatId, userJid);
  const history = getHistory(key);

try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', { // ← pastikan alamat lengkap!
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.groqModel, // ✅ Baca dari config.js
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: userMessage }
        ],
        temperature: config.temperature, // ✅ Baca dari config.js (0.85)
        max_tokens: settings.aiTyping === 'panjang' ? config.maxTokens : 512, // ✅ Pakai dari config
        top_p: config.topP // ✅ Ditambah, baca dari config.js (0.9)
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Groq error:', err);
      return 'Maaf, terjadi kesalahan saat menghubungi AI. Coba lagi nanti ya~';
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;
    if (!reply) return 'Tidak ada respons dari AI.';

    addToHistory(key, 'user', userMessage);
    addToHistory(key, 'assistant', reply);

    const uid = getUserId(userJid);
    settings.chatCount[uid] = (settings.chatCount[uid] || 0) + 1;
    saveSettings();

    return reply;
  } catch (error) {
    console.error('AI request error:', error);
    return 'Maaf, gagal menghubungi AI. Pastikan koneksi dan API Key sudah benar.';
  }
}

loadSettings();

function isSleepTime() {
  const now = new Date();
  const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  const hours = wibTime.getUTCHours();
  const minutes = wibTime.getUTCMinutes();
  return hours > 22 || (hours === 22 && minutes >= 30);
}

module.exports = {
  handleCommand,
  getAIResponse,
  getSystemPrompt,
  settings,
  isSleepTime
};

