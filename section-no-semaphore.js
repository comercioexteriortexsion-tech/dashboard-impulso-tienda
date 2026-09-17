(function(){
  function safeNumber(value){
    if(typeof toNumber==='function')return toNumber(value);
    var n=Number(String(value||'').replace('%','').replace(',', '.'));
    return isFinite(n)?n:0;
  }

  function safeFormatNumber(value){
    if(typeof formatNumber==='function')return formatNumber(value);
    return String(safeNumber(value));
  }

  function safeFormatPercent(value){
    if(typeof formatPercent==='function')return formatPercent(value);
    return Math.round(safeNumber(value)*100)+'%';
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

  function getCounts(row){
    if(typeof countCriteriaBySection==='function')return countCriteriaBySection(row);
    return {
      c1:safeNumber(row&&(row.referenciasUrgentes||row.referencias_urgentes)),
      c2:safeNumber(row&&(row.referenciasRevisar||row.referencias_revisar)),
      c3:safeNumber(row&&(row.referenciasSeguimiento||row.referencias_seguimiento))
    };
  }

  function renderChips(row){
    var counts=getCounts(row||{});
    var chips=[];
    if(counts.c1)chips.push('<span class="section-count-chip section-count-chip--urgent">'+safeFormatNumber(counts.c1)+' urgente'+(counts.c1===1?'':'s')+'</span>');
    if(counts.c2)chips.push('<span class="section-count-chip section-count-chip--review">'+safeFormatNumber(counts.c2)+' revisar</span>');
    if(counts.c3)chips.push('<span class="section-count-chip section-count-chip--follow">'+safeFormatNumber(counts.c3)+' seguimiento</span>');
    return chips.length?'<div class="section-count-summary">'+chips.join('')+'</div>':'';
  }

  function getAccent(row,index){
    if(typeof getSectionAccentClass==='function')return getSectionAccentClass(row&&row.estadoGrupo,index);
    return 'accent-blue-soft';
  }

  function getRefs(row){
    if(!row)return [];
    if(Array.isArray(row.productosCriticos))return row.productosCriticos;
    if(Array.isArray(row.referencias))return row.referencias;
    return [];
  }

  function injectStableSectionStyles(){
    var existing=document.getElementById('noSectionSemaphoreStyles');
    if(existing)existing.remove();

    var style=document.createElement('style');
    style.id='noSectionSemaphoreStyles';
    style.textContent=`
      :root{
        --section-bg:#f7fbff;
        --section-bg-open:#f2f8ff;
        --section-border:#b7d6ff;
        --section-border-open:#9fc8ff;
        --section-title:#163a70;
        --section-muted:#6b7f9e;
        --section-blue:#1f6bff;
        --section-badge:#dcebff;
        --section-red:#ff3b30;
        --section-yellow:#f4b400;
        --section-green:#22c55e;
      }

      .category-list .category-card .status-pill,
      .category-list .category-card .status-prioritario,
      .category-list .category-card .status-revision,
      .category-list .category-card .status-controlado{
        display:none!important;
        visibility:hidden!important;
        width:0!important;
        height:0!important;
        min-width:0!important;
        padding:0!important;
        margin:0!important;
        border:0!important;
      }

      .category-list .category-card,
      .category-list .category-card.open,
      .category-list .category-card.accent-prioritario,
      .category-list .category-card.accent-revision,
      .category-list .category-card.accent-controlado,
      .category-list .category-card.accent-blue-soft{
        background:linear-gradient(180deg,var(--section-bg) 0%,#ffffff 100%)!important;
        border:1.8px solid var(--section-border)!important;
        border-left:1.8px solid var(--section-border)!important;
        box-shadow:0 8px 20px rgba(59,130,246,.08)!important;
        border-radius:18px!important;
        overflow:hidden!important;
        min-width:0!important;
      }

      .category-list .category-card.open{
        background:linear-gradient(180deg,var(--section-bg-open) 0%,#ffffff 100%)!important;
        border-color:var(--section-border-open)!important;
      }

      .category-list .category-card::before,
      .category-list .category-card::after,
      .category-list .category-card-header::before,
      .category-list .category-card-header::after,
      .category-list .section-card-button::before,
      .category-list .section-card-button::after{
        content:none!important;
        display:none!important;
        background:transparent!important;
        box-shadow:none!important;
        border:0!important;
      }

      .category-list .section-card-button{
        display:block!important;
        width:100%!important;
        min-width:0!important;
        padding:16px 18px!important;
        border:0!important;
        background:transparent!important;
        text-align:left!important;
        cursor:pointer!important;
        appearance:none!important;
        -webkit-appearance:none!important;
        color:inherit!important;
        font:inherit!important;
        box-sizing:border-box!important;
        position:static!important;
        transform:none!important;
      }

      .category-list .section-card-button *{
        box-sizing:border-box!important;
      }

      .section-card-top{
        display:grid!important;
        grid-template-columns:44px minmax(0,1fr)!important;
        gap:12px!important;
        align-items:flex-start!important;
        min-width:0!important;
      }

      .section-card-number{
        width:38px!important;
        height:38px!important;
        border-radius:999px!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        background:var(--section-badge)!important;
        color:#1d5fd0!important;
        font-weight:950!important;
        font-size:1rem!important;
        line-height:1!important;
        box-shadow:none!important;
        flex:0 0 auto!important;
      }

      .section-card-info{
        min-width:0!important;
        display:block!important;
      }

      .section-card-title{
        display:block!important;
        color:var(--section-title)!important;
        font-weight:950!important;
        font-size:1rem!important;
        line-height:1.1!important;
        letter-spacing:-.015em!important;
        white-space:normal!important;
        overflow:visible!important;
        text-overflow:clip!important;
        overflow-wrap:anywhere!important;
        word-break:normal!important;
      }

      .section-card-subtitle{
        display:block!important;
        margin-top:3px!important;
        color:var(--section-muted)!important;
        font-size:.78rem!important;
        font-weight:650!important;
        line-height:1.15!important;
        white-space:normal!important;
      }

      .section-count-summary,
      .section-semaphore-summary{
        display:flex!important;
        flex-wrap:wrap!important;
        gap:7px!important;
        align-items:center!important;
        margin-top:10px!important;
        max-width:100%!important;
        min-width:0!important;
      }

      .section-count-chip,
      .section-semaphore-chip{
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

      .section-count-chip--urgent,
      .section-semaphore-chip--urgent{
        background:var(--section-red)!important;
        color:#ffffff!important;
        border-color:#c81e1e!important;
      }

      .section-count-chip--review,
      .section-semaphore-chip--review{
        background:var(--section-yellow)!important;
        color:#111827!important;
        border-color:#9a6700!important;
      }

      .section-count-chip--follow,
      .section-semaphore-chip--follow{
        background:var(--section-green)!important;
        color:#ffffff!important;
        border-color:#15803d!important;
      }

      .section-card-bottom{
        display:grid!important;
        grid-template-columns:minmax(84px,auto) minmax(0,1fr)!important;
        gap:16px!important;
        align-items:center!important;
        width:100%!important;
        min-width:0!important;
        margin-top:14px!important;
        padding-top:13px!important;
        border-top:1px solid #d7e8ff!important;
      }

      .section-card-action{
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        width:max-content!important;
        min-width:76px!important;
        height:38px!important;
        padding:0 16px!important;
        border-radius:999px!important;
        background:#ffffff!important;
        color:var(--section-blue)!important;
        border:2px solid var(--section-blue)!important;
        font-weight:950!important;
        font-size:.95rem!important;
        line-height:1!important;
        box-shadow:none!important;
        position:static!important;
        transform:none!important;
        justify-self:start!important;
        white-space:nowrap!important;
      }

      .section-card-metrics{
        display:grid!important;
        grid-template-columns:repeat(4,minmax(58px,1fr))!important;
        gap:10px!important;
        align-items:center!important;
        width:100%!important;
        min-width:0!important;
      }

      .section-card-metric{
        display:flex!important;
        flex-direction:column!important;
        align-items:center!important;
        justify-content:center!important;
        min-width:0!important;
        text-align:center!important;
        position:static!important;
        transform:none!important;
        margin:0!important;
        padding:0!important;
      }

      .section-card-metric span{
        display:block!important;
        color:var(--section-muted)!important;
        font-size:.72rem!important;
        font-weight:750!important;
        line-height:1.05!important;
        white-space:nowrap!important;
      }

      .section-card-metric strong{
        display:block!important;
        margin-top:4px!important;
        color:#0f2554!important;
        font-size:1rem!important;
        font-weight:950!important;
        line-height:1!important;
        white-space:nowrap!important;
      }

      .section-card-metric--alert strong{
        color:var(--section-red)!important;
      }

      .section-references{
        padding:0 12px 12px!important;
      }

      @media(min-width:761px){
        .category-list .section-card-button{
          padding:16px 20px!important;
        }

        .section-card-top{
          grid-template-columns:48px minmax(240px,1fr)!important;
          gap:14px!important;
        }

        .section-card-number{
          width:40px!important;
          height:40px!important;
        }

        .section-card-title{
          font-size:1.02rem!important;
        }

        .section-card-bottom{
          grid-template-columns:88px minmax(0,1fr)!important;
          gap:20px!important;
        }

        .section-card-metrics{
          grid-template-columns:repeat(4,minmax(76px,1fr))!important;
          gap:14px!important;
        }

        .section-card-metric span{
          font-size:.75rem!important;
        }

        .section-card-metric strong{
          font-size:1.05rem!important;
        }
      }

      @media(max-width:760px){
        .app-main{padding-left:10px!important;padding-right:10px!important;}
        .section-block{padding:12px 10px!important;overflow:hidden!important;}
        .category-list{gap:12px!important;}
        .category-list .section-card-button{padding:16px 16px 14px!important;}
        .section-card-top{grid-template-columns:44px minmax(0,1fr)!important;gap:12px!important;}
        .section-card-number{width:38px!important;height:38px!important;font-size:1rem!important;}
        .section-card-title{font-size:1rem!important;line-height:1.08!important;}
        .section-card-subtitle{font-size:.78rem!important;}
        .section-card-bottom{grid-template-columns:auto minmax(0,1fr)!important;gap:12px!important;margin-top:14px!important;}
        .section-card-action{min-width:72px!important;height:38px!important;font-size:.94rem!important;padding:0 14px!important;}
        .section-card-metrics{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:6px!important;}
        .section-card-metric span{font-size:.68rem!important;}
        .section-card-metric strong{font-size:.92rem!important;}
        .section-references{padding:0 8px 10px!important;}
      }

      @media(max-width:390px){
        .category-list .section-card-button{padding:14px 12px 12px!important;}
        .section-card-top{grid-template-columns:38px minmax(0,1fr)!important;gap:10px!important;}
        .section-card-number{width:34px!important;height:34px!important;font-size:.92rem!important;}
        .section-card-title{font-size:.92rem!important;}
        .section-card-subtitle{font-size:.72rem!important;}
        .section-count-chip,.section-semaphore-chip{font-size:.64rem!important;padding:5px 9px!important;}
        .section-card-bottom{grid-template-columns:64px minmax(0,1fr)!important;gap:8px!important;}
        .section-card-action{min-width:62px!important;height:34px!important;padding:0 10px!important;font-size:.86rem!important;}
        .section-card-metrics{gap:3px!important;}
        .section-card-metric span{font-size:.61rem!important;}
        .section-card-metric strong{font-size:.82rem!important;}
      }
    `;
    document.head.appendChild(style);
  }

  function overrideSectionRenderer(){
    if(typeof renderSectionRow!=='function')return false;

    renderSectionRow=function(row,index){
      var isOpen=typeof openSectionKey!=='undefined'&&openSectionKey===row.key;
      var accentClass=getAccent(row,index);
      var refs=getRefs(row);

      return `
        <article class="category-card ${isOpen?'open':''} ${accentClass}">
          <button class="section-card-button" type="button" onclick="toggleSection('${safeAttr(row.key)}')" aria-expanded="${isOpen}">
            <div class="section-card-top">
              <div class="section-card-number">${index+1}</div>
              <div class="section-card-info">
                <strong class="section-card-title">${safeHtml(row.mundo)} / ${safeHtml(row.seccion)}</strong>
                <span class="section-card-subtitle">${safeFormatNumber(row.totalReferencias)} referencias totales</span>
                ${renderChips(row)}
              </div>
            </div>
            <div class="section-card-bottom">
              <span class="section-card-action">${isOpen?'Cerrar':'Ver'}</span>
              <div class="section-card-metrics">
                <div class="section-card-metric"><span>Hay</span><strong>${safeFormatNumber(row.inventario)}</strong></div>
                <div class="section-card-metric"><span>Vendió</span><strong>${safeFormatNumber(row.ventaUnidades)}</strong></div>
                <div class="section-card-metric section-card-metric--alert"><span>Revisar</span><strong>${safeFormatNumber(row.alertas)}</strong></div>
                <div class="section-card-metric"><span>% revisar</span><strong>${safeFormatPercent(row.porcentajeAlertas)}</strong></div>
              </div>
            </div>
          </button>
          <div class="section-references ${isOpen?'':'hidden'}">
            ${isOpen&&typeof renderSectionReferences==='function'?renderSectionReferences(refs):''}
          </div>
        </article>
      `;
    };

    return true;
  }

  function refreshCurrentView(){
    try{
      if(typeof currentStoreName!=='undefined'&&currentStoreName&&typeof renderDashboard==='function'){
        renderDashboard(currentStoreName);
      }
    }catch(e){
      console.warn('No se pudo refrescar vista de secciones',e);
    }
  }

  function init(){
    injectStableSectionStyles();
    var attempts=0;

    function retry(){
      attempts++;
      var ready=overrideSectionRenderer();
      injectStableSectionStyles();
      if(ready){
        setTimeout(refreshCurrentView,80);
        return;
      }
      if(attempts<30)setTimeout(retry,250);
    }

    retry();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
