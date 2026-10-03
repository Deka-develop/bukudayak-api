# 📚 BukuDayak Backend API (Mayar.id & Live Shipping System)

Backend microservice untuk website **[BukuDayak.com](https://bukudayak.com/)** yang menangani:
1. **Perhitungan Ongkos Kirim Otomatis** (RajaOngkir / Biteship / Smart Regional Fallback) ditanggung oleh pembeli.
2. **Payment Gateway Mayar.id** (QRIS, BCA VA, BRI VA, Mandiri VA, ShopeePay, OVO, Dana, Kartu Kredit).
3. **Webhook Notifikasi Pembayaran** otomatis saat transaksi selesai.

---

## 🚀 Panduan Deploy ke GitHub & Vercel (Gratis 24/7)

Anda dapat meng-hosting backend ini secara gratis di **Vercel** dengan menghubungkannya ke repositori **GitHub** Anda.

### Langkah 1: Buat Repositori di GitHub
1. Buka [github.com/new](https://github.com/new) dan buat repositori baru bernama `bukudayak-api` (pilih *Public* atau *Private*).
2. Di komputer Anda, buka terminal di folder `bukudayak-backend` dan jalankan perintah berikut:

```bash
cd "e:\Backup\Uang\Dayak book\bukudayak-backend"
git init
git add .
git commit -m "feat: initial commit bukudayak api with mayar and shipping"
git branch -M main
git remote add origin https://github.com/USERNAME-ANDA/bukudayak-api.git
git push -u origin main
```

*(Ganti `USERNAME-ANDA` dengan username GitHub Anda)*

---

### Langkah 2: Deploy ke Vercel
1. Buka [vercel.com](https://vercel.com/) dan login menggunakan akun GitHub Anda.
2. Klik **"Add New..."** -> **"Project"**.
3. Pilih repositori **`bukudayak-api`** yang baru saja Anda push, lalu klik **"Import"**.
4. Di bagian **Environment Variables**, tambahkan variabel berikut:
   - `MAYAR_API_KEY`: *(Dapatkan di [web.mayar.id/api-keys](https://web.mayar.id/api-keys))*
   - `MAYAR_MODE`: `production`
   - `MAYAR_REDIRECT_URL`: `https://bukudayak.com/?status=payment_success`
   - `RAJAONGKIR_API_KEY`: *(Dapatkan di [rajaongkir.com](https://rajaongkir.com))*
   - `ORIGIN_CITY_ID`: `501` *(501 = Kota Yogyakarta, atau 364 = Pontianak)*
   - `ALLOWED_ORIGINS`: `https://bukudayak.com,https://www.bukudayak.com`
5. Klik tombol **"Deploy"**.
6. Dalam hitungan detik, Anda akan mendapatkan URL Vercel, misalnya:
   `https://bukudayak-api.vercel.app`

---

## 🛠️ Menghubungkan ke Blogger (bukudayak.com)

Di template Blogger (`dayak_book_theme.xml`), cukup ubah konstanta konfigurasi API:

```javascript
window.BUKUDAYAK_API_URL = "https://bukudayak-api.vercel.app";
```

---

## 📡 Daftar Endpoint API

| Method | Endpoint | Keterangan |
| :--- | :--- | :--- |
| `GET` | `/` | Health check & status server |
| `GET` | `/api/shipping/provinces` | Mendapatkan daftar seluruh provinsi Indonesia |
| `GET` | `/api/shipping/cities?province=ID` | Mendapatkan daftar kota berdasarkan ID provinsi |
| `POST` | `/api/shipping/cost` | Menghitung tarif ongkos kirim kurir (JNE, J&T, SiCepat, Pos) |
| `POST` | `/api/payment/create-invoice` | Membuat invoice tagihan Mayar.id (Buku + Ongkir) |
| `POST` | `/api/webhook/mayar` | Webhook penerima status pembayaran otomatis dari Mayar |

---

## 💳 Simulasi & Testing Lokal

Jalankan server lokal dengan:
```bash
npm install
npm run dev
```

Buka browser di `http://localhost:3000`. Jika API Key belum diisi, server akan otomatis berjalan dalam **Mode Simulasi Pintar** sehingga alur checkout dapat diuji coba tanpa error.
