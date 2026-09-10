(function () {
  var lastStoreName = null;

  function closePrioritySections() {
    try {
      if (typeof openSectionKey !== 'undefined') {
        openSectionKey = null;
      }
    } catch (e) {
      console.warn('No se pudo dejar secciones minimizadas', e);
    }
  }

  function injectHighContrastSemaphoreStyles() {
    if (document.getElementById('highContrastSemaphoreStyles')) return;

    var style = document.createElement('style');
    style.id = 'highContrastSemaphoreStyles';
    style.textContent = `
      :root{
        --semaforo-rojo:#ff3b30;
        --semaforo-rojo-oscuro:#c81e1e;
        --semaforo-rojo-fondo:#fff1f1;
        --semaforo-rojo-borde:#ff6b63;

        --semaforo-amarillo:#f4b400;
        --semaforo-amarillo-oscuro:#9a6700;
        --semaforo-amarillo-fondo:#fff8dc;
        --semaforo-amarillo-borde:#f6c744;

        --semaforo-verde:#22c55e;
        --semaforo-verde-oscuro:#15803d;
        --semaforo-verde-fondo:#ecfdf3;
        --semaforo-verde-borde:#4ade80;

        --seccion-fondo:#f7fbff;
        --seccion-fondo-open:#f2f8ff;
        --seccion-borde:#b7d6ff;
        --seccion-borde-open:#9fc8ff;
        --seccion-texto:#163a70;
        --seccion-texto-sec:#6b7f9e;
        --seccion-badge:#dcebff;
        --seccion-badge-texto:#1d5fd0;
        --seccion-boton:#1f6bff;
      }

      /* =========================================================
         CHIPS DE SEMÁFORO: ÚNICO COLOR FUERTE EN TARJETAS PRINCIPALES
         ========================================================= */
      .section-semaphore-chip--urgent,
      .alert-chip--critical,
      .alert-chip--sinventa,
      .priority-pill--urgente,
      .priority-pill--alta{
        background:var(--semaforo-rojo)!important;
        color:#ffffff!important;
        border:1px solid var(--semaforo-rojo-oscuro)!important;
        box-shadow:0 4px 10px rgba(255,59,48,.22)!important;
      }

      .section-semaphore-chip--review,
      .alert-chip--lento,
      .priority-pill--revisar,
      .priority-pill--media{
        background:var(--semaforo-amarillo)!important;
        color:#111827!important;
        border:1px solid var(--semaforo-amarillo-oscuro)!important;
        box-shadow:0 4px 10px rgba(244,180,0,.20)!important;
      }

      .section-semaphore-chip--follow,
      .priority-pill--seguimiento,
      .priority-pill--baja,
      .priority-pill--neutral{
        background:var(--semaforo-verde)!important;
        color:#ffffff!important;
        border:1px solid var(--semaforo-verde-oscuro)!important;
        box-shadow:0 4px 10px rgba(34,197,94,.20)!important;
      }

      /* =========================================================
         TARJETAS PRINCIPALES: SIEMPRE AZUL NEUTRO, SIN SEMÁFORO DOMINANTE
         ========================================================= */
      .category-list .category-card,
      .category-list .category-card.open,
      .category-list .category-card.accent-prioritario,
      .category-list .category-card.accent-revision,
      .category-list .category-card.accent-controlado,
      .category-list .category-card.accent-blue-soft,
      .category-list .category-card.accent-prioritario.open,
      .category-list .category-card.accent-revision.open,
      .category-list .category-card.accent-controlado.open,
      .category-list .category-card.accent-blue-soft.open,
      .category-list .category-card:has(.status-prioritario),
      .category-list .category-card:has(.status-revision),
      .category-list .category-card:has(.status-controlado){
        background:linear-gradient(180deg,var(--seccion-fondo) 0%, #ffffff 100%)!important;
        border-top:1.8px solid var(--seccion-borde)!important;
        border-right:1.8px solid var(--seccion-borde)!important;
        border-bottom:1.8px solid var(--seccion-borde)!important;
        border-left:1.8px solid var(--seccion-borde)!important;
        box-shadow:0 8px 20px rgba(59,130,246,.08)!important;
        overflow:hidden!important;
      }

      .category-list .category-card.open,
      .category-list .category-card.accent-prioritario.open,
      .category-list .category-card.accent-revision.open,
      .category-list .category-card.accent-controlado.open,
      .category-list .category-card.accent-blue-soft.open{
        background:linear-gradient(180deg,var(--seccion-fondo-open) 0%, #ffffff 100%)!important;
        border-color:var(--seccion-borde-open)!important;
      }

      .category-list .category-card::before,
      .category-list .category-card::after,
      .category-list .category-card.open::before,
      .category-list .category-card.open::after,
      .category-list .category-card-header::before,
      .category-list .category-card-header::after{
        background:transparent!important;
        border-color:transparent!important;
        box-shadow:none!important;
      }

      .category-list .category-card [class*="status-"],
      .category-list .status-prioritario,
      .category-list .status-revision,
      .category-list .status-controlado{
        background:#eef5ff!important;
        color:var(--seccion-texto)!important;
        border:1px solid #bfd8ff!important;
        box-shadow:none!important;
      }

      .category-list .rank-badge,
      .category-list .category-card .rank-badge,
      .category-list .category-card.accent-prioritario .rank-badge,
      .category-list .category-card.accent-revision .rank-badge,
      .category-list .category-card.accent-controlado .rank-badge,
      .category-list .category-card.accent-blue-soft .rank-badge,
      .category-list .category-card:has(.status-prioritario) .rank-badge,
      .category-list .category-card:has(.status-revision) .rank-badge,
      .category-list .category-card:has(.status-controlado) .rank-badge{
        background:var(--seccion-badge)!important;
        color:var(--seccion-badge-texto)!important;
        border:0!important;
        font-weight:900!important;
        box-shadow:none!important;
      }

      .category-list .expand-indicator,
      .category-list .category-card .expand-indicator,
      .category-list .category-card.accent-prioritario .expand-indicator,
      .category-list .category-card.accent-revision .expand-indicator,
      .category-list .category-card.accent-controlado .expand-indicator,
      .category-list .category-card.accent-blue-soft .expand-indicator,
      .category-list .category-card:has(.status-prioritario) .expand-indicator,
      .category-list .category-card:has(.status-revision) .expand-indicator,
      .category-list .category-card:has(.status-controlado) .expand-indicator{
        background:#ffffff!important;
        color:var(--seccion-boton)!important;
        border:2px solid var(--seccion-boton)!important;
        box-shadow:none!important;
        font-weight:900!important;
      }

      .category-list .category-card strong,
      .category-list .category-card h3,
      .category-list .category-card .category-main strong{
        color:var(--seccion-texto)!important;
      }

      .category-list .category-card p,
      .category-list .category-card small,
      .category-list .category-card .category-main span,
      .category-list .category-card .category-metric span{
        color:var(--seccion-texto-sec)!important;
      }

      .category-list .category-card .category-metric strong{
        color:#0f2554!important;
      }

      .category-list .category-card .alert-metric strong{
        color:var(--semaforo-rojo)!important;
      }

      /* Indicador derecho pequeño: conserva color, pero sin colorear tarjeta */
      .category-list .category-card .status-pill{
        min-width:34px!important;
        width:34px!important;
        height:34px!important;
        padding:0!important;
        border-radius:999px!important;
        color:transparent!important;
        font-size:0!important;
        overflow:hidden!important;
        justify-self:center!important;
      }

      .category-list .category-card .status-prioritario{
        background:var(--semaforo-rojo)!important;
        border-color:var(--semaforo-rojo-oscuro)!important;
      }

      .category-list .category-card .status-revision{
        background:var(--semaforo-amarillo)!important;
        border-color:var(--semaforo-amarillo-oscuro)!important;
      }

      .category-list .category-card .status-controlado{
        background:var(--semaforo-verde)!important;
        border-color:var(--semaforo-verde-oscuro)!important;
      }

      /* =========================================================
         TARJETAS INTERNAS DE REFERENCIAS: CONSERVAN COLOR DE SEMÁFORO
         ========================================================= */
      .compact-ref-row--urgente{
        background:linear-gradient(90deg,#ffffff 0%,var(--semaforo-rojo-fondo) 100%)!important;
        border:2px solid var(--semaforo-rojo-borde)!important;
        border-left:8px solid var(--semaforo-rojo)!important;
        box-shadow:0 8px 20px rgba(255,59,48,.14)!important;
      }

      .compact-ref-row--revisar{
        background:linear-gradient(90deg,#ffffff 0%,var(--semaforo-amarillo-fondo) 100%)!important;
        border:2px solid var(--semaforo-amarillo-borde)!important;
        border-left:8px solid var(--semaforo-amarillo)!important;
        box-shadow:0 8px 20px rgba(244,180,0,.14)!important;
      }

      .compact-ref-row--seguimiento{
        background:linear-gradient(90deg,#ffffff 0%,var(--semaforo-verde-fondo) 100%)!important;
        border:2px solid var(--semaforo-verde-borde)!important;
        border-left:8px solid var(--semaforo-verde)!important;
        box-shadow:0 8px 20px rgba(34,197,94,.12)!important;
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
        background:#ecfdf3!important;
        border:1.5px solid #86efac!important;
        color:#14532d!important;
      }

      /* =========================================================
         MÓVIL: DATOS VISIBLES, SIN CORTES Y MISMA LÓGICA DE LA SIMULACIÓN
         ========================================================= */
      @media (max-width:760px){
        .app-main{
          padding-left:10px!important;
          padding-right:10px!important;
        }

        .section-block{
          padding-left:8px!important;
          padding-right:8px!important;
          overflow:hidden!important;
        }

        .category-list{
          gap:10px!important;
        }

        .category-list .category-card,
        .category-list .category-card.open{
          border-left-width:1.8px!important;
          border-radius:16px!important;
          overflow:hidden!important;
        }

        .category-list .category-card-header{
          display:grid!important;
          grid-template-columns:32px minmax(112px,1.2fr) repeat(4,minmax(38px,.58fr)) 24px!important;
          grid-template-areas:
            "rank main hay venta revisar pct status"
            "action main hay venta revisar pct status"!important;
          align-items:center!important;
          column-gap:5px!important;
          row-gap:6px!important;
          width:100%!important;
          min-width:0!important;
          padding:11px 7px!important;
        }

        .category-list .rank-badge{
          grid-area:rank!important;
          width:30px!important;
          height:30px!important;
          min-width:30px!important;
          font-size:.82rem!important;
          align-self:start!important;
        }

        .category-list .category-main{
          grid-area:main!important;
          min-width:0!important;
          align-self:center!important;
        }

        .category-list .category-main strong{
          font-size:.88rem!important;
          line-height:1.04!important;
          letter-spacing:-.015em!important;
          white-space:normal!important;
          overflow:visible!important;
          text-overflow:clip!important;
        }

        .category-list .category-main > span{
          display:block!important;
          margin-top:2px!important;
          font-size:.66rem!important;
          line-height:1.05!important;
          white-space:normal!important;
        }

        .category-list .section-semaphore-summary{
          display:flex!important;
          flex-wrap:wrap!important;
          gap:3px!important;
          margin-top:5px!important;
          max-width:100%!important;
        }

        .category-list .section-semaphore-chip{
          min-width:auto!important;
          padding:3px 6px!important;
          font-size:.55rem!important;
          line-height:1!important;
          font-weight:1000!important;
          box-shadow:0 3px 8px rgba(15,23,42,.14)!important;
        }

        .category-list .category-metric{
          display:flex!important;
          flex-direction:column!important;
          align-items:center!important;
          justify-content:center!important;
          min-width:0!important;
          gap:1px!important;
          padding:0!important;
        }

        .category-list .category-metric:nth-of-type(1){grid-area:hay!important;}
        .category-list .category-metric:nth-of-type(2){grid-area:venta!important;}
        .category-list .category-metric:nth-of-type(3){grid-area:revisar!important;}
        .category-list .category-metric:nth-of-type(4){grid-area:pct!important;}

        .category-list .category-metric span{
          font-size:.58rem!important;
          line-height:1!important;
          white-space:nowrap!important;
        }

        .category-list .category-metric strong{
          font-size:.78rem!important;
          line-height:1.05!important;
          white-space:nowrap!important;
        }

        .category-list .percent-metric strong{
          font-size:.72rem!important;
        }

        .category-list .status-pill{
          grid-area:status!important;
          width:22px!important;
          height:22px!important;
          min-width:22px!important;
          justify-self:end!important;
        }

        .category-list .expand-indicator{
          grid-area:action!important;
          min-width:0!important;
          width:fit-content!important;
          height:28px!important;
          min-height:28px!important;
          padding:4px 9px!important;
          border-radius:999px!important;
          font-size:.68rem!important;
          line-height:1!important;
          align-self:start!important;
        }

        .reference-detail-head{
          margin:8px 6px 8px!important;
          padding:9px 10px!important;
          border-radius:14px!important;
        }

        .reference-detail-head strong{
          font-size:.78rem!important;
        }

        .reference-detail-head span{
          font-size:.66rem!important;
        }

        .compact-ref-list{
          gap:9px!important;
          padding:0 6px 10px!important;
          background:transparent!important;
        }

        .compact-ref-row,
        .compact-ref-row--urgente,
        .compact-ref-row--revisar,
        .compact-ref-row--seguimiento{
          display:grid!important;
          grid-template-columns:minmax(0,1fr) auto!important;
          grid-template-areas:
            "main priority"
            "criteria criteria"
            "metrics metrics"
            "action action"!important;
          gap:7px!important;
          padding:10px 9px!important;
          border-radius:15px!important;
          border-left-width:7px!important;
          overflow:hidden!important;
        }

        .compact-ref-main{
          min-width:0!important;
        }

        .compact-ref-main strong{
          font-size:.98rem!important;
          line-height:1.05!important;
          white-space:normal!important;
        }

        .compact-ref-main span{
          font-size:.72rem!important;
          line-height:1.12!important;
          white-space:normal!important;
        }

        .compact-ref-priority{
          justify-self:end!important;
          max-width:92px!important;
        }

        .compact-ref-priority .priority-pill{
          max-width:92px!important;
          min-width:auto!important;
          padding:5px 9px!important;
          font-size:.66rem!important;
          line-height:1!important;
          white-space:nowrap!important;
        }

        .compact-ref-criteria{
          width:100%!important;
          max-width:100%!important;
          box-sizing:border-box!important;
          padding:6px 8px!important;
          border-radius:999px!important;
          font-size:.70rem!important;
          line-height:1.12!important;
          white-space:normal!important;
        }

        .compact-ref-metrics{
          display:flex!important;
          flex-wrap:wrap!important;
          gap:5px 8px!important;
          font-size:.69rem!important;
          line-height:1.18!important;
          color:#64748b!important;
        }

        .compact-ref-metrics span{
          white-space:normal!important;
        }

        .compact-ref-metrics span:not(:last-child)::after{
          content:' |';
          color:#94a3b8;
          margin-left:6px;
          font-weight:700;
        }

        .compact-ref-action{
          width:100%!important;
          box-sizing:border-box!important;
          padding:8px 9px!important;
          border-radius:10px!important;
          font-size:.72rem!important;
          line-height:1.18!important;
          white-space:normal!important;
        }
      }

      @media (max-width:430px){
        .category-list .category-card-header{
          grid-template-columns:30px minmax(104px,1.25fr) repeat(4,minmax(34px,.52fr)) 22px!important;
          column-gap:4px!important;
          padding:10px 6px!important;
        }

        .category-list .category-main strong{
          font-size:.80rem!important;
        }

        .category-list .category-main > span{
          font-size:.60rem!important;
        }

        .category-list .section-semaphore-chip{
          font-size:.50rem!important;
          padding:3px 5px!important;
        }

        .category-list .category-metric span{
          font-size:.52rem!important;
        }

        .category-list .category-metric strong{
          font-size:.72rem!important;
        }

        .category-list .percent-metric strong{
          font-size:.66rem!important;
        }

        .category-list .status-pill{
          width:20px!important;
          height:20px!important;
          min-width:20px!important;
        }

        .category-list .expand-indicator{
          font-size:.62rem!important;
          padding:4px 8px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function activate() {
    injectHighContrastSemaphoreStyles();

    if (typeof renderDashboard !== 'function') return false;

    var originalRenderDashboard = renderDashboard;

    renderDashboard = function (storeName) {
      injectHighContrastSemaphoreStyles();
      var normalizedStoreName = String(storeName || '');

      if (normalizedStoreName !== lastStoreName) {
        closePrioritySections();
        lastStoreName = normalizedStoreName;
      }

      return originalRenderDashboard.apply(this, arguments);
    };

    closePrioritySections();
    return true;
  }

  function init() {
    injectHighContrastSemaphoreStyles();
    var attempts = 0;

    function retry() {
      attempts++;
      if (activate()) return;
      if (attempts < 20) setTimeout(retry, 250);
    }

    retry();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
