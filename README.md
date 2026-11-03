# Floo Attire — Katalog Sewa Kebaya

Aplikasi modular: katalog langsung tanpa banner, filter, favorit tanpa login (localStorage), detail **satu foto**, booking WhatsApp, login admin, dashboard CRUD, dan upload foto terkompresi.

## Teknologi
- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express + JWT
- Database: PostgreSQL (menyimpan path/URL foto, bukan binary)
- Foto: disk VPS, kompres otomatis menggunakan Sharp ke WebP (maksimal 1200x1600, kualitas 78)

## Setup lokal
1. Buat database PostgreSQL `floo_attire`.
2. `cd backend && cp .env.example .env`; isi `DATABASE_URL`, `JWT_SECRET` acak yang panjang, `ADMIN_EMAIL`, `ADMIN_PASSWORD` kuat, `WHATSAPP_NUMBER` (format 628...), dan `UPLOAD_DIR`.
3. Dari folder backend: `npm install && npm run db:init && npm run dev`.
4. Terminal kedua: `cd frontend && cp .env.example .env && npm install && npm run dev`.
5. Katalog: `http://localhost:5173/` — login: `http://localhost:5173/admin/login` — admin: `/admin`.

## Cara upload katalog
1. Login admin dengan email dan password di `.env` backend.
2. Pilih **Tambah kebaya**, isi nama, harga sewa, kategori, warna, ukuran, dan deskripsi.
3. Pilih **1 foto** JPG/PNG/WebP lalu **Simpan produk**.
4. Backend memproses foto menjadi WebP dan menyimpan di `UPLOAD_DIR` VPS. PostgreSQL menyimpan path `/uploads/uuid.webp`. Nginx meneruskan permintaan foto ke backend.
5. Untuk ganti foto, klik **Edit** produk lalu pilih foto baru dan simpan.

## Deploy VPS
- Contoh konfigurasi: `deploy/nginx.conf.example`. Pastikan HTTPS aktif dengan Certbot.
- `frontend`: `npm run build`, serve folder `dist` via Nginx.
- `backend`: jalankan dengan systemd/PM2; port default 4000 hanya loopback.
- Gunakan `UPLOAD_DIR` absolut dan persisten, misalnya `/var/lib/floo-attire/uploads` dengan permission user service.
- Backup PostgreSQL dan folder foto secara terjadwal; jangan commit `.env` atau upload foto ke GitHub.
- Nomor WhatsApp ditetapkan melalui `WHATSAPP_NUMBER` di backend.

## Catatan
- Favorit hanya berlaku di browser/perangkat yang sama dan bisa hilang jika data browser dihapus.
- Status ketersediaan manual, bukan kalender tanggal sewa.
- Website tidak memproses transaksi atau pembayaran.
- Sebelum produksi, uji upload, izin folder, backup, dan autentikasi di VPS.
