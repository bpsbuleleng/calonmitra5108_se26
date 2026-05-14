// ── FIELD HELPERS ─────────────────────────────────────────────────────────────
// Kolom kepka dicari saat data pertama kali dimuat. Kolom lain dicari dengan fallback.
let _kepkaColKey = null;

function initKepkaFieldKeys(rows){
  _kepkaColKey = null;
  if(!rows.length) return;
  const keys = Object.keys(rows[0]);
  // cari kolom yang mengandung kata 'kepka' (case-insensitive), kecuali 'kecamatan'
  _kepkaColKey = keys.find(k => /kepka/i.test(k) && !/kecamatan/i.test(k)) || null;
}

function kNama(r){ return r['Nama Lengkap'] || r['Nama'] || ''; }
function kKec(r){ return r['Kecamatan'] || r['Kecamatan Domisili'] || r['Kecamatan/Kota'] || ''; }
function kDesa(r){ return r['Desa'] || r['Desa Domisili'] || r['Desa/Kelurahan'] || r['Kelurahan'] || ''; }
function kJab(r){ return r['Jabatan'] || r['Jenis Jabatan'] || r['Posisi'] || ''; }
function kKepkaVal(r){ return _kepkaColKey ? r[_kepkaColKey] : undefined; }

function isKepkaOk(r){
  const v = kKepkaVal(r);
  if(v === undefined || v === null) return false;
  const s = String(v).trim().toUpperCase();
  return s !== '' && s !== 'NA' && s !== '#N/A' && s !== 'N/A' &&
         s !== '#VALUE!' && s !== '#REF!' && s !== '#ERROR!' && s !== 'FALSE' && s !== '0';
}

function abbrJab(v){
  if(!v) return '–';
  const u = String(v).toUpperCase();
  if(u.includes('PPL')) return '<span class="bdg bg">PPL</span>';
  if(u.includes('PML')) return '<span class="bdg by">PML</span>';
  return esc(String(v));
}

function jabAbbrev(v){
  if(!v) return '';
  const u = String(v).toUpperCase();
  if(u.includes('PPL')) return 'PPL';
  if(u.includes('PML')) return 'PML';
  return String(v);
}

// ── FILTER ─────────────────────────────────────────────────────────────────────

function buildKepkaFilters(){
  const kecs = [...new Set(kepkaRows.map(r => kKec(r).trim()).filter(Boolean))].sort();
  const jabs = [...new Set(kepkaRows.map(r => jabAbbrev(kJab(r))).filter(Boolean))].sort();

  const fkec = document.getElementById('kepka-fkec');
  if(fkec) fkec.innerHTML = '<option value="">Semua Kecamatan</option>' +
    kecs.map(k => `<option value="${esc(k)}">${esc(k)}</option>`).join('');

  const fjab = document.getElementById('kepka-fjab');
  if(fjab) fjab.innerHTML = '<option value="">Semua Jabatan</option>' +
    jabs.map(j => `<option value="${esc(j)}">${esc(j)}</option>`).join('');

  const totalEl = document.getElementById('kepka-total');
  if(totalEl) totalEl.textContent = kepkaRows.length;

  const okCount = kepkaRows.filter(isKepkaOk).length;
  const okEl = document.getElementById('kepka-ok');
  if(okEl) okEl.textContent = okCount;

  const naEl = document.getElementById('kepka-na');
  if(naEl) naEl.textContent = kepkaRows.length - okCount;
}

function doKepkaFilter(){
  const q      = (document.getElementById('kepka-srch')?.value || '').toLowerCase();
  const kec    = document.getElementById('kepka-fkec')?.value || '';
  const jab    = document.getElementById('kepka-fjab')?.value || '';
  const status = document.getElementById('kepka-fstatus')?.value || '';

  kepkaFrows = kepkaRows.filter(r => {
    const nm = kNama(r).toLowerCase();
    const ds = kDesa(r).toLowerCase();
    const rowJab = jabAbbrev(kJab(r));
    const ok = isKepkaOk(r);
    return (!q      || nm.includes(q) || ds.includes(q))
        && (!kec    || kKec(r).trim() === kec)
        && (!jab    || rowJab === jab)
        && (!status || (status === 'ok' ? ok : !ok));
  });

  sortKepkaRows();
  kepkaPage = 1;
  renderKepka();
}

// ── SORT ──────────────────────────────────────────────────────────────────────

const kepkaSortMap = {
  nama:  r => kNama(r).toLowerCase(),
  kec:   r => kKec(r).toLowerCase(),
  desa:  r => kDesa(r).toLowerCase(),
  jab:   r => jabAbbrev(kJab(r)).toLowerCase(),
  kepka: r => isKepkaOk(r) ? 1 : 0
};

function sortKepkaRows(){
  const get = kepkaSortMap[kepkaSort.key];
  if(!get) return;
  const sgn = kepkaSort.dir === 'desc' ? -1 : 1;
  kepkaFrows.sort((a, b) => {
    const va = get(a), vb = get(b);
    return va < vb ? -sgn : va > vb ? sgn : 0;
  });
}

function setKepkaSort(key){
  if(kepkaSort.key === key) kepkaSort.dir = kepkaSort.dir === 'asc' ? 'desc' : 'asc';
  else kepkaSort = {key, dir: key === 'kepka' ? 'desc' : 'asc'};
  sortKepkaRows();
  kepkaPage = 1;
  renderKepka();
}

function updateKepkaSortInd(){
  document.querySelectorAll('#tsec-kepka thead th[data-sort]').forEach(th => {
    const k = th.dataset.sort;
    th.classList.toggle('sa', kepkaSort.key === k && kepkaSort.dir === 'asc');
    th.classList.toggle('sd', kepkaSort.key === k && kepkaSort.dir === 'desc');
  });
}

// ── RENDER ─────────────────────────────────────────────────────────────────────

function renderKepka(){
  const tb = document.getElementById('kepkatb');
  if(!tb) return;

  if(!kepkaRows.length){
    tb.innerHTML = `<tr><td colspan="6"><div class="es"><div class="es-i">📭</div>Data Mitra Kepka belum tersedia.<br><small style="color:var(--muted)">Pastikan Apps Script sudah di-redeploy dan sheet "Impor Gform Kepka" ada.</small></div></td></tr>`;
    renderKepkaPg();
    return;
  }

  const st = (kepkaPage - 1) * KEPKA_PAGE_SZ;
  const pg = kepkaFrows.slice(st, st + KEPKA_PAGE_SZ);

  if(!pg.length){
    tb.innerHTML = `<tr><td colspan="6"><div class="es"><div class="es-i">🔍</div>Tidak ada data yang cocok</div></td></tr>`;
  } else {
    tb.innerHTML = pg.map((r, i) => {
      const ok = isKepkaOk(r);
      return `<tr>
        <td>${st + i + 1}</td>
        <td style="font-weight:600;min-width:140px">${esc(kNama(r) || '–')}</td>
        <td style="white-space:nowrap">${esc(kKec(r) || '–')}</td>
        <td>${esc(kDesa(r) || '–')}</td>
        <td style="text-align:center">${abbrJab(kJab(r))}</td>
        <td style="text-align:center;font-size:15px" title="${ok ? 'Terdaftar' : 'Belum / NA'}">${ok ? '✅' : '❌'}</td>
      </tr>`;
    }).join('');
  }

  renderKepkaPg();
  updateKepkaSortInd();
}

function renderKepkaPg(){
  const tot = kepkaFrows.length;
  const tp  = Math.ceil(tot / KEPKA_PAGE_SZ);
  const st  = (kepkaPage - 1) * KEPKA_PAGE_SZ + 1;
  const en  = Math.min(kepkaPage * KEPKA_PAGE_SZ, tot);

  const pgi = document.getElementById('kepka-pgi');
  if(pgi) pgi.textContent = tot > 0 ? `Menampilkan ${st}–${en} dari ${tot} mitra` : 'Tidak ada data';

  let h = `<button class="pb2" onclick="goKepkaPage(${kepkaPage - 1})" ${kepkaPage <= 1 ? 'disabled' : ''}>‹</button>`;
  for(let p = Math.max(1, kepkaPage - 2); p <= Math.min(tp, kepkaPage + 2); p++)
    h += `<button class="pb2${p === kepkaPage ? ' on' : ''}" onclick="goKepkaPage(${p})">${p}</button>`;
  h += `<button class="pb2" onclick="goKepkaPage(${kepkaPage + 1})" ${kepkaPage >= tp ? 'disabled' : ''}>›</button>`;

  const pgb = document.getElementById('kepka-pgb');
  if(pgb) pgb.innerHTML = h;
}

function goKepkaPage(p){
  const tp = Math.ceil(kepkaFrows.length / KEPKA_PAGE_SZ);
  if(p < 1 || p > tp) return;
  kepkaPage = p;
  renderKepka();
}

// ── EXPORT ─────────────────────────────────────────────────────────────────────

function exportKepkaCSV(){
  const hdr  = ['No', 'Nama Lengkap', 'Kecamatan', 'Desa', 'Jabatan', 'Kepka'];
  const body = kepkaFrows.map((r, i) => [
    i + 1,
    kNama(r) || '',
    kKec(r)  || '',
    kDesa(r) || '',
    jabAbbrev(kJab(r)) || '',
    isKepkaOk(r) ? 'Terdaftar' : 'NA'
  ]);
  dlCSV([hdr, ...body], `mitra_kepka_se2026_${new Date().toISOString().split('T')[0]}.csv`);
  toast('File CSV berhasil diunduh', 'success');
}
