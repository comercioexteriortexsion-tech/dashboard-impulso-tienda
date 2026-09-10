(function () {
  var lastStoreName = null;

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

  function safeAttr(value) {
    if (typeof escapeAttribute === 'function') return escapeAttribute(value);
    return safeHtml(value).replace(/`/g, '&#96;');
  }

  function getCounts(row) {
    if (typeof countCriteriaBySection === 'function') return countCriteriaBySection(row);
    return {
      c1: safeNumber(row && (row.referenciasUrgentes || row.referencias_urgentes)),
      c2: safeNumber(row && (row.referenciasRevisar || row.referencias_revisar)),
      c3: safeNumber(row && (row.referenciasSeguimiento || row.referencias_seguimiento))
    };
  }

  function renderChips(row) {
    var counts = getCounts(row || {});
    var chips = [];
    if (counts.c1) chips.push('<span class="section-semaphore-chip section-semaphore-chip--urgent">' + safeFormatNumber(counts.c1) + ' urgente' + (counts.c1 === 1 ? '' : 's') + '</span>');
    if (counts.c2) chips.push('<span class="section-semaphore-chip section-semaphore-chip--review">' + safeFormatNumber(counts.c2) + ' revisar</span>');
    if (counts.c3) chips.push('<span class="section-semaphore-chip section-semaphore-chip--follow">' + safeFormatNumber(counts.c3) + ' seguimiento</span>');
    return chips.length ? '<div class="section-semaphore-summary">' + chips.join('') + '</div>' : '';
  }

  function statusClass(row) {
    var estado = row && (row.estadoGrupo || row.estado_grupo || '');
    if (typeof getEstadoGrupoClass === 'function') return getEstadoGrupoClass(estado);
    if (String(estado).toLowerCase().indexOf('controlado') >= 0) return 'status-controlado';
    if (String(estado).toLowerCase().indexOf('revisi') >= 0) return 'status-revision';
    return 'status-prioritario';
  }

  function accentClass(row, index) {
    var estado = row && (row.estadoGrupo || row.estado_grupo || '');
    if (typeof getSectionAccentClass === 'function') return getSectionAccentClass(estado, index);
    if (String(estado).toLowerCase().indexOf('prioritario') >= 0) return 'accent-prioritario';
    if (String(estado).toLowerCase().indexOf('revisi') >= 0) return 'accent-revision';
    return 'accent-blue-soft';
  }

  function getRefs(row) {
    if (!row) return [];
    if (Array.isArray(row.productosCriticos)) return row.productosCriticos;
    if (Array.isArray(row.referencias)) return row.referencias;
    return [];
  }

  function injectStyles() {
    var old = document.getElementById('highContrastSemaphoreStyles');
    if (old) old.remove();

    var style = document.createElement('style');
    style.id = 'highContrastSemaphoreStyles';
    style.textContent = `
      :root{
        --semaforo-rojo:#ff3b30; --semaforo-rojo-oscuro:#c81e1e; --semaforo-rojo-fondo:#fff1f1; --semaforo-rojo-borde:#ff6b63;
        --semaforo-amarillo:#f4b400; --semaforo-amarillo-oscuro:#9a6700; --semaforo-amarillo-fondo:#fff8dc; --semaforo-amarillo-borde:#f6c744;
        --semaforo-verde:#22c55e; --semaforo-verde-oscuro:#15803d; --semaforo-verde-fondo:#ecfdf3; --semaforo-verde-borde:#4ade80;
        --seccion-fondo:#f7fbff; --seccion-fondo-open:#f2f8ff; --seccion-borde:#b7d6ff; --seccion-borde-open:#9fc8ff;
        --seccion-texto:#163a70; --seccion-texto-sec:#6b7f9e; --seccion-badge:#dcebff; --seccion-badge-texto:#1d5fd0; --seccion-boton:#1f6bff;
      }

      .section-semaphore-chip{display:inline-flex!important;align-items:center!important;border-radius:999px!important;padding:4px 8px!important;font-size:.62rem!important;font-weight:1000!important;line-height:1!important;white-space:nowrap!important;border:1px solid transparent!important;}
      .section-semaphore-chip--urgent,.alert-chip--critical,.alert-chip--sinventa,.priority-pill--urgente,.priority-pill--alta{background:var(--semaforo-rojo)!important;color:#fff!important;border-color:var(--semaforo-rojo-oscuro)!important;box-shadow:0 4px 10px rgba(255,59,48,.22)!important;}
      .section-semaphore-chip--review,.alert-chip--lento,.priority-pill--revisar,.priority-pill--media{background:var(--semaforo-amarillo)!important;color:#111827!important;border-color:var(--semaforo-amarillo-oscuro)!important;box-shadow:0 4px 10px rgba(244,180,0,.20)!important;}
      .section-semaphore-chip--follow,.priority-pill--seguimiento,.priority-pill--baja,.priority-pill--neutral{background:var(--semaforo-verde)!important;color:#fff!important;border-color:var(--semaforo-verde-oscuro)!important;box-shadow:0 4px 10px rgba(34,197,94,.20)!important;}

      .category-list .category-card,.category-list .category-card.open,.category-list .category-card.accent-prioritario,.category-list .category-card.accent-revision,.category-list .category-card.accent-controlado,.category-list .category-card.accent-blue-soft{background:linear-gradient(180deg,var(--seccion-fondo) 0%,#fff 100%)!important;border:1.8px solid var(--seccion-borde)!important;border-left:1.8px solid var(--seccion-borde)!important;border-right:1.8px solid var(--seccion-borde)!important;box-shadow:0 8px 20px rgba(59,130,246,.08)!important;overflow:hidden!important;}
      .category-list .category-card.open{background:linear-gradient(180deg,var(--seccion-fondo-open) 0%,#fff 100%)!important;border-color:var(--seccion-borde-open)!important;}
      .category-list .category-card::before,.category-list .category-card::after,.category-list .category-card-header::before,.category-list .category-card-header::after{display:none!important;background:transparent!important;border:0!important;box-shadow:none!important;}

      .category-card-header{width:100%!important;min-width:0!important;box-sizing:border-box!important;}
      .rank-badge{background:var(--seccion-badge)!important;color:var(--seccion-badge-texto)!important;border:0!important;font-weight:1000!important;box-shadow:none!important;}
      .expand-indicator{background:#fff!important;color:var(--seccion-boton)!important;border:2px solid var(--seccion-boton)!important;border-radius:999px!important;box-shadow:none!important;font-weight:1000!important;text-align:center!important;}
      .category-main strong{color:var(--seccion-texto)!important;}
      .category-main span,.category-metric span{color:var(--seccion-texto-sec)!important;}
      .category-metric strong{color:#0f2554!important;}
      .alert-metric strong{color:var(--semaforo-rojo)!important;}
      .status-pill{min-width:34px!important;width:34px!important;height:34px!important;padding:0!important;border-radius:999px!important;color:transparent!important;font-size:0!important;overflow:hidden!important;box-shadow:0 2px 8px rgba(15,23,42,.14)!important;}
      .status-prioritario{background:var(--semaforo-rojo)!important;border:1px solid var(--semaforo-rojo-oscuro)!important;}
      .status-revision{background:var(--semaforo-amarillo)!important;border:1px solid var(--semaforo-amarillo-oscuro)!important;}
      .status-controlado{background:var(--semaforo-verde)!important;border:1px solid var(--semaforo-verde-oscuro)!important;}

      .compact-ref-row--urgente{background:linear-gradient(90deg,#fff 0%,var(--semaforo-rojo-fondo) 100%)!important;border:2px solid var(--semaforo-rojo-borde)!important;border-left:8px solid var(--semaforo-rojo)!important;box-shadow:0 8px 20px rgba(255,59,48,.14)!important;}
      .compact-ref-row--revisar{background:linear-gradient(90deg,#fff 0%,var(--semaforo-amarillo-fondo) 100%)!important;border:2px solid var(--semaforo-amarillo-borde)!important;border-left:8px solid var(--semaforo-amarillo)!important;box-shadow:0 8px 20px rgba(244,180,0,.14)!important;}
      .compact-ref-row--seguimiento{background:linear-gradient(90deg,#fff 0%,var(--semaforo-verde-fondo) 100%)!important;border:2px solid var(--semaforo-verde-borde)!important;border-left:8px solid var(--semaforo-verde)!important;box-shadow:0 8px 20px rgba(34,197,94,.12)!important;}
      .compact-ref-row--urgente .compact-ref-criteria{background:#fee2e2!important;border-color:#ef4444!important;color:#991b1b!important;}
      .compact-ref-row--revisar .compact-ref-criteria{background:#fef3c7!important;border-color:#eab308!important;color:#78350f!important;}
      .compact-ref-row--seguimiento .compact-ref-criteria{background:#dcfce7!important;border-color:#16a34a!important;color:#14532d!important;}
      .compact-ref-row--urgente .compact-ref-action{background:#fff1f1!important;border:1.5px solid #fecaca!important;color:#7f1d1d!important;}
      .compact-ref-row--revisar .compact-ref-action{background:#fff8d6!important;border:1.5px solid #fde047!important;color:#713f12!important;}
      .compact-ref-row--seguimiento .compact-ref-action{background:#ecfdf3!important;border:1.5px solid #86efac!important;color:#14532d!important;}

      @media(max-width:760px){
        .app-main{padding-left:10px!important;padding-right:10px!important;max-width:100%!important;overflow-x:hidden!important;}
        .section-block{padding-left:8px!important;padding-right:8px!important;overflow:hidden!important;}
        .category-list{gap:10px!important;}
        .category-list .category-card{border-radius:16px!important;overflow:hidden!important;}
        .category-card-header{
          display:grid!important;
          grid-template-columns:38px minmax(0,1fr) 34px!important;
          grid-template-areas:"rank main status" "action metrics metrics"!important;
          column-gap:8px!important;row-gap:8px!important;align-items:center!important;
          padding:12px 10px!important;min-height:126px!important;text-align:left!important;
        }
        .rank-badge{grid-area:rank!important;width:32px!important;height:32px!important;min-width:32px!important;font-size:.86rem!important;align-self:start!important;justify-self:center!important;}
        .category-main{grid-area:main!important;min-width:0!important;align-self:start!important;}
        .category-main strong{display:block!important;font-size:.98rem!important;line-height:1.08!important;letter-spacing:-.02em!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;}
        .category-main>span{display:block!important;margin-top:2px!important;font-size:.72rem!important;line-height:1.08!important;white-space:normal!important;}
        .section-semaphore-summary{display:flex!important;flex-wrap:wrap!important;gap:4px!important;margin-top:6px!important;max-width:100%!important;}
        .section-semaphore-chip{font-size:.58rem!important;padding:4px 7px!important;}
        .category-metrics-grid{grid-area:metrics!important;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:4px!important;width:100%!important;min-width:0!important;align-items:start!important;}
        .category-metric{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;min-width:0!important;padding:0!important;gap:2px!important;}
        .category-metric span{font-size:.62rem!important;line-height:1!important;white-space:nowrap!important;}
        .category-metric strong{font-size:.88rem!important;line-height:1.05!important;white-space:nowrap!important;}
        .percent-metric strong{font-size:.82rem!important;}
        .status-pill{grid-area:status!important;width:28px!important;height:28px!important;min-width:28px!important;justify-self:end!important;align-self:start!important;}
        .expand-indicator{grid-area:action!important;align-self:start!important;justify-self:start!important;min-width:54px!important;padding:6px 10px!important;font-size:.78rem!important;line-height:1!important;}
        .section-references{border-top:1px solid var(--seccion-borde)!important;background:#f8fbff!important;padding:10px 8px!important;}
      }

      @media(min-width:761px){
        .category-card-header{display:grid!important;grid-template-columns:44px minmax(210px,1.3fr) minmax(320px,1.6fr) 38px 62px!important;grid-template-areas:"rank main metrics status action"!important;gap:12px!important;align-items:center!important;padding:14px 16px!important;}
        .rank-badge{grid-area:rank!important;}
        .category-main{grid-area:main!important;}
        .category-metrics-grid{grid-area:metrics!important;display:grid!important;grid-template-columns:repeat(4,minmax(60px,1fr))!important;gap:10px!important;}
        .category-metric{display:flex!important;flex-direction:column!important;align-items:center!important;}
        .status-pill{grid-area:status!important;justify-self:center!important;}
        .expand-indicator{grid-area:action!important;justify-self:end!important;padding:6px 12px!important;}
      }
    `;
    document.head.appendChild(style);
  }

  function overrideRenderers() {
    if (typeof renderSectionRow === 'function') {
      renderSectionRow = function (row, index) {
        var isOpen = openSectionKey === row.key;
        return `
          <article class="category-card ${isOpen ? 'open' : ''} ${accentClass(row, index)}">
            <button class="category-card-header" type="button" onclick="toggleSection('${safeAttr(row.key)}')" aria-expanded="${isOpen}">
              <div class="rank-badge">${index + 1}</div>
              <div class="category-main">
                <strong>${safeHtml(row.mundo)} / ${safeHtml(row.seccion)}</strong>
                <span>${safeFormatNumber(row.totalReferencias)} referencias totales</span>
                ${renderChips(row)}
              </div>
              <div class="category-metrics-grid">
                <div class="category-metric metric-hay"><span>Hay</span><strong>${safeFormatNumber(row.inventario)}</strong></div>
                <div class="category-metric metric-vendido"><span>Vendió</span><strong>${safeFormatNumber(row.ventaUnidades)}</strong></div>
                <div class="category-metric alert-metric metric-revisar"><span>Revisar</span><strong>${safeFormatNumber(row.alertas)}</strong></div>
                <div class="category-metric percent-metric metric-percent"><span>% revisar</span><strong>${safeFormatPercent(row.porcentajeAlertas)}</strong></div>
              </div>
              <span class="status-pill ${statusClass(row)}">estado</span>
              <span class="expand-indicator">${isOpen ? 'Cerrar' : 'Ver'}</span>
            </button>
            <div class="section-references ${isOpen ? '' : 'hidden'}">${isOpen ? renderSectionReferences(getRefs(row)) : ''}</div>
          </article>
        `;
      };
    }
  }

  function activate() {
    injectStyles();
    overrideRenderers();

    if (typeof renderDashboard !== 'function') return false;
    if (!renderDashboard.__neutralMobileWrapped) {
      var originalRenderDashboard = renderDashboard;
      renderDashboard = function (storeName) {
        injectStyles();
        overrideRenderers();
        var normalizedStoreName = String(storeName || '');
        if (normalizedStoreName !== lastStoreName) {
          closePrioritySections();
          lastStoreName = normalizedStoreName;
        }
        return originalRenderDashboard.apply(this, arguments);
      };
      renderDashboard.__neutralMobileWrapped = true;
    }

    closePrioritySections();
    return true;
  }

  function init() {
    injectStyles();
    var attempts = 0;
    function retry() {
      attempts++;
      if (activate()) return;
      if (attempts < 30) setTimeout(retry, 250);
    }
    retry();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
