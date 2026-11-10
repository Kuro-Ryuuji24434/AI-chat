# WhatsApp AI Bot dengan Groq

Bot WhatsApp sederhana yang menggunakan AI dari Groq (console.groq.com) dan library Baileys.

## Fitur
- Pairing code (tidak perlu scan QR)
- Command `.menu`
- Set nama AI, prompt, gender, sifat, typing style
- Mode Self / Public
- Sleep mode (peringatan di atas jam 22.30)
- Aturan respon pintar di grup (sepi/ramai)
- Balas pesan dengan AI sesuai aturan
- Pengaturan disimpan di `settings.json`

## Aturan Respon AI

### Chat Pribadi
- Selalu membalas setiap chat pribadi (kecuali sleep mode aktif di atas jam 22.30).

### Chat Grup (hanya di mode Public)
- Hanya merespon jika **dipanggil namanya** atau **ditag nomor bot**.
- **Grup sepi** (sedikit pesan): AI hanya merespon saat dipanggil/ditag. Setelah merespon, diam sampai dipanggil lagi.
- **Grup ramai** (banyak pesan dalam 5 menit): AI hanya merespon jika user **reply** ke chat AI.

## Mode Bot
- **Self mode**: Hanya merespon chat pribadi.
- **Public mode**: Merespon chat pribadi + chat grup (sesuai aturan di atas).

## Sleep Mode
- Jika diaktifkan (`.setsleep on`), bot akan mengirim peringatan kepada user yang chat pribadi di atas jam **22.30 WIB** (tidak membalas dengan AI).

## Cara Install & Jalankan

1. **Install Node.js** (versi 18 atau lebih baru)

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Edit `config.js`**
   - Isi `groqApiKey` dengan API key dari https://console.groq.com
   - Isi `pairingNumber` dan `botNumber` dengan nomor WhatsApp (format 62xxx tanpa +)
   - Isi `ownerNumbers` dan `moderatorNumbers`
   - Sesuaikan nama bot, owner, model, dll.

4. **Jalankan bot**
   ```bash
   npm start
   ```

5. **Pairing**
   - Bot akan menampilkan **PAIRING CODE**
   - Buka WhatsApp di HP → Linked Devices → Link a Device → Link with phone number
   - Masukkan kode yang muncul

## Command yang tersedia

| Command | Fungsi | Siapa yang bisa |
|---------|--------|-----------------|
| `.menu` | Tampilkan daftar menu | Semua orang |
| `.setname ai <nama>` | Set nama AI | Owner / Moderator |
| `.setprompt ai <prompt>` | Set prompt custom | Owner / Moderator |
| `.setgender ai <pria/wanita/netral>` | Set gender AI | Owner / Moderator |
| `.setsifat ai <sifat>` | Set sifat AI (bisa jadi prompt) | Owner / Moderator |
| `.settyping ai <panjang/dry>` | Set style jawaban | Owner / Moderator |
| `.setmode <self/public>` | Set mode bot (self/public) | Owner / Moderator |
| `.setsleep <on/off>` | Aktifkan/nonaktifkan sleep mode | Owner / Moderator |

> Jika prompt belum di-set, bot akan menggunakan `defaultPrompt` dari config.js.

## Catatan
- Pesan yang **tidak** dimulai dengan `.` akan diproses sesuai aturan AI di atas.
- Session disimpan di folder `auth_info`.
- Settings AI disimpan di `settings.json`.
- Pastikan API key Groq valid dan model yang digunakan tersedia.
- Waktu sleep menggunakan zona WIB (UTC+7).

## Model Groq yang disarankan
- `openai/gpt-oss-20b` (default, cepat & murah)
- `openai/gpt-oss-120b`
- `qwen/qwen3.8-27b`

Cek model terbaru di https://console.groq.com

---

Selamat mencoba! 🚀
