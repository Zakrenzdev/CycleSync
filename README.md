# CycleSync

Aplikasi tracking siklus menstruasi berbasis React + Vite + Tailwind, dengan penyimpanan data ke Firebase Realtime Database lewat REST API (tanpa perlu Firebase SDK).

## Menjalankan secara lokal

```bash
npm install
npm run dev
```

## Build untuk produksi

```bash
npm run build
```

Hasil build ada di folder `dist/`.

## Deploy

Karena project ini murni static build (Vite), bisa langsung di-deploy ke:

- **Vercel**: import repo GitHub ini, framework preset otomatis terdeteksi sebagai Vite. Build command `npm run build`, output directory `dist`.
- **Netlify**: build command `npm run build`, publish directory `dist`.
- **GitHub Pages**: jalankan `npm run build`, lalu push isi folder `dist` ke branch `gh-pages` (bisa pakai package `gh-pages` atau GitHub Actions).

Tidak perlu environment variable apa pun karena koneksi ke Firebase Realtime Database sudah langsung tertanam di kode (endpoint publik lewat REST API).

## Struktur project

```
cyclesync/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.jsx      # entry point React
    ├── index.css     # Tailwind directives
    └── App.jsx       # seluruh logic & UI aplikasi
```
