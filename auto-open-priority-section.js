(function () {
  var lastStoreName = null;
  var originalRenderDashboardRef = null;

  function closePrioritySections() {
    try {
      if (typeof openSectionKey !== 'undefined') {
        openSectionKey = null;
      }
    } catch (e) {
      console.warn('No se pudo dejar secciones minimizadas', e);
    }
  }

  function getSafeNumber(value) {
    if (typeof toNumber === 'function') return toNumber(value);
    var n = Number(String(value || '').replace('%', '').replace(',', '.'));
    return isFinite(n) ? n : 0;
  }

  function getSafePercent(value) {
    if (typeof formatPercent === 'function') return formatPercent(value);
    return Math.round(getSafeNumber(value) * 100) + '%';
  }

  function getSafeNumberText(value) {
    if (typeof formatNumber === 'function') return formatNumber(value);
    return String(getSafeNumber(value));
  }

  function getSafeHtml(value) {
    if (typeof escapeHtml === 'function') return escapeHtml(value);
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char];
    });
  }

  function getSafeAttribute(value) {
    if (typeof escapeAttribute === 'function') return escapeAttribute(value);
    return getSafeHtml(value).replace(/`/g, '&#96;');
  }

  function getSectionCounts(row) {
    if (typeof countCriteriaBySection === 'function') return countCriteriaBySection(row);

    return {
      c1: getSafeNumber(row && (row.referenciasUrgentes || row.referencias_urgentes)),
      c2: getSafeNumber(row && (row.referenciasRevisar || row.referencias_revisar)),
      c3: getSafeNumber(row && (row.referenciasSeguimiento || row.referencias_seguimiento))
    };
  }

  function getSectionChips(row) {
    var counts = getSectionCounts(row || {});
    if (typeof renderCriteriaChips === 'function') return renderCriteriaChips(counts);

    var chips = [];
    if (counts.c1) chips.push('<span class="section-semaphore-chip section-semaphore-chip--urgent">' + getSafeNumberText(counts.c1) + ' urgente' + (counts.c1 === 1 ? '' : 's') + '</span>');
    if (counts.c2) chips.push('<span class="section-semaphore-chip section-semaphore-chip--review">' + getSafeNumberText(counts.c2) + ' revisar</span>');
    if (counts.c3) chips.push('<span class="section-semaphore-chip section-semaphore-chip--follow">' + getSafeNumberText(counts.c3) + ' seguimiento</span>');
    return chips.length ? '<div class="section-semaphore-summary">' + chips.join('') + '</div>' : '';
  }

  function getNeutralStatusClass(row) {
    var estado = row && (row.estadoGrupo || row.estado_grupo || '');
    if (typeof getEstadoGrupoClass === 'function') return getEstadoGrupoClass(estado);
    if (estado === 'Controlado') return 'status-controlado';
    if (estado === 'Revisión' || estado === 'Revision') return 'status-revision';
    return 'status-prioritario';
  }

  function getNeutralAccentClass(row, index) {
    var estado = row && (row.estadoGrupo || row.estado_grupo || '');
    if (typeof getSectionAccentClass === 'function') return getSectionAccentClass(estado, index);
    if (estado === 'Prioritario') return 'accent-prioritario';
    if (estado === 'Revisión' || estado === 'Revision') return 'accent-revision';
    return 'accent-blue-soft';
  }

  function getSectionReferences(row) {
    if (!row) return [];
    if (Array.isArray(row.productosCriticos)) return row.productosCriticos;
    if (Array.isArray(row.referencias)) return row.referencias;
    return [];
  }

  function injectHighContrastSemaphoreStyles() {
    var existing = document.getElementById('highContrastSemaphoreStyles');
    if (existing) existing.remove();

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
        border:1.8px solid var(--seccion-borde)!important;
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
      .category-list .category-card-header::before,
      .category-list .category-card-header::after{
        background:transparent!important;
        border-color:transparent!important;
        box-shadow:none!important;
      }

      .category-list .category-card-header{
        width:100%!important;
        min-width:0!important;
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
      .category-list .category-card.accent-blue-soft .expand-indicator{
        background:#ffffff!important;
        color:var(--seccion-boton)!important;
        border:2px solid var(--seccion-boton)!important;
        box-shadow:none!important;
        font-weight:900!important;
      }

      .category-list .category-card .category-main strong{
        color:var(--seccion-texto)!important;
      }

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
        box-shadow:0 2px 8px rgba(15,23,42,.14)!important;
      }

      .category-list .category-card .status-prioritario{
        background:var(--semaforo-rojo)!important;
        border:1px solid var(--semaforo-rojo-oscuro)!important;
      }

      .category-list .category-card .status-revision{
        background:var(--semaforo-amarillo)!important;
        border:1px solid var(--semaforo-amarillo-oscuro)!important;
      }

      .category-list .category-card .status-controlado{
        background:var(--semaforo-verde)!important;
        border:1px solid var(--semaforo-verde-oscuro)!important;
      }

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
          border-radius:16px!important;
          overflow:hidden!important;
        }

        .category-list .category-card-header{
          display:grid!important;
          grid-template-columns:34px minmax(130px,1.15fr) 44px 50px 48px 52px 28px!important;
          grid-template-areas:
            "rank main hay vendido revisar percent status"
            "action main hay vendido revisar percent status"!important;
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
          justify-self:center!important;
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

        .category-list .metric-hay{grid-area:hay!important;}
        .category-list .metric-vendido{grid-area:vendido!important;}
        .category-list .metric-revisar{grid-area:revisar!important;}
        .category-list .metric-percent{grid-area:percent!important;}

        .category-list .category-metric{
          display:flex!important;
          flex-direction:column!important;
          align-items:center!important;
          justify-content:center!important;
          min-width:0!important;
          gap:1px!important;
          padding:0!important;
        }

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

        .category-list .percent-metric strong,
        .category-list .metric-percent strong{
          font-size:.72rem!important;
        }

        .category-list .status-pill{
          grid-area:status!important;
          position:static!important;
          transform:none!important;
          margin:0!important;
          width:28px!important;
          height:28px!important;
          min-width:28px!important;
          align-self:center!important;
          justify-self:end!important;
        }

        .category-list .expand-indicator{
          grid-area:action!important;
          align-self:end!important;
          justify-self:center!important;
          min-width:46px!important;
          width:auto!important;
          padding:5px 8px!important;
          border-radius:999px!important;
          font-size:.78rem!important;
          line-height:1!important;
          text-align:center!important;
        }

        .category-list .section-references{
          padding:10px 6px 12px!important;
          border-top:1px solid #bfdbfe!important;
          background:#f8fbff!important;
        }

        .reference-detail-head{
          margin:0 0 8px!important;
          padding:10px 12px!important;
          border-radius:14px!important;
        }

        .reference-detail-head strong{
          font-size:.88rem!important;
        }

        .reference-detail-head span{
          font-size:.7rem!important;
        }

        .compact-ref-list{
          gap:10px!important;
          background:transparent!important;
        }

        .compact-ref-row{
          display:grid!important;
          grid-template-columns:minmax(0,1fr) auto!important;
          grid-template-areas:
            "main priority"
            "criteria criteria"
            "metrics metrics"
            "action action"!important;
          gap:8px!important;
          padding:12px 10px!important;
          border-radius:16px!important;
          overflow:hidden!important;
        }

        .compact-ref-main strong{
          font-size:1rem!important;
          line-height:1.05!important;
        }

        .compact-ref-main span{
          font-size:.78rem!important;
          line-height:1.12!important;
        }

        .compact-ref-priority .priority-pill{
          min-width:auto!important;
          padding:6px 10px!important;
          font-size:.72rem!important;
          border-radius:999px!important;
        }

        .compact-ref-criteria{
          font-size:.78rem!important;
          line-height:1.12!important;
          padding:7px 10px!important;
          border-radius:999px!important;
        }

        .compact-ref-metrics{
          font-size:.74rem!important;
          line-height:1.25!important;
          gap:4px 8px!important;
        }

        .compact-ref-metrics span{
          white-space:normal!important;
        }

        .compact-ref-action{
          font-size:.78rem!important;
          line-height:1.2!important;
          padding:9px 10px!important;
          border-radius:12px!important;
        }
      }

      @media (max-width:390px){
        .category-list .category-card-header{
          grid-template-columns:32px minmax(116px,1fr) 40px 44px 44px 48px 26px!important;
          column-gap:4px!important;
          padding:10px 6px!important;
        }

        .category-list .category-main strong{
          font-size:.82rem!important;
        }

        .category-list .category-metric span{
          font-size:.54rem!important;
        }

        .category-list .category-metric strong{
          font-size:.72rem!important;
        }

        .category-list .section-semaphore-chip{
          font-size:.51rem!important;
          padding:3px 5px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function overrideSectionRenderer() {
    if (typeof renderSectionRow !== 'function') return false;

    renderSectionRow = function (row, index) {
      if (typeof ensureSectionSemaphoreStyles === 'function') ensureSectionSemaphoreStyles();
      injectHighContrastSemaphoreStyles();

      var isOpen = openSectionKey === row.key;
      var statusClass = getNeutralStatusClass(row);
      var accentClass = getNeutralAccentClass(row, index);
      var refs = getSectionReferences(row);
      var chips = getSectionChips(row);
      var percent = row.porcentajeAlertas != null ? row.porcentajeAlertas : row.porcentaje_alertas;
      var sectionKey = row.key || row.key_zona || ((row.mundo || 'SIN MUNDO') + '|' + (row.seccion || 'SIN SECCIÓN'));

      return `
        <article class="category-card ${isOpen ? 'open' : ''} ${accentClass}">
          <button class="category-card-header mobile-priority-card" type="button" onclick="toggleSection('${getSafeAttribute(sectionKey)}')" aria-expanded="${isOpen}">
            <div class="rank-badge">${index + 1}</div>
            <div class="category-main">
              <strong>${getSafeHtml(row.mundo)} / ${getSafeHtml(row.seccion)}</strong>
              <span>${getSafeNumberText(row.totalReferencias || row.total_referencias)} referencias totales</span>
              ${chips}
            </div>
            <div class="category-metric metric-hay"><span>Hay</span><strong>${getSafeNumberText(row.inventario)}</strong></div>
            <div class="category-metric metric-vendido"><span>Vendió</span><strong>${getSafeNumberText(row.ventaUnidades || row.venta_unidades)}</strong></div>
            <div class="category-metric alert-metric metric-revisar"><span>Revisar</span><strong>${getSafeNumberText(row.alertas)}</strong></div>
            <div class="category-metric percent-metric metric-percent"><span>% revisar</span><strong>${getSafePercent(percent)}</strong></div>
            <span class="status-pill ${statusClass}">${getSafeHtml(row.estadoGrupo || row.estado_grupo || '')}</span>
            <span class="expand-indicator">${isOpen ? 'Cerrar' : 'Ver'}</span>
          </button>
          <div class="section-references ${isOpen ? '' : 'hidden'}">
            ${isOpen ? renderSectionReferences(refs) : ''}
          </div>
        </article>
      `;
    };

    return true;
  }

  function activate() {
    injectHighContrastSemaphoreStyles();
    overrideSectionRenderer();

    if (typeof renderDashboard !== 'function') return false;

    if (!originalRenderDashboardRef) {
      originalRenderDashboardRef = renderDashboard;

      renderDashboard = function (storeName) {
        injectHighContrastSemaphoreStyles();
        overrideSectionRenderer();

        var normalizedStoreName = String(storeName || '');
        if (normalizedStoreName !== lastStoreName) {
          closePrioritySections();
          lastStoreName = normalizedStoreName;
        }

        return originalRenderDashboardRef.apply(this, arguments);
      };
    }

    closePrioritySections();
    return true;
  }

  function init() {
    injectHighContrastSemaphoreStyles();
    var attempts = 0;

    function retry() {
      attempts++;
      if (activate()) return;
      if (attempts < 30) setTimeout(retry, 250);
    }

    retry();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
