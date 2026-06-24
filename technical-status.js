(function(){
  function num(v){return Number(v)||0;}

  function addStyles(){
    if(document.getElementById('technicalStatusStyles'))return;
    var style=document.createElement('style');
    style.id='technicalStatusStyles';
    style.textContent='.technical-status-panel{margin:10px 0 18px;padding:10px 12px;border:1px solid rgba(148,163,184,.55);border-radius:16px;background:rgba(255,255,255,.82);box-shadow:0 8px 20px rgba(15,23,42,.06);font-size:.76rem;color:#334155}.technical-status-panel strong{color:#0f172a}.technical-status-row{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center}.technical-status-chip{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:4px 8px;font-weight:850;background:#e2e8f0;color:#334155}.technical-status-chip--ok{background:#dcfce7;color:#166534}.technical-status-chip--warn{background:#fef3c7;color:#92400e}.technical-status-chip--info{background:#dbeafe;color:#1d4ed8}@media(max-width:760px){.technical-status-panel{font-size:.68rem;margin:8px 0 14px;padding:9px}.technical-status-row{gap:5px}.technical-status-chip{padding:3px 6px}}';
    document.head.appendChild(style);
  }

  function ensurePanel(){
    addStyles();
    var panel=document.getElementById('technicalStatusPanel');
    if(panel)return panel;
    var summary=document.getElementById('summaryGrid');
    if(!summary||!summary.parentNode)return null;
    panel=document.createElement('section');
    panel.id='technicalStatusPanel';
    panel.className='technical-status-panel';
    panel.setAttribute('aria-label','Estado tecnico del dashboard');
    summary.insertAdjacentElement('afterend',panel);
    return panel;
  }

  function currentDashboard(){
    try{
      if(typeof currentStoreName!=='undefined'&&currentStoreName&&typeof storeDashboards!=='undefined'){
        return storeDashboards[currentStoreName]||null;
      }
    }catch(e){}
    return null;
  }

  function renderStatus(){
    var panel=ensurePanel();
    if(!panel)return;
    var updated=(document.getElementById('ultimaActualizacion')||{}).textContent||'Sin dato';
    var store='Vista general';
    try{if(typeof currentStoreName!=='undefined'&&currentStoreName)store=currentStoreName;}catch(e){}

    var dash=currentDashboard();
    if(!dash){
      panel.innerHTML='<div class="technical-status-row"><strong>Estado técnico</strong><span class="technical-status-chip technical-status-chip--info">Vista general</span><span>Actualización: '+updated+'</span></div>';
      return;
    }

    var zonas=Array.isArray(dash.zonas)?dash.zonas:[];
    var refs=0;
    var calc=false;
    zonas.forEach(function(z){
      refs+=Array.isArray(z.productosCriticos)?z.productosCriticos.length:0;
      if(z.referenciasUrgentes!==undefined||z.referenciasRevisar!==undefined||z.referenciasSeguimiento!==undefined){calc=true;}
    });

    var chip=calc?'technical-status-chip--ok':'technical-status-chip--warn';
    var label=calc?'Apps Script OK':'Usando respaldo';
    panel.innerHTML='<div class="technical-status-row"><strong>Estado técnico</strong><span class="technical-status-chip '+chip+'">'+label+'</span><span class="technical-status-chip technical-status-chip--info">'+zonas.length+' zonas</span><span class="technical-status-chip technical-status-chip--info">'+refs+' refs.</span><span>Tienda: '+store+'</span><span>Actualización: '+updated+'</span></div>';
  }

  function wrapRender(name){
    if(typeof window[name]!=='function')return;
    var original=window[name];
    window[name]=function(){
      var result=original.apply(this,arguments);
      setTimeout(renderStatus,80);
      return result;
    };
  }

  function init(){
    wrapRender('renderGeneralDashboard');
    wrapRender('renderDashboard');
    setTimeout(renderStatus,500);
    setTimeout(renderStatus,1600);
    setTimeout(renderStatus,3200);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
