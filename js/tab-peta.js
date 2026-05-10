function initMap(){
  if(lmap)return;
  lmap = L.map('map',{scrollWheelZoom:true,attributionControl:false,zoomControl:true});
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',{
    subdomains:'abcd', maxZoom:19
  }).addTo(lmap);
  L.control.attribution({prefix:'© OpenStreetMap © CartoDB'}).addTo(lmap);
}

function getColor(n, mx, target){
  if(mapMode==='target'){
    if(!target) return '#e5e7eb';
    if(n>=target) return '#059669';
    const r = n/target;
    if(r>=.75) return '#84cc16';
    if(r>=.50) return '#facc15';
    if(r>=.25) return '#f97316';
    return '#ef4444';
  }
  if(!n) return '#f1f5f9';
  const t = n/mx;
  if(t>.80) return '#1e3a8a';
  if(t>.60) return '#2563eb';
  if(t>.40) return '#3b82f6';
  if(t>.25) return '#60a5fa';
  if(t>.10) return '#93c5fd';
  return '#dbeafe';
}

function paintMap(){
  const nmToId = {};
  if(geo) geo.features.forEach(f=>{
    const nm = (f.properties.nmdesa||'').trim().toUpperCase();
    if(nm) nmToId[nm] = f.properties.iddesa;
  });
  const cnt = {};
  getBase().forEach(r=>{
    const nm = (r['Desa Domisili']||r['nmdesa']||'').trim().toUpperCase();
    const id = (nm && nmToId[nm]) || r['iddesa'];
    if(id) cnt[id] = (cnt[id]||0)+1;
  });
  const mx = Math.max(...Object.values(cnt), 1);

  if(gjLayer){ gjLayer.remove(); gjLayer=null; }

  gjLayer = L.geoJSON(geo,{
    style: f=>{
      const id=f.properties.iddesa;
      const n=cnt[id]||0;
      const tgt=targetByIdDesa[String(id)]||0;
      const fop = mapMode==='target'
        ? (tgt ? 0.92 : 0.35)
        : (n ? 0.92 : 0.45);
      return { fillColor:getColor(n,mx,tgt), weight:0.3, opacity:1, color:'#ffffff', fillOpacity: fop };
    },
    onEachFeature:(f,layer)=>{
      const p=f.properties, n=cnt[p.iddesa]||0, tgt=targetByIdDesa[String(p.iddesa)]||0;
      const pct = tgt>0 ? Math.round(n/tgt*100) : 0;
      let statusHtml = '';
      if(tgt>0){
        if(n>=tgt) statusHtml = `<div style="font-size:11px;font-weight:700;margin-top:4px;color:#059669">✅ Memenuhi target (${pct}%)</div>`;
        else if(n===0) statusHtml = `<div style="font-size:11px;font-weight:700;margin-top:4px;color:#dc2626">⛔ Belum ada pendaftar</div>`;
        else statusHtml = `<div style="font-size:11px;font-weight:700;margin-top:4px;color:#d97706">⚠️ Kurang ${tgt-n} (${pct}%)</div>`;
      }
      const html = `<div class="lf-popup">
        <h4>${esc(p.nmdesa)}</h4>
        <div class="sub">Kec. ${esc(p.nmkec)}</div>
        <div class="cnt">${n} pendaftar</div>
        ${tgt>0?`<div style="font-size:11px;color:#64748b;margin-top:4px">Target: <b>${tgt}</b> petugas</div>`:''}
        ${statusHtml}
      </div>`;
      layer.bindTooltip(html, {sticky:true, direction:'auto', className:'lf-tt', opacity:1});
      layer.on('mouseover',()=>layer.setStyle({weight:1.5,color:'#0f172a',fillOpacity:1}));
      layer.on('mouseout', ()=>gjLayer&&gjLayer.resetStyle(layer));
    }
  }).addTo(lmap);

  lmap.fitBounds(gjLayer.getBounds(),{padding:[16,16]});
  set('ml-min','0'); set('ml-max', String(mx));
  document.getElementById('ml-count').style.display = mapMode==='count' ? 'flex' : 'none';
  document.getElementById('ml-target').style.display = mapMode==='target' ? 'flex' : 'none';
}

function setMapMode(m, btn){
  mapMode = m;
  document.querySelectorAll('#mm-seg .seg-b').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  if(gjLayer && geo){
    paintMap();
    const kec = document.getElementById('mkf').value;
    if(kec) gjLayer.eachLayer(layer=>{
      const show = layer.feature.properties.nmkec===kec;
      layer.setStyle({ opacity:show?1:.12, fillOpacity:show?0.92:.04 });
    });
  }
}

function mapFilter(){
  const kec = document.getElementById('mkf').value;
  if(!gjLayer)return;
  gjLayer.eachLayer(layer=>{
    const show = !kec || layer.feature.properties.nmkec===kec;
    layer.setStyle({ opacity:show?1:.12, fillOpacity:show?0.92:.04 });
  });
  if(kec){
    const feats = geo.features.filter(f=>f.properties.nmkec===kec);
    if(feats.length) lmap.fitBounds(L.geoJSON({type:'FeatureCollection',features:feats}).getBounds(),{padding:[24,24]});
  } else {
    lmap.fitBounds(gjLayer.getBounds(),{padding:[16,16]});
  }
}
