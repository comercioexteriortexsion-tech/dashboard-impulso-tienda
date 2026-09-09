(function(){
  var lastStoreName=null;

  function closePrioritySections(){
    try{
      if(typeof openSectionKey!=='undefined'){
        openSectionKey=null;
      }
    }catch(e){
      console.warn('No se pudo dejar secciones minimizadas',e);
    }
  }

  function injectHighContrastSemaphoreStyles(){
    if(document.getElementById('highContrastSemaphoreStyles'))return;

    var style=document.createElement('style');
    style.id='highContrastSemaphoreStyles';
    style.textContent=`
      :root{
        --semaforo-rojo:#ef1f1f;
        --semaforo-rojo-oscuro:#991b1b;
        --semaforo-rojo-fondo:#fff1f1;
        --semaforo-rojo-borde:#ef4444;
        --semaforo-amarillo:#f8c300;
        --semaforo-amarillo-oscuro:#78350f;
        --semaforo-amarillo-fondo:#fff8d6;
        --semaforo-amarillo-borde:#eab308;
        --semaforo-verde:#22c55e;
        --semaforo-verde-oscuro:#14532d;
        --semaforo-verde-fondo:#e9fbe8;
        --semaforo-verde-borde:#16a34a;
      }

      .section-semaphore-chip--urgent,
      .alert-chip--critical,
      .alert-chip--sinventa,
      .priority-pill--urgente,
      .priority-pill--alta,
      .status-prioritario{
        background:var(--semaforo-rojo)!important;
        color:#ffffff!important;
        border-color:var(--semaforo-rojo-oscuro)!important;
        box-shadow:0 0 0 2px rgba(239,31,31,.14),0 6px 14px rgba(239,31,31,.24)!important;
      }

      .section-semaphore-chip--review,
      .alert-chip--lento,
      .priority-pill--revisar,
      .priority-pill--media,
      .status-revision{
        background:var(--semaforo-amarillo)!important;
        color:#111827!important;
        border-color:var(--semaforo-amarillo-oscuro)!important;
        box-shadow:0 0 0 2px rgba(248,195,0,.18),0 6px 14px rgba(248,195,0,.25)!important;
      }

      .section-semaphore-chip--follow,
      .priority-pill--seguimiento,
      .priority-pill--baja,
      .priority-pill--neutral,
      .status-controlado{
        background:var(--semaforo-verde)!important;
        color:#ffffff!important;
        border-color:var(--semaforo-verde-oscuro)!important;
        box-shadow:0 0 0 2px rgba(34,197,94,.15),0 6px 14px rgba(34,197,94,.22)!important;
      }

      .category-card.accent-prioritario,
      .category-card:has(.status-prioritario),
      .compact-ref-row--urgente{
        background:linear-gradient(90deg,#ffffff 0%,var(--semaforo-rojo-fondo) 100%)!important;
        border:2px solid var(--semaforo-rojo-borde)!important;
        border-left:9px solid var(--semaforo-rojo)!important;
        box-shadow:0 10px 28px rgba(239,31,31,.15)!important;
      }

      .category-card.accent-revision,
      .category-card:has(.status-revision),
      .compact-ref-row--revisar{
        background:linear-gradient(90deg,#ffffff 0%,var(--semaforo-amarillo-fondo) 100%)!important;
        border:2px solid var(--semaforo-amarillo-borde)!important;
        border-left:9px solid var(--semaforo-amarillo)!important;
        box-shadow:0 10px 28px rgba(248,195,0,.16)!important;
      }

      .category-card.accent-controlado,
      .category-card.accent-blue-soft,
      .category-card:has(.status-controlado),
      .compact-ref-row--seguimiento{
        background:linear-gradient(90deg,#ffffff 0%,var(--semaforo-verde-fondo) 100%)!important;
        border:2px solid var(--semaforo-verde-borde)!important;
        border-left:9px solid var(--semaforo-verde)!important;
        box-shadow:0 10px 28px rgba(34,197,94,.13)!important;
      }

      .compact-ref-row--urgente .compact-ref-criteria{
        background:#fee2e2!important;
        border-color:#ef4444!important;
        color:#991b1b!important;
      }

      .compact-ref-row--revisar .compact-ref-criteria{
        background:#fef3c7!important;
        border-color:#eab308!important;
        color:#78350f!important;
      }

      .compact-ref-row--seguimiento .compact-ref-criteria{
        background:#dcfce7!important;
        border-color:#16a34a!important;
        color:#14532d!important;
      }

      .compact-ref-row--urgente .compact-ref-action{
        background:#fff1f1!important;
        border:1.5px solid #fecaca!important;
        color:#7f1d1d!important;
      }

      .compact-ref-row--revisar .compact-ref-action{
        background:#fff8d6!important;
        border:1.5px solid #fde047!important;
        color:#713f12!important;
      }

      .compact-ref-row--seguimiento .compact-ref-action{
        background:#e9fbe8!important;
        border:1.5px solid #86efac!important;
        color:#14532d!important;
      }

      .rank-badge{
        font-weight:1000!important;
      }

      .category-card.accent-prioritario .rank-badge,
      .category-card:has(.status-prioritario) .rank-badge{
        background:var(--semaforo-rojo)!important;
        color:#ffffff!important;
      }

      .category-card.accent-revision .rank-badge,
      .category-card:has(.status-revision) .rank-badge{
        background:var(--semaforo-amarillo)!important;
        color:#111827!important;
      }

      .category-card.accent-controlado .rank-badge,
      .category-card.accent-blue-soft .rank-badge,
      .category-card:has(.status-controlado) .rank-badge{
        background:var(--semaforo-verde)!important;
        color:#ffffff!important;
      }

      .expand-indicator{
        border:1.5px solid currentColor!important;
        font-weight:1000!important;
      }

      .category-card.accent-prioritario .expand-indicator,
      .category-card:has(.status-prioritario) .expand-indicator{
        background:#ffffff!important;
        color:var(--semaforo-rojo)!important;
      }

      .category-card.accent-revision .expand-indicator,
      .category-card:has(.status-revision) .expand-indicator{
        background:#ffffff!important;
        color:#a16207!important;
      }

      .category-card.accent-controlado .expand-indicator,
      .category-card.accent-blue-soft .expand-indicator,
      .category-card:has(.status-controlado) .expand-indicator{
        background:#ffffff!important;
        color:var(--semaforo-verde-oscuro)!important;
      }

      @media(max-width:760px){
        .category-card{
          border-left-width:7px!important;
        }

        .section-semaphore-chip,
        .priority-pill{
          font-weight:1000!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function activate(){
    injectHighContrastSemaphoreStyles();

    if(typeof renderDashboard!=='function')return false;

    var originalRenderDashboard=renderDashboard;

    renderDashboard=function(storeName){
      injectHighContrastSemaphoreStyles();
      var normalizedStoreName=String(storeName||'');

      if(normalizedStoreName!==lastStoreName){
        closePrioritySections();
        lastStoreName=normalizedStoreName;
      }

      return originalRenderDashboard.apply(this,arguments);
    };

    closePrioritySections();
    return true;
  }

  function init(){
    injectHighContrastSemaphoreStyles();
    var attempts=0;

    function retry(){
      attempts++;
      if(activate())return;
      if(attempts<20)setTimeout(retry,250);
    }

    retry();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  }else{
    init();
  }
})();
