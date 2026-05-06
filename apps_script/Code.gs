/**
 * Proxy Apps Script untuk Dashboard Rekrutmen Mitra SE2026 — BPS Buleleng.
 *
 * Tujuan:
 *  - Spreadsheet TIDAK perlu di-share publik. Cukup akun pemilik (deployer)
 *    yang bisa membaca. Web App ini berjalan dengan kewenangan deployer.
 *  - NIK & Nomor HP TIDAK pernah keluar dari server. Hanya hash SHA-256
 *    yang dikirim ke browser, sehingga deteksi duplikat tetap berfungsi
 *    tanpa membocorkan PII.
 *
 * Cara deploy: lihat instruksi di akhir file.
 */

const SHEET_ID   = '1SDCgjjrS6tKEN6f5GJqqiY8ydltrE2Ll5eWbVFETFvE';
const SHEET_NAME = '';      // kosongkan = sheet pertama
const COL_NIK    = 'NIK (Nomor Induk Kependudukan)';
const COL_HP     = 'No Hp (WA)';
const COL_TS     = 'Timestamp';

function doGet(e){
  try{
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sh = SHEET_NAME ? ss.getSheetByName(SHEET_NAME) : ss.getSheets()[0];
    const values = sh.getDataRange().getValues();
    if(!values.length) return jsonResp({rows:[], count:0, fetched_at: new Date().toISOString()});

    const headers = values[0].map(h => String(h));
    const idxNIK  = headers.indexOf(COL_NIK);
    const idxHP   = headers.indexOf(COL_HP);
    const idxTS   = headers.indexOf(COL_TS);

    const out = [];
    for(let i=1; i<values.length; i++){
      const row = values[i];
      // skip baris kosong (tanpa Timestamp)
      if(idxTS>=0){
        const ts = row[idxTS];
        if(!ts || (typeof ts === 'string' && ts.trim()==='')) continue;
      }
      const obj = {};
      for(let j=0; j<headers.length; j++){
        const h = headers[j];
        if(j===idxNIK || j===idxHP) continue; // PII: tidak dikirim
        let v = row[j];
        if(v instanceof Date) v = v.toISOString();
        obj[h] = v;
      }
      // hash PII — tetap dikirim sebagai hash untuk deteksi duplikat
      if(idxNIK>=0) obj.nik_hash = hashNIK(row[idxNIK]);
      if(idxHP>=0)  obj.hp_hash  = hashHP(row[idxHP]);
      out.push(obj);
    }
    return jsonResp({rows: out, count: out.length, fetched_at: new Date().toISOString()});
  }catch(err){
    return jsonResp({error: String(err && err.message || err), rows: [], count: 0});
  }
}

function hashNIK(v){
  if(v===null || v===undefined || v==='') return null;
  const s = String(v).trim().replace(/\s+/g,'').toLowerCase();
  return s ? sha256Hex(s) : null;
}
function hashHP(v){
  if(v===null || v===undefined || v==='') return null;
  const s = String(v).replace(/[\s\-\+\(\)\.]/g,'').replace(/^62/,'0').replace(/^0+/,'0');
  return s ? sha256Hex(s) : null;
}
function sha256Hex(s){
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8);
  let hex='';
  for(let i=0; i<bytes.length; i++){
    let b = bytes[i]; if(b<0) b+=256;
    const h = b.toString(16);
    hex += h.length===1 ? '0'+h : h;
  }
  return hex;
}
function jsonResp(obj){
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * ── CARA DEPLOY ────────────────────────────────────────────────────────────
 *
 * 1.  Buka https://script.google.com → klik "New project".
 * 2.  Hapus isi `Code.gs` bawaan, lalu paste seluruh isi file ini.
 * 3.  Klik ikon gembok / "Project Settings" → centang "Show appsscript.json
 *     manifest file in editor" (opsional, tidak wajib).
 * 4.  Pastikan akun yang membuka Apps Script ini = akun yang punya akses
 *     baca ke spreadsheet (akun BPS yang sama).
 * 5.  Klik "Deploy" (kanan atas) → "New deployment".
 * 6.  Klik gear ⚙️ di sebelah "Select type" → pilih "Web app".
 * 7.  Isi:
 *        Description : Dashboard SE2026 Proxy v1
 *        Execute as  : Me (akun BPS pemilik spreadsheet)
 *        Who has access : Anyone
 *     ("Anyone" di sini berarti URL Web App-nya bersifat publik. Yang
 *      di-share publik adalah HASIL JSON yang sudah di-strip PII, bukan
 *      spreadsheet. Tanpa "Anyone", browser pengunjung dashboard tidak
 *      bisa hit endpoint ini tanpa login Google.)
 * 8.  Klik "Deploy" → akan muncul dialog "Authorize access".
 * 9.  Klik "Authorize access" → pilih akun BPS → "Advanced" → "Go to ...
 *     (unsafe)" → "Allow". Ini wajar, ini akun sendiri yang authorize
 *     skripnya sendiri.
 * 10. Setelah berhasil, akan muncul URL "Web app" seperti:
 *        https://script.google.com/macros/s/AKfycb.../exec
 *     SALIN URL ini.
 * 11. Buka file `index.html` di repo, cari konstanta `WEBAPP_URL`, tempel
 *     URL tersebut.
 * 12. Setelah dashboard sudah pakai Web App, JADIKAN spreadsheet PRIVATE
 *     (cabut "Anyone with link") — karena sekarang dashboard tidak butuh
 *     spreadsheet publik lagi.
 *
 * ── KALAU MAU UPDATE KODE INI NANTI ────────────────────────────────────────
 *  - Setiap perubahan harus di-deploy ulang: Deploy → "Manage deployments"
 *    → klik pensil → Version: "New version" → Deploy.
 *  - URL Web App TIDAK berubah selama Anda update deployment yang sama.
 */
