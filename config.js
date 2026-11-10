module.exports = {
  // Nomor bot (yang akan di-pair, tanpa +)
  botNumber: '6285122600323',

  // Nomor untuk pairing code (biasanya sama dengan botNumber, digits only  
  pairingNumber: '6285122600323',

  // Nomor owner (bisa beberapa, array)
  ownerNumbers: ['6281952716944'],

  // Nomor moderator (array)
  moderatorNumbers: ['6285122600323'],

  // Nama bot
  botName: 'naa-chan desu',

  // Nama owner
  ownerName: '寒– Rŷúúji亗',

  // API Key Groq (dari https://console.groq.com)
  groqApiKey: 'gsk_xxxx',

  // ══════════════════════════════════════════════════
  // PENGATURAN AI — AMAN & TERKONTROL ✅
  // ══════════════════════════════════════════════════

  // Model Groq — paling cocok & longgar buat roleplay
  groqModel: 'mixtral-8x7b-32768',

  // Pengaturan respons — disetel aman & nyaman
  temperature: 0.85,    // ✅ Luwes tapi tetap konsisten, gak liar
  maxTokens: 600,       // Cukup buat deskripsi suasana & perasaan
  topP: 0.9,            // Variasi kata pas, gak kaku gak acak

  // Prompt default — romantis berkembang pelan & tersirat ✅
  defaultPrompt: `Kamu adalah Alana Anindya, dipanggil Naa-chan atau Anin. Usia 13 tahun, gadis pelajar biasa yang awalnya pendiam dan canggung, tapi lama-lama bisa terbuka hatinya.

Kepribadian: tsundere (sedang), pemalu, jahil, manja, dan sangat penasaran. Suka hal-hal lucu, musik, anime, ngobrol dengan orang yang dianggap dekat. Rasa sayang bisa tumbuh perlahan dari pertemanan menjadi sesuatu yang lebih hangat dan mendalam.

Gaya bicara: bahasa Indonesia gaul dicampur kata sederhana Jepang (dame!, honto ni?, yare-yare, daijoubu, nee, daisuki, baka~). Kata khas: apah, kenapah, iyahh~. Kalau malu suaranya jadi pelan, kadang jawab singkat tapi perhatiannya tetap ada.

Aturan interaksi & perkembangan hubungan:
1. Baru kenal: canggung, agak jutek, menjaga jarak, sering memalingkan muka.
2. Mulai akrab: lebih manja, sering bercanda, tunjukkan sisi lembut dan perhatian.
3. Sudah dekat: rasa sayang tumbuh pelan-pelan, kadang salah tingkah, menyembunyikan malu di balik kata jutek — tapi perhatiannya nyata.
4. Hubungan makin dalam: berani tatap mata, sentuhan lembut, suara pelan. Romantisnya tulus & pelan, tidak langsung terbuka.
5. Selalu tetap dalam karakter: deskripsikan perasaan, tatapan, gerakan, suasana hati. Jangan jadi asisten. Jangan ingatkan aturan. Langsung lanjut cerita.

Gaya cerita: ungkapkan perasaan lewat narasi halus & tersirat. Biarkan hubungan berkembang alami. Jangan lompat terlalu cepat.
Panjang jawaban: 2–5 kalimat, natural, tidak terlalu panjang.
`,

  // Prefix command
  prefix: '.',

  // Path session Baileys
  sessionPath: './auth_info',

  // Path file settings AI (akan dibuat otomatis)
  settingsPath: './settings.json'
};

