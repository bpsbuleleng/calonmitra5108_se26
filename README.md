# Dashboard Rekrutmen Mitra Sensus Ekonomi 2026

Dashboard interaktif untuk memantau pendaftaran calon Mitra Sensus Ekonomi 2026 BPS Kabupaten Buleleng. Dibangun sebagai static site (HTML/CSS/JS) sehingga dapat di-host gratis di GitHub Pages.

## Fitur

- **Ringkasan real-time** – total pendaftar, pendaftar hari ini, jumlah kecamatan/desa terwakili
- **Peta sebaran** – choropleth per desa/kelurahan menggunakan GeoJSON yang di-join dengan kolom `iddesa`
- **Analitik** – tren harian, distribusi usia, pendidikan, pekerjaan, ranking kecamatan
- **Persyaratan** – persentase pemenuhan syarat (motor, smartphone, surat rekomendasi, dst.)
- **Deteksi duplikat** – berbasis hash SHA-256 atas NIK & nomor HP, tanpa membocorkan data pribadi
- **Daftar peserta** – tabel dengan pencarian, filter, paginasi, dan ekspor CSV
- **Auto-refresh** setiap 5 menit
- **Mobile-friendly** + dark mode

## Privasi Data

NIK dan nomor HP tidak pernah ditampilkan di UI. Deteksi duplikat dilakukan di sisi browser pengguna (client-side) dengan SHA-256, hanya hash yang dibandingkan. Tabel duplikat hanya menampilkan nama, kecamatan, desa, waktu daftar, dan nomor grup.

## Struktur Proyek

```
.
├── index.html                          # Dashboard (single-file SPA)
├── peta/
│   └── final_desa_5108_2025-1.geojson  # Batas desa Kabupaten Buleleng
└── README.md
```

## Setup

### 1. Publikasikan Google Sheets agar dapat dibaca sebagai CSV

Dashboard mengambil data via URL `export?format=csv`. Agar URL ini dapat diakses publik:

1. Buka spreadsheet di Google Sheets.
2. **File → Share → Publish to web** → pilih sheet → format **CSV** → klik **Publish**.
3. (Alternatif) Pastikan akses share di-set ke **Anyone with the link – Viewer**.

### 2. Deploy ke GitHub Pages

1. Push repo ini ke GitHub.
2. Buka **Settings → Pages**.
3. Pada **Source**, pilih **Deploy from a branch**.
4. Pilih branch `main` dan folder `/ (root)` → **Save**.
5. Tunggu beberapa menit, dashboard tersedia di `https://<username>.github.io/<repo>/`.

### 3. Menjalankan Lokal

Karena `fetch()` butuh server (tidak bisa via `file://`), jalankan static server:

```bash
# Python 3
python -m http.server 8000

# atau Node.js
npx serve .
```

Buka `http://localhost:8000`.

## Konfigurasi

Edit konstanta di bagian atas `<script>` pada [index.html](index.html):

```js
const CSV_URL  = 'https://docs.google.com/spreadsheets/d/.../export?format=csv';
const GEO_URL  = 'peta/final_desa_5108_2025-1.geojson';
const PAGE_SZ  = 20;          // baris per halaman tabel
const REFRESH_MS = 5*60*1000; // interval auto-refresh
```

## Kunci Join Peta

Spreadsheet form sudah memiliki kolom `iddesa` (10 digit, format `PPKKKKDDDD`) yang otomatis dicocokkan dengan properti `iddesa` pada GeoJSON. Jika menambah desa baru di GeoJSON, pastikan formatnya konsisten.

## Library

- [Leaflet](https://leafletjs.com/) – peta interaktif
- [Chart.js](https://www.chartjs.org/) – grafik
- [PapaParse](https://www.papaparse.com/) – parsing CSV
- [Carto Light Basemap](https://carto.com/) – tile peta minimalis

Semua dimuat via CDN, tidak perlu build step.
