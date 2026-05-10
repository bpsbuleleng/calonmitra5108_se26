function renderReqs(){
  const base = getBase();
  const tot=base.length||1;
  const reqs=[
    {icon:'🏍️',label:'Bisa Kendarai Motor',
     chk:r=>/(ya|bisa|iya)/i.test(r['Menguasai dan mampu mengendarai kendaraan bermotor']||''),col:'#3b82f6'},
    {icon:'📱',label:'Punya Smartphone Android',
     chk:r=>/(ya|bisa|iya)/i.test(r['Memiliki, menguasai, dan dapat menggunakan HP/smartphone android']||''),col:'#10b981'},
    {icon:'📄',label:'Surat Rekomendasi Tersedia',
     chk:r=>/(ya|iya|sudah|ada)/i.test(r['Memiliki Surat Rekomendasi Calon Petugas Sensus Ekonomi 2026 dari Perbekel/Lurah']||''),col:'#8b5cf6'},
    {icon:'✍️',label:'Surat Pernyataan Siap',
     chk:r=>/(ya|iya|sudah|ada)/i.test(r['Surat Pernyataan Kesiapan Melaksanakan Tugas Sensus Ekonomi 2026']||''),col:'#f59e0b'},
    {icon:'🤝',label:'Registrasi Sobat Mitra',
     chk:r=>/(sudah|ya|iya)/i.test(r['Sudah melakukan pendaftaran/registrasi melalui Sobat Mitra?']||''),col:'#06b6d4'},
    {icon:'🪪',label:'Upload KTP',
     chk:r=>!!(r['KTP']||'').trim(),col:'#ef4444'}
  ];
  document.getElementById('rg').innerHTML = reqs.map(req=>{
    const n=base.filter(req.chk).length;
    const p=Math.round(n/tot*100);
    return `<div class="rc">
      <div class="ri">${req.icon}</div>
      <div class="rp" style="color:${req.col}">${p}%</div>
      <div class="rl">${req.label}</div>
      <div class="pb"><div class="pf" style="width:${p}%;background:${req.col}"></div></div>
      <div style="font-size:10px;color:var(--muted);margin-top:3px">${n} / ${tot}</div>
    </div>`;
  }).join('');
}
