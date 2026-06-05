/**
 * Script migrasi data isi_box ke tabel products.
 * Cara pakai:
 *   1. Taruh file CSV daftar harga di folder ini dengan nama "DHJ.csv"
 *   2. Jalankan: node scripts/migrate-isi-box.js
 *
 * Format CSV yang diexpect: NB;GOL;PRO;Point;Nama Barang;Komposisi;Principal;Sat;HJR;STOCK R1;SAT;ISI
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const SUPABASE_URL = 'https://dnbxgxctcrtpjcnkpatp.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || require('../.env.local').SUPABASE_SERVICE_ROLE_KEY;

// Baca env dari .env.local jika tidak ada di environment
function getEnvKey() {
  try {
    const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
    const match = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

async function supabaseUpdate(nomor_barang, isi_box, serviceKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ isi_box });
    const url = new URL(`${SUPABASE_URL}/rest/v1/products?nomor_barang=eq.${encodeURIComponent(nomor_barang)}`);

    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=minimal',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || getEnvKey();
  if (!serviceKey) {
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY tidak ditemukan.');
    process.exit(1);
  }

  // Cari file CSV
  const possiblePaths = [
    path.join(__dirname, 'DHJ.csv'),
    path.join(__dirname, 'DHJ 030626.csv'),
    path.join(__dirname, '../DHJ.csv'),
    path.join(__dirname, '../DHJ 030626.csv'),
  ];

  let csvPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) { csvPath = p; break; }
  }

  if (!csvPath) {
    console.error('ERROR: File CSV tidak ditemukan. Taruh file CSV dengan nama "DHJ.csv" di folder scripts/');
    process.exit(1);
  }

  console.log(`Membaca CSV: ${csvPath}`);
  const content = fs.readFileSync(csvPath, 'utf-8').replace(/^﻿/, ''); // strip BOM
  const lines = content.split('\n').slice(1); // skip header

  const updates = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = line.split(';');
    const nb = cols[0]?.trim();
    const isi = parseInt((cols[11] || '').trim(), 10);
    if (nb && !isNaN(isi) && isi > 0) {
      updates.push({ nomor_barang: nb, isi_box: isi });
    }
  }

  console.log(`Total produk: ${updates.length}`);

  let success = 0, errors = 0;
  for (let i = 0; i < updates.length; i++) {
    const { nomor_barang, isi_box } = updates[i];
    try {
      await supabaseUpdate(nomor_barang, isi_box, serviceKey);
      success++;
      if (success % 100 === 0) console.log(`Progress: ${success}/${updates.length}`);
    } catch (err) {
      console.error(`Gagal update ${nomor_barang}:`, err.message);
      errors++;
    }
  }

  console.log(`\nSelesai. Berhasil: ${success}, Gagal: ${errors}`);
}

main();
