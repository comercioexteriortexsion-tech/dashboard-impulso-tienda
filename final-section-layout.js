(function(){
  var FINAL_LAYOUT_VERSION='20260917-layout-pc-mobile-1';

  function safeNumber(value){
    if(typeof toNumber==='function')return toNumber(value);
    var n=Number(String(value||'').replace('%','').replace(',', '.'));
    return isFinite(n)?n:0;
  }

  function safeFormatNumber(value){
    if(typeof formatNumber==='function')return formatNumber(value);
    return String(Math.round(safeNumber(value))).replace(/\B(?=(\d{3})+(?!\d))/g,'.');
  }

  function safeFormatPercent(value){
    if(typeof formatPercent==='function')return formatPercent(value);
    var n=safeNumber(value);
    if(n>0&&n<=1)return Math.round(n*100)+'%';
    return Math.round(n)+'%';
  }

  function safeHtml(value){
    if(typeof escapeHtml==='function')return escapeHtml(value);
    return String(value==null?'':value).replace(/[&<>'"]/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c];
    });
  }

  function safeAttr(value){
    if(typeof escapeAttribute==='function')return escapeAttribute(value);
    return safeHtml(value).replace(/`/g,'&#96;');
  }

  function getRefs(row){
    if(!row)return [];
    if(Array.isArray(row.productosCriticos))return row.productosCriticos;
    if(Array.isArray(row.referencias))return row.referencias;
    return [];
  }

  function getLevelFromItem(item){
    if(typeof getCriterionLevel==='function')return getCriterionLevel(item);

    var text=String([
      item&&item.prioridad_simple,
      item&&item.prioridad_revision,
      item&&item.prioridad,
      item&&item.criterio_critico,
      item&&item.tipo_alerta,
      item&&item.motivo_simple
    ].filter(Boolean).join(' ')).toLowerCase();

    if(/urgente|alta|criterio\s*1|sin venta|no ha vendido|no vendio|no vendió/.test(text))return 1;
    if(/revisar|media|criterio\s*2|cobertura|rotacion|rotación|lento/.test(text))return 2;
    return 3;
  }

  function getCounts(row){
    var c1=safeNumber(row&&(row.referenciasUrgentes||row.referencias_urgentes));
    var c2=safeNumber(row&&(row.referenciasRevisar||row.referencias_revisar));
    var c3=safeNumber(row&&(row.referenciasSeguimiento||row.referencias_seguimiento));

    if(c1||c2||c3)return {c1:c1,c2:c2,c3:c3};

    getRefs(row).forEach(function(item){
      var level=getLevelFromItem(item);
      if(level===1)c1++;
      else if(level===2)c2++;
      else c3++;
    });

    return {c1:c1,c2:c2,c3:c3};
  }

  function renderChips(row){
    var counts=getCounts(row||{});
    var chips=[];
    if(counts.c1)chips.push('<span class="final-zone-chip final-zone-chip--urgent">'+safeFormatNumber(counts.c1)+' urgente'+(counts.c1===1?'':'s')+'</span>');
    if(counts.c2)chips.push('<span class="final-zone-chip final-zone-chip--review">'+safeFormatNumber(counts.c2)+' revisar</span>');
    if(counts.c3)chips.push('<span class="final-zone-chip final-zone-chip--follow">'+safeFormatNumber(counts.c3)+' seguimiento</span>');
    return chips.length?'<div class="final-zone-chips">'+chips.join('')+'</div>':'';
  }

  function sortRows(rows){
    return [].concat(rows||[]).sort(function(a,b){
      var oa=safeNumber(a&&(a.ordenPrioridadSeccion||a.orden_prioridad_seccion||a.orden));
      var ob=safeNumber(b&&(b.ordenPrioridadSeccion||b.orden_prioridad_seccion||b.orden));
      if(oa||ob)return (oa||9999)-(ob||9999);

      var ca=getCounts(a);
      var cb=getCounts(b);
      return cb.c1-ca.c1||cb.c2-ca.c2||cb.c3-ca.c3||safeNumber(b&&b.alertas)-safeNumber(a&&a.alertas)||safeNumber(b&&b.porcentajeAlertas)-safeNumber(a&&a.porcentajeAlertas)||String((a&&a.mundo)||'').localeCompare(String((b&&b.mundo)||''),'es');
    });
  }

  function injectStyles(){
    var old=document.getElementById('finalSectionLayoutStyles');
    if(old)old.remove();

    var style=document.createElement('style');
    style.id='finalSectionLayoutStyles';
    style.textContent=`
      :root{
        --final-blue:#1f6bff;
        --final-blue-dark:#163a70;
        --final-blue-soft:#f7fbff;
        --final-blue-border:#b7d6ff;
        --final-blue-line:#d7e8ff;
        --final-muted:#6b7f9e;
        --final-badge:#dcebff;
        --final-red:#ff3b30;
        --final-red-dark:#c81e1e;
        --final-yellow:#f4b400;
        --final-yellow-dark:#9a6700;
        --final-green:#22c55e;
        --final-green-dark:#15803d;
      }

      .category-list{
        display:flex!important;
        flex-direction:column!important;
        gap:12px!important;
      }

      .final-zone-card{
        width:100%!important;
        min-width:0!important;
        background:linear-gradient(180deg,var(--final-blue-soft) 0%,#ffffff 100%)!important;
        border:1.8px solid var(--final-blue-border)!important;
        border-left:1.8px solid var(--final-blue-border)!important;
        border-radius:18px!important;
        box-shadow:0 8px 20px rgba(59,130,246,.08)!important;
        overflow:hidden!important;
      }

      .final-zone-card.is-open{
        background:linear-gradient(180deg,#f2f8ff 0%,#ffffff 100%)!important;
        border-color:#9fc8ff!important;
      }

      .final-zone-button{
        width:100%!important;
        min-width:0!important;
        display:grid!important;
        grid-template-columns:minmax(260px,1.05fr) minmax(360px,1fr)!important;
        gap:18px!important;
        align-items:center!important;
        padding:16px 18px!important;
        border:0!important;
        background:transparent!important;
        text-align:left!important;
        cursor:pointer!important;
        font-family:inherit!important;
      }

      .final-zone-top{
        display:grid!important;
        grid-template-columns:44px minmax(0,1fr)!important;
        gap:12px!important;
        align-items:center!important;
        min-width:0!important;
      }

      .final-zone-rank{
        width:38px!important;
        height:38px!important;
        border-radius:999px!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        background:var(--final-badge)!important;
        color:#1d5fd0!important;
        font-weight:950!important;
        font-size:1rem!important;
        line-height:1!important;
        flex:0 0 auto!important;
      }

      .final-zone-info{
        min-width:0!important;
      }

      .final-zone-title{
        display:block!important;
        color:var(--final-blue-dark)!important;
        font-size:1.05rem!important;
        font-weight:950!important;
        line-height:1.08!important;
        letter-spacing:-.015em!important;
        white-space:normal!important;
        overflow:visible!important;
        text-overflow:clip!important;
        max-width:100%!important;
      }

      .final-zone-subtitle{
        display:block!important;
        color:var(--final-muted)!important;
        font-size:.78rem!important;
        font-weight:650!important;
        line-height:1.15!important;
        margin-top:3px!important;
      }

      .final-zone-chips{
        display:flex!important;
        flex-wrap:wrap!important;
        gap:7px!important;
        align-items:center!important;
        margin-top:9px!important;
        max-width:100%!important;
      }

      .final-zone-chip{
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        border-radius:999px!important;
        padding:6px 12px!important;
        font-size:.72rem!important;
        font-weight:950!important;
        line-height:1!important;
        white-space:nowrap!important;
        border:1px solid transparent!important;
        box-shadow:0 4px 10px rgba(15,23,42,.14)!important;
      }

      .final-zone-chip--urgent{
        background:var(--final-red)!important;
        color:#ffffff!important;
        border-color:var(--final-red-dark)!important;
      }

      .final-zone-chip--review{
        background:var(--final-yellow)!important;
        color:#111827!important;
        border-color:var(--final-yellow-dark)!important;
      }

      .final-zone-chip--follow{
        background:var(--final-green)!important;
        color:#ffffff!important;
        border-color:var(--final-green-dark)!important;
      }

      .final-zone-bottom{
        display:grid!important;
        grid-template-columns:auto minmax(0,1fr)!important;
        gap:16px!important;
        align-items:center!important;
        min-width:0!important;
      }

      .final-zone-action{
        min-width:72px!important;
        height:38px!important;
        padding:0 16px!important;
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        border-radius:999px!important;
        background:#ffffff!important;
        color:var(--final-blue)!important;
        border:2px solid var(--final-blue)!important;
        font-weight:950!important;
        font-size:.94rem!important;
        line-height:1!important;
        box-shadow:none!important;
      }

      .final-zone-metrics{
        display:grid!important;
        grid-template-columns:repeat(4,minmax(0,1fr))!important;
        gap:8px!important;
        align-items:center!important;
        min-width:0!important;
        padding-top:4px!important;
      }

      .final-zone-metric{
        min-width:0!important;
        text-align:center!important;
      }

      .final-zone-metric span{
        display:block!important;
        color:var(--final-muted)!important;
        font-size:.72rem!important;
        font-weight:700!important;
        line-height:1.05!important;
        white-space:nowrap!important;
      }

      .final-zone-metric strong{
        display:block!important;
        margin-top:4px!important;
        color:#0f2554!important;
        font-size:1rem!important;
        font-weight:950!important;
        line-height:1!important;
        white-space:nowrap!important;
      }

      .final-zone-metric--alert strong{
        color:var(--final-red)!important;
      }

      .final-zone-references{
        padding:0 12px 12px!important;
      }

      @media(min-width:761px){
        .final-zone-button{
          min-height:108px!important;
        }

        .final-zone-bottom{
          border-left:1px solid var(--final-blue-line)!important;
          padding-left:18px!important;
        }
      }

      @media(max-width:760px){
        .section-block{padding:12px 10px!important;overflow:hidden!important;}
        .final-zone-button{
          grid-template-columns:1fr!important;
          gap:13px!important;
          padding:16px 16px 14px!important;
        }

        .final-zone-bottom{
          border-top:1px solid var(--final-blue-line)!important;
          padding-top:13px!important;
          grid-template-columns:auto minmax(0,1fr)!important;
          gap:12px!important;
        }

        .final-zone-title{font-size:1rem!important;}
        .final-zone-subtitle{font-size:.78rem!important;}
        .final-zone-metrics{gap:5px!important;}
        .final-zone-metric span{font-size:.68rem!important;}
        .final-zone-metric strong{font-size:.92rem!important;}
        .final-zone-references{padding:0 8px 10px!important;}
      }

      @media(max-width:390px){
        .final-zone-button{padding:14px 12px 12px!important;}
        .final-zone-top{grid-template-columns:38px minmax(0,1fr)!important;gap:10px!important;}
        .final-zone-rank{width:34px!important;height:34px!important;font-size:.92rem!important;}
        .final-zone-title{font-size:.92rem!important;}
        .final-zone-subtitle{font-size:.72rem!important;}
        .final-zone-chip{font-size:.64rem!important;padding:5px 9px!important;}
        .final-zone-bottom{grid-template-columns:64px minmax(0,1fr)!important;gap:8px!important;}
        .final-zone-action{min-width:62px!important;height:34px!important;padding:0 10px!important;font-size:.86rem!important;}
        .final-zone-metrics{gap:3px!important;}
        .final-zone-metric span{font-size:.61rem!important;}
        .final-zone-metric strong{font-size:.82rem!important;}
      }
    `;
    document.head.appendChild(style);
  }

  function renderFinalSectionCard(row,index){
    var isOpen=typeof openSectionKey!=='undefined'&&openSectionKey===row.key;
    var refs=getRefs(row);

    return `
      <article class="final-zone-card ${isOpen?'is-open':''}">
        <button class="final-zone-button" type="button" onclick="toggleSection('${safeAttr(row.key)}')" aria-expanded="${isOpen}">
          <div class="final-zone-top">
            <div class="final-zone-rank">${index+1}</div>
            <div class="final-zone-info">
              <strong class="final-zone-title">${safeHtml(row.mundo)} / ${safeHtml(row.seccion)}</strong>
              <span class="final-zone-subtitle">${safeFormatNumber(row.totalReferencias)} referencias totales</span>
              ${renderChips(row)}
            </div>
          </div>
          <div class="final-zone-bottom">
            <span class="final-zone-action">${isOpen?'Cerrar':'Ver'}</span>
            <div class="final-zone-metrics">
              <div class="final-zone-metric"><span>Hay</span><strong>${safeFormatNumber(row.inventario)}</strong></div>
              <div class="final-zone-metric"><span>Vendió</span><strong>${safeFormatNumber(row.ventaUnidades)}</strong></div>
              <div class="final-zone-metric final-zone-metric--alert"><span>Revisar</span><strong>${safeFormatNumber(row.alertas)}</strong></div>
              <div class="final-zone-metric"><span>% revisar</span><strong>${safeFormatPercent(row.porcentajeAlertas)}</strong></div>
            </div>
          </div>
        </button>
        <div class="final-zone-references ${isOpen?'':'hidden'}">
          ${isOpen&&typeof renderSectionReferences==='function'?renderSectionReferences(refs):''}
        </div>
      </article>
    `;
  }

  function renderFinalSections(rows){
    injectStyles();

    var container=document.getElementById('mundoSeccionContainer');
    if(!container)return;

    if(!currentStoreName){
      if(typeof renderGeneralDashboard==='function')renderGeneralDashboard();
      return;
    }

    if(!Array.isArray(rows)||!rows.length){
      openSectionKey=null;
      if(typeof renderEmptyState==='function'){
        container.innerHTML=renderEmptyState('Sin zonas críticas','Esta tienda no tiene referencias que cumplan los criterios definidos para revisión.');
      }else{
        container.innerHTML='<div class="empty-state"><p>Sin zonas críticas</p></div>';
      }
      return;
    }

    var sortedRows=sortRows(rows);
    var note=`
      <div class="info-note">
        <strong>Solo se muestran productos que necesitan gestión.</strong>
        <span>Se priorizan referencias con inventario y poca o ninguna venta reciente.</span>
      </div>
    `;

    container.innerHTML=sortedRows.map(function(row,index){
      return renderFinalSectionCard(row,index);
    }).join('')+note;
  }

  function patchRenderers(){
    if(typeof renderDashboard==='function'){
      renderDashboard=function(storeName){
        var dashboard=storeDashboards&&storeDashboards[storeName];
        if(!storeName||!dashboard){
          if(typeof renderGeneralDashboard==='function')renderGeneralDashboard();
          return;
        }
        if(typeof renderSummaryCalculated==='function')renderSummaryCalculated(dashboard.resumen);
        renderFinalSections(dashboard.zonas||[]);
      };
    }

    renderMundoSeccionCalculated=function(rows){
      renderFinalSections(rows||[]);
    };

    toggleSection=function(sectionKey){
      openSectionKey=openSectionKey===sectionKey?null:sectionKey;
      if(typeof renderDashboard==='function')renderDashboard(currentStoreName);
    };
  }

  function refreshCurrent(){
    try{
      if(typeof currentStoreName!=='undefined'&&currentStoreName&&typeof renderDashboard==='function'){
        renderDashboard(currentStoreName);
      }
    }catch(e){
      console.warn('No se pudo refrescar layout final',e);
    }
  }

  function init(){
    injectStyles();
    patchRenderers();
    setTimeout(function(){
      patchRenderers();
      injectStyles();
      refreshCurrent();
    },120);
    setTimeout(function(){
      patchRenderers();
      injectStyles();
      refreshCurrent();
    },900);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
