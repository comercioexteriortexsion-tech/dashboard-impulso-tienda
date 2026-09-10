(function () {
  var lastStoreName = null;
  var originalRenderDashboardRef = null;

  function closePrioritySections() {
    try {
      if (typeof openSectionKey !== 'undefined') openSectionKey = null;
    } catch (e) {
      console.warn('No se pudo dejar secciones minimizadas', e);
    }
  }

  function safeNumber(value) {
    if (typeof toNumber === 'function') return toNumber(value);
    var number = Number(String(value || '').replace('%', '').replace(',', '.'));
    return isFinite(number) ? number : 0;
  }

  function safeFormatNumber(value) {
    if (typeof formatNumber === 'function') return formatNumber(value);
    return String(safeNumber(value));
  }

  function safeFormatPercent(value) {
    if (typeof formatPercent === 'function') return formatPercent(value);
    return Math.round(safeNumber(value) * 100) + '%';
  }

  function safeHtml(value) {
    if (typeof escapeHtml === 'function') return escapeHtml(value);
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char];
    });
  }

  function safeAttribute(value) {
    if (typeof escapeAttribute === 'function') return escapeAttribute(value);
    return safeHtml(value).replace(/`/g, '&#96;');
  }

  function getSectionReferences(row) {
    if (!row) return [];
    if (Array.isArray(row.productosCriticos)) return row.productosCriticos;
    if (Array.isArray(row.referencias)) return row.referencias;
    return [];
  }

  function getLevelFromItem(item) {
    if (typeof getCriterionLevel === 'function') return getCriterionLevel(item);

    var text = String([
      item && item.prioridad_simple,
      item && item.prioridad_revision,
      item && item.prioridad,
      item && item.criterio_critico,
      item && item.tipo_alerta,
      item && item.motivo_simple
    ].filter(Boolean).join(' ')).toLowerCase();

    if (/urgente|alta|criterio\s*1|sin venta|no ha vendido|no vendio|no vendió/.test(text)) return 1;
    if (/revisar|media|criterio\s*2|cobertura|rotacion|rotación|lento/.test(text)) return 2;
    return 3;
  }

  function getSectionCounts(row) {
    var c1 = safeNumber(row && (row.referenciasUrgentes || row.referencias_urgentes));
    var c2 = safeNumber(row && (row.referenciasRevisar || row.referencias_revisar));
    var c3 = safeNumber(row && (row.referenciasSeguimiento || row.referencias_seguimiento));

    if (c1 || c2 || c3) return { c1: c1, c2: c2, c3: c3 };

    var refs = getSectionReferences(row);
    refs.forEach(function (item) {
      var level = getLevelFromItem(item);
      if (level === 1) c1 += 1;
      else if (level === 2) c2 += 1;
      else c3 += 1;
    });

    return { c1: c1, c2: c2, c3: c3 };
  }

  function renderSectionChips(row) {
    var counts = getSectionCounts(row || {});
    var chips = [];

    if (counts.c1) chips.push('<span class="section-semaphore-chip section-semaphore-chip--urgent">' + safeFormatNumber(counts.c1) + ' urgente' + (counts.c1 === 1 ? '' : 's') + '</span>');
    if (counts.c2) chips.push('<span class="section-semaphore-chip section-semaphore-chip--review">' + safeFormatNumber(counts.c2) + ' revisar</span>');
    if (counts.c3) chips.push('<span class="section-semaphore-chip section-semaphore-chip--follow">' + safeFormatNumber(counts.c3) + ' seguimiento</span>');

    return chips.length ? '<div class="section-semaphore-summary">' + chips.join('') + '</div>' : '';
  }

  function getStatusClass(row) {
    var estado = row && (row.estadoGrupo || row.estado_grupo || '');
    if (typeof getEstadoGrupoClass === 'function') return getEstadoGrupoClass(estado);
    if (estado === 'Controlado') return 'status-controlado';
    if (estado === 'Revisión' || estado === 'Revision') return 'status-revision';
    return 'status-prioritario';
  }

  function getAccentClass(row, index) {
    var estado = row && (row.estadoGrupo || row.estado_grupo || '');
    if (typeof getSectionAccentClass === 'function') return getSectionAccentClass(estado, index);
    if (estado === 'Prioritario') return 'accent-prioritario';
    if (estado === 'Revisión' || estado === 'Revision') return 'accent-revision';
    if (index < 3) return 'accent-blue-soft';
    return 'accent-controlado';
  }

  function injectFinalMobileSectionStyles() {
    var existing = document.getElementById('finalMobileSectionStyles');
    if (existing) existing.remove();

    var style = document.createElement('style');
    style.id = 'finalMobileSectionStyles';
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

      .category-list .category-card,
      .category-list .category-card.open,
      .category-list .category-card.accent-prioritario,
      .category-list .category-card.accent-revision,
      .category-list .category-card.accent-controlado,
      .category-list .category-card.accent-blue-soft,
      .category-list .category-card.accent-prioritario.open,
      .category-list .category-card.accent-revision.open,
      .category-list .category-card.accent-controlado.open,
      .category-list .category-card.accent-blue-soft.open{
        background:linear-gradient(180deg,var(--seccion-fondo) 0%, #ffffff 100%)!important;
        border:1.8px solid var(--seccion-borde)!important;
        border-left:1.8px solid var(--seccion-borde)!important;
        box-shadow:0 8px 20px rgba(59,130,246,.08)!important;
        overflow:hidden!important;
      }

      .category-list .category-card.open{
        background:linear-gradient(180deg,var(--seccion-fondo-open) 0%, #ffffff 100%)!important;
        border-color:var(--seccion-borde-open)!important;
      }

      .category-list .category-card::before,
      .category-list .category-card::after,
      .category-list .category-card-header::before,
      .category-list .category-card-header::after{
        content:none!important;
        display:none!important;
        background:transparent!important;
        border:0!important;
        box-shadow:none!important;
      }

      .section-semaphore-summary{
        display:flex!important;
        flex-wrap:wrap!important;
        gap:7px!important;
        align-items:center!important;
        margin:0!important;
      }

      .section-semaphore-chip{
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        border-radius:999px!important;
        padding:5px 12px!important;
        font-size:.76rem!important;
        font-weight:950!important;
        line-height:1!important;
        white-space:nowrap!important;
        border:1px solid transparent!important;
      }

      .section-semaphore-chip--urgent,
      .alert-chip--critical,
      .alert-chip--sinventa,
      .priority-pill--urgente,
      .priority-pill--alta{
        background:var(--semaforo-rojo)!important;
        color:#ffffff!important;
        border-color:var(--semaforo-rojo-oscuro)!important;
        box-shadow:0 4px 10px rgba(255,59,48,.22)!important;
      }

      .section-semaphore-chip--review,
      .alert-chip--lento,
      .priority-pill--revisar,
      .priority-pill--media{
        background:var(--semaforo-amarillo)!important;
        color:#111827!important;
        border-color:var(--semaforo-amarillo-oscuro)!important;
        box-shadow:0 4px 10px rgba(244,180,0,.20)!important;
      }

      .section-semaphore-chip--follow,
      .priority-pill--seguimiento,
      .priority-pill--baja,
      .priority-pill--neutral{
        background:var(--semaforo-verde)!important;
        color:#ffffff!important;
        border-color:var(--semaforo-verde-oscuro)!important;
        box-shadow:0 4px 10px rgba(34,197,94,.20)!important;
      }

      .category-list .rank-badge{
        background:var(--seccion-badge)!important;
        color:var(--seccion-badge-texto)!important;
        border:0!important;
        box-shadow:none!important;
        font-weight:950!important;
      }

      .category-list .expand-indicator{
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        background:#ffffff!important;
        color:var(--seccion-boton)!important;
        border:2px solid var(--seccion-boton)!important;
        border-radius:999px!important;
        box-shadow:none!important;
        font-weight:950!important;
        line-height:1!important;
      }

      .category-list .status-pill{
        display:inline-flex!important;
        min-width:34px!important;
        width:34px!important;
        height:34px!important;
        padding:0!important;
        border-radius:999px!important;
        color:transparent!important;
        font-size:0!important;
        overflow:hidden!important;
        box-shadow:0 2px 8px rgba(15,23,42,.14)!important;
      }

      .category-list .status-prioritario{
        background:var(--semaforo-rojo)!important;
        border:1px solid var(--semaforo-rojo-oscuro)!important;
      }

      .category-list .status-revision{
        background:var(--semaforo-amarillo)!important;
        border:1px solid var(--semaforo-amarillo-oscuro)!important;
      }

      .category-list .status-controlado{
        background:var(--semaforo-verde)!important;
        border:1px solid var(--semaforo-verde-oscuro)!important;
      }

      .mobile-zone-card__button{
        width:100%!important;
        min-width:0!important;
        border:0!important;
        background:transparent!important;
        cursor:pointer!important;
        text-align:left!important;
      }

      .mobile-zone-card__top{
        display:grid!important;
        grid-template-columns:44px minmax(0,1fr) 38px!important;
        gap:10px!important;
        align-items:start!important;
      }

      .mobile-zone-card__title strong{
        display:block!important;
        color:var(--seccion-texto)!important;
        font-weight:950!important;
        letter-spacing:-.025em!important;
      }

      .mobile-zone-card__title span{
        display:block!important;
        color:var(--seccion-texto-sec)!important;
        font-weight:600!important;
      }

      .mobile-zone-card__actions{
        display:flex!important;
        align-items:center!important;
        gap:12px!important;
        flex-wrap:wrap!important;
      }

      .mobile-zone-card__metrics{
        display:grid!important;
        grid-template-columns:repeat(4,minmax(0,1fr))!important;
        gap:8px!important;
        border-top:1px solid #dbeafe!important;
      }

      .mobile-zone-metric{
        text-align:center!important;
        min-width:0!important;
      }

      .mobile-zone-metric span{
        display:block!important;
        color:#61708b!important;
        font-weight:650!important;
      }

      .mobile-zone-metric strong{
        display:block!important;
        color:#0f2554!important;
        font-weight:950!important;
        letter-spacing:-.02em!important;
      }

      .mobile-zone-metric--alert strong{
        color:var(--semaforo-rojo)!important;
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

      .compact-ref-row--urgente .compact-ref-criteria{background:#fee2e2!important;border-color:#ef4444!important;color:#991b1b!important;}
      .compact-ref-row--revisar .compact-ref-criteria{background:#fef3c7!important;border-color:#eab308!important;color:#78350f!important;}
      .compact-ref-row--seguimiento .compact-ref-criteria{background:#dcfce7!important;border-color:#16a34a!important;color:#14532d!important;}
      .compact-ref-row--urgente .compact-ref-action{background:#fff1f1!important;border:1.5px solid #fecaca!important;color:#7f1d1d!important;}
      .compact-ref-row--revisar .compact-ref-action{background:#fff8d6!important;border:1.5px solid #fde047!important;color:#713f12!important;}
      .compact-ref-row--seguimiento .compact-ref-action{background:#ecfdf3!important;border:1.5px solid #86efac!important;color:#14532d!important;}

      @media (min-width:761px){
        .mobile-zone-card__button{padding:16px 18px!important;}
        .mobile-zone-card__top{grid-template-columns:48px minmax(220px,1.2fr) 38px!important;}
        .mobile-zone-card__actions{margin:10px 0 12px 58px!important;}
        .mobile-zone-card__metrics{margin-left:58px!important;padding-top:12px!important;}
        .mobile-zone-card__title strong{font-size:1.05rem!important;}
        .mobile-zone-card__title span{font-size:.8rem!important;}
        .mobile-zone-metric span{font-size:.72rem!important;}
        .mobile-zone-metric strong{font-size:1rem!important;}
        .category-list .rank-badge{width:36px!important;height:36px!important;min-width:36px!important;font-size:1rem!important;}
      }

      @media (max-width:760px){
        html, body{overflow-x:hidden!important;max-width:100%!important;}
        .app-main{padding-left:10px!important;padding-right:10px!important;max-width:100%!important;overflow-x:hidden!important;}
        .section-block{padding:10px!important;overflow:hidden!important;}
        .category-list{gap:12px!important;overflow:visible!important;}
        .category-list .category-card{border-radius:18px!important;margin:0!important;}
        .mobile-zone-card__button{display:block!important;padding:15px 14px 14px!important;}
        .mobile-zone-card__top{grid-template-columns:42px minmax(0,1fr) 40px!important;gap:10px!important;align-items:start!important;}
        .category-list .rank-badge{width:36px!important;height:36px!important;min-width:36px!important;font-size:1.02rem!important;align-self:start!important;}
        .category-list .status-pill{width:34px!important;height:34px!important;min-width:34px!important;justify-self:end!important;margin-top:2px!important;}
        .mobile-zone-card__title strong{font-size:1.06rem!important;line-height:1.08!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;}
        .mobile-zone-card__title span{font-size:.82rem!important;line-height:1.12!important;margin-top:2px!important;white-space:normal!important;}
        .mobile-zone-card__actions{margin:12px 0 10px!important;gap:8px!important;align-items:center!important;}
        .category-list .expand-indicator{min-width:76px!important;height:34px!important;padding:0 14px!important;font-size:.92rem!important;}
        .section-semaphore-summary{gap:6px!important;flex:1 1 auto!important;}
        .section-semaphore-chip{font-size:.66rem!important;padding:5px 9px!important;min-height:26px!important;}
        .mobile-zone-card__metrics{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:4px!important;margin-top:10px!important;padding:12px 2px 0!important;}
        .mobile-zone-metric span{font-size:.74rem!important;line-height:1.05!important;white-space:nowrap!important;}
        .mobile-zone-metric strong{font-size:1.02rem!important;line-height:1.1!important;margin-top:3px!important;white-space:nowrap!important;}
        .section-references{padding:0 10px 10px!important;}
        .reference-detail-head{margin-top:4px!important;}
      }

      @media (max-width:390px){
        .mobile-zone-card__button{padding:13px 11px 13px!important;}
        .mobile-zone-card__top{grid-template-columns:36px minmax(0,1fr) 34px!important;gap:8px!important;}
        .category-list .rank-badge{width:32px!important;height:32px!important;min-width:32px!important;font-size:.92rem!important;}
        .category-list .status-pill{width:30px!important;height:30px!important;min-width:30px!important;}
        .mobile-zone-card__title strong{font-size:.98rem!important;}
        .mobile-zone-card__title span{font-size:.76rem!important;}
        .category-list .expand-indicator{min-width:68px!important;height:32px!important;font-size:.84rem!important;padding:0 10px!important;}
        .section-semaphore-chip{font-size:.58rem!important;padding:4px 7px!important;}
        .mobile-zone-card__metrics{gap:2px!important;padding-top:10px!important;}
        .mobile-zone-metric span{font-size:.65rem!important;}
        .mobile-zone-metric strong{font-size:.9rem!important;}
      }
    `;
    document.head.appendChild(style);
  }

  function renderFinalSectionRow(row, index) {
    injectFinalMobileSectionStyles();

    var isOpen = openSectionKey === row.key;
    var statusClass = getStatusClass(row);
    var accentClass = getAccentClass(row, index);
    var refs = getSectionReferences(row);

    return `
      <article class="category-card mobile-zone-card ${isOpen ? 'open' : ''} ${accentClass}">
        <button class="category-card-header mobile-zone-card__button" type="button" onclick="toggleSection('${safeAttribute(row.key)}')" aria-expanded="${isOpen}">
          <div class="mobile-zone-card__top">
            <div class="rank-badge">${index + 1}</div>
            <div class="category-main mobile-zone-card__title">
              <strong>${safeHtml(row.mundo)} / ${safeHtml(row.seccion)}</strong>
              <span>${safeFormatNumber(row.totalReferencias)} referencias totales</span>
            </div>
            <span class="status-pill ${statusClass}" aria-hidden="true">${safeHtml(row.estadoGrupo || '')}</span>
          </div>
          <div class="mobile-zone-card__actions">
            <span class="expand-indicator">${isOpen ? 'Cerrar' : 'Ver'}</span>
            ${renderSectionChips(row)}
          </div>
          <div class="mobile-zone-card__metrics" aria-label="Indicadores de la sección">
            <div class="mobile-zone-metric"><span>Hay</span><strong>${safeFormatNumber(row.inventario)}</strong></div>
            <div class="mobile-zone-metric"><span>Vendió</span><strong>${safeFormatNumber(row.ventaUnidades)}</strong></div>
            <div class="mobile-zone-metric mobile-zone-metric--alert"><span>Revisar</span><strong>${safeFormatNumber(row.alertas)}</strong></div>
            <div class="mobile-zone-metric"><span>% revisar</span><strong>${safeFormatPercent(row.porcentajeAlertas)}</strong></div>
          </div>
        </button>
        <div class="section-references ${isOpen ? '' : 'hidden'}">
          ${isOpen ? renderSectionReferences(refs) : ''}
        </div>
      </article>
    `;
  }

  function sortRowsIfPossible(rows) {
    if (typeof sortSectionsByCriterion === 'function') return sortSectionsByCriterion(rows || []);
    return rows || [];
  }

  function activate() {
    injectFinalMobileSectionStyles();

    renderSectionRow = renderFinalSectionRow;

    if (typeof renderMundoSeccionCalculated === 'function') {
      var originalRenderMundo = renderMundoSeccionCalculated;
      renderMundoSeccionCalculated = function (rows) {
        return originalRenderMundo(sortRowsIfPossible(rows));
      };
    }

    if (typeof renderDashboard !== 'function') return false;

    if (!originalRenderDashboardRef) {
      originalRenderDashboardRef = renderDashboard;
      renderDashboard = function (storeName) {
        injectFinalMobileSectionStyles();
        renderSectionRow = renderFinalSectionRow;

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
    injectFinalMobileSectionStyles();
    var attempts = 0;

    function retry() {
      attempts += 1;
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
