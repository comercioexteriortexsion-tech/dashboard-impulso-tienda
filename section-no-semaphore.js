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
    if(typeof renderCriteriaChips==='function')return renderCriteriaChips(counts);

    var chips=[];
    if(counts.c1)chips.push('<span class="section-semaphore-chip section-semaphore-chip--urgent">'+safeFormatNumber(counts.c1)+' urgente'+(counts.c1===1?'':'s')+'</span>');
    if(counts.c2)chips.push('<span class="section-semaphore-chip section-semaphore-chip--review">'+safeFormatNumber(counts.c2)+' revisar</span>');
    if(counts.c3)chips.push('<span class="section-semaphore-chip section-semaphore-chip--follow">'+safeFormatNumber(counts.c3)+' seguimiento</span>');
    return chips.length?'<div class="section-semaphore-summary">'+chips.join('')+'</div>':'';
  }

  function getAccent(row,index){
    if(typeof getSectionAccentClass==='function')return getSectionAccentClass(row&&row.estadoGrupo,index);
    return 'accent-blue-soft';
  }

  function injectNoSectionSemaphoreStyles(){
    var existing=document.getElementById('noSectionSemaphoreStyles');
    if(existing)existing.remove();

    var style=document.createElement('style');
    style.id='noSectionSemaphoreStyles';
    style.textContent=`
      /* Se elimina la semaforización de las secciones. El semáforo queda solo en referencias. */
      .category-list .category-card .status-pill,
      .category-list .category-card .status-prioritario,
      .category-list .category-card .status-revision,
      .category-list .category-card .status-controlado{
        display:none!important;
        visibility:hidden!important;
        width:0!important;
        min-width:0!important;
        height:0!important;
        padding:0!important;
        margin:0!important;
        border:0!important;
        overflow:hidden!important;
      }

      .category-list .category-card,
      .category-list .category-card.open,
      .category-list .category-card.accent-prioritario,
      .category-list .category-card.accent-revision,
      .category-list .category-card.accent-controlado,
      .category-list .category-card.accent-blue-soft{
        background:linear-gradient(180deg,#f7fbff 0%,#ffffff 100%)!important;
        border:1.8px solid #b7d6ff!important;
        box-shadow:0 8px 20px rgba(59,130,246,.08)!important;
      }

      @media(max-width:760px){
        .category-list .category-card-header{
          display:grid!important;
          grid-template-columns:42px minmax(0,1fr)!important;
          grid-template-areas:
            "rank main"
            "action main"
            "metrics metrics"!important;
          gap:8px 10px!important;
          align-items:center!important;
          width:100%!important;
          padding:14px 14px 12px 14px!important;
        }

        .category-list .rank-badge{
          grid-area:rank!important;
          width:34px!important;
          height:34px!important;
          min-width:34px!important;
          justify-self:center!important;
          align-self:start!important;
          background:#dcebff!important;
          color:#1d5fd0!important;
          box-shadow:none!important;
        }

        .category-list .category-main{
          grid-area:main!important;
          min-width:0!important;
          padding-right:0!important;
        }

        .category-list .category-main strong{
          display:block!important;
          font-size:1.02rem!important;
          line-height:1.08!important;
          white-space:normal!important;
          overflow:visible!important;
          text-overflow:clip!important;
          color:#163a70!important;
        }

        .category-list .category-main>span{
          display:block!important;
          font-size:.78rem!important;
          line-height:1.1!important;
          margin-top:2px!important;
          color:#6b7f9e!important;
          white-space:normal!important;
        }

        .category-list .section-semaphore-summary{
          display:flex!important;
          flex-wrap:wrap!important;
          gap:6px!important;
          margin-top:9px!important;
          max-width:100%!important;
        }

        .category-list .section-semaphore-chip{
          padding:5px 9px!important;
          font-size:.68rem!important;
          line-height:1!important;
          font-weight:900!important;
        }

        .category-list .expand-indicator{
          grid-area:action!important;
          justify-self:center!important;
          align-self:center!important;
          width:auto!important;
          min-width:54px!important;
          height:34px!important;
          padding:0 12px!important;
          display:inline-flex!important;
          align-items:center!important;
          justify-content:center!important;
          border-radius:999px!important;
          background:#fff!important;
          color:#1f6bff!important;
          border:2px solid #1f6bff!important;
          font-size:.86rem!important;
          font-weight:900!important;
          box-shadow:none!important;
        }

        .category-list .category-card-header::after{
          content:''!important;
          grid-area:metrics!important;
          display:block!important;
          height:1px!important;
          background:#d7e8ff!important;
          width:100%!important;
          align-self:start!important;
        }

        .category-list .category-card-header .category-metric{
          grid-area:metrics!important;
          display:flex!important;
          flex-direction:column!important;
          align-items:center!important;
          justify-content:center!important;
          min-width:0!important;
          padding-top:18px!important;
          position:relative!important;
          z-index:1!important;
        }

        .category-list .category-card-header .category-metric:nth-of-type(1){justify-self:start!important;margin-left:12%!important;}
        .category-list .category-card-header .category-metric:nth-of-type(2){justify-self:center!important;margin-left:-18%!important;}
        .category-list .category-card-header .category-metric:nth-of-type(3){justify-self:center!important;margin-left:24%!important;}
        .category-list .category-card-header .category-metric:nth-of-type(4){justify-self:end!important;margin-right:8%!important;}

        .category-list .category-card-header .category-metric span{
          display:block!important;
          font-size:.76rem!important;
          line-height:1!important;
          color:#6b7f9e!important;
          white-space:nowrap!important;
        }

        .category-list .category-card-header .category-metric strong{
          display:block!important;
          font-size:1rem!important;
          line-height:1.05!important;
          margin-top:4px!important;
          color:#0f2554!important;
          white-space:nowrap!important;
        }

        .category-list .category-card-header .alert-metric strong{
          color:#ff3b30!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function overrideSectionRenderer(){
    if(typeof renderSectionRow!=='function')return false;

    renderSectionRow=function(row,index){
      var isOpen=typeof openSectionKey!=='undefined'&&openSectionKey===row.key;
      var accentClass=getAccent(row,index);
      var refs=row&&Array.isArray(row.productosCriticos)?row.productosCriticos:[];

      return `
        <article class="category-card ${isOpen?'open':''} ${accentClass}">
          <button class="category-card-header" type="button" onclick="toggleSection('${safeAttr(row.key)}')" aria-expanded="${isOpen}">
            <div class="rank-badge">${index+1}</div>
            <div class="category-main">
              <strong>${safeHtml(row.mundo)} / ${safeHtml(row.seccion)}</strong>
              <span>${safeFormatNumber(row.totalReferencias)} referencias totales</span>
              ${renderChips(row)}
            </div>
            <div class="category-metric"><span>Hay</span><strong>${safeFormatNumber(row.inventario)}</strong></div>
            <div class="category-metric"><span>Vendió</span><strong>${safeFormatNumber(row.ventaUnidades)}</strong></div>
            <div class="category-metric alert-metric"><span>Revisar</span><strong>${safeFormatNumber(row.alertas)}</strong></div>
            <div class="category-metric percent-metric"><span>% revisar</span><strong>${safeFormatPercent(row.porcentajeAlertas)}</strong></div>
            <span class="expand-indicator">${isOpen?'Cerrar':'Ver'}</span>
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
      console.warn('No se pudo refrescar vista sin semáforo de secciones',e);
    }
  }

  function init(){
    injectNoSectionSemaphoreStyles();
    var attempts=0;

    function retry(){
      attempts++;
      var ready=overrideSectionRenderer();
      injectNoSectionSemaphoreStyles();
      if(ready){
        setTimeout(refreshCurrentView,50);
        return;
      }
      if(attempts<30)setTimeout(retry,250);
    }

    retry();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
