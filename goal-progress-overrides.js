/* =========================================================
   Sprint 3.4 - Avance esperado de meta mensual
   Muestra en la tarjeta de meta:
   - Cumplimiento real con flecha
   - Debería ir con tamaño 15% menor
   ========================================================= */

function injectGoalProgressStyles() {
  if (document.getElementById('goalProgressStyles')) return;

  const style = document.createElement('style');
  style.id = 'goalProgressStyles';
  style.textContent = `
    #kpiMetaCard #cumplimientoMeta {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      line-height: 1;
    }

    .goal-main-value--up {
      color: #15803d !important;
    }

    .goal-main-value--down {
      color: #dc2626 !important;
    }

    .goal-arrow {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.78em;
      font-weight: 900;
      line-height: 1;
    }

    #kpiMetaCard #ventaMetaTexto.goal-expected-line {
      display: block;
      margin-top: 8px;
      font-size: 85% !important;
      line-height: 1.05;
      font-weight: 800;
      color: #334155;
    }

    #kpiMetaCard #ventaMetaTexto.goal-expected-line strong {
      font-size: 1em;
      font-weight: 900;
      color: #0f172a;
    }
  `;
  document.head.appendChild(style);
}

normalizeSummary = function (resumen) {
  return {
    total_tiendas: toNumber(resumen.total_tiendas),
    cumplimiento_meta: toNumber(resumen.cumplimiento_meta),
    avance_esperado_mes: toNumber(resumen.avance_esperado_mes),
    venta_pesos_mes: toNumber(resumen.venta_pesos_mes),
    meta_venta_pesos: toNumber(resumen.meta_venta_pesos),
    inventario_total: toNumber(resumen.inventario_total),
    alertas_total: toNumber(resumen.alertas_total),
    sin_venta: toNumber(resumen.sin_venta),
    criticos: toNumber(resumen.criticos),
    lentos: toNumber(resumen.lentos),
    fecha_corte_datos: resumen.fecha_corte_datos || ''
  };
};

renderSummaryCalculated = function (resumen) {
  const cumplimiento = toNumberOrNull(resumen.cumplimiento_meta);
  const avanceEsperadoMes = toNumberOrNull(resumen.avance_esperado_mes);
  const ventaMes = toNumber(resumen.venta_pesos_mes);
  const metaMes = toNumber(resumen.meta_venta_pesos);
  const inventarioTotal = toNumber(resumen.inventario_total);
  const alertasPrincipales = toNumber(resumen.alertas_total);
  const sinVenta = toNumber(resumen.sin_venta);
  const criticos = toNumber(resumen.criticos);
  const lentos = toNumber(resumen.lentos);

  pintarSummary({
    cumplimiento,
    avanceEsperadoMes,
    ventaMes,
    metaMes,
    inventarioTotal,
    alertasPrincipales,
    sinVenta,
    criticos,
    lentos
  });
};

pintarSummary = function ({ cumplimiento, avanceEsperadoMes, ventaMes, metaMes, inventarioTotal, alertasPrincipales, sinVenta, criticos, lentos }) {
  injectGoalProgressStyles();

  const cumplimientoValue = cumplimiento === null ? 0 : cumplimiento;
  const cumplimientoPct = Math.max(0, Math.min(cumplimientoValue * 100, 100));
  const tieneEsperado = avanceEsperadoMes !== null && avanceEsperadoMes > 0;
  const vaBienContraDia = tieneEsperado ? cumplimientoValue >= avanceEsperadoMes : cumplimientoValue >= 1;
  const arrow = vaBienContraDia ? '▲' : '▼';
  const valueClass = vaBienContraDia ? 'goal-main-value--up' : 'goal-main-value--down';
  const esperadoTexto = tieneEsperado ? formatPercent(avanceEsperadoMes) : '-';

  const cumplimientoMeta = document.getElementById('cumplimientoMeta');
  if (cumplimientoMeta) {
    cumplimientoMeta.className = valueClass;
    cumplimientoMeta.innerHTML = cumplimiento === null
      ? '-'
      : `<span>${formatPercent(cumplimiento)}</span><span class="goal-arrow">${arrow}</span>`;
  }

  const ventaMetaTexto = document.getElementById('ventaMetaTexto');
  if (ventaMetaTexto) {
    ventaMetaTexto.className = 'goal-expected-line';
    ventaMetaTexto.innerHTML = `Debería ir: <strong>${esperadoTexto}</strong>`;
  }

  setText('inventarioTotal', formatNumber(inventarioTotal));
  setText('referenciasCriticas', formatNumber(alertasPrincipales));
  setText('alertasTexto', alertasPrincipales === 0 ? 'Sin alertas activas' : 'Productos que necesitan atención');

  const metaCard = document.getElementById('kpiMetaCard');
  const inventarioCard = document.getElementById('kpiInventarioCard');
  const alertasCard = document.getElementById('kpiAlertasCard');

  if (metaCard) {
    metaCard.className = `summary-card ${vaBienContraDia ? 'summary-card--success' : 'summary-card--danger'}`;
  }

  if (inventarioCard) inventarioCard.className = 'summary-card summary-card--info';

  if (alertasCard) {
    alertasCard.className = `summary-card ${alertasPrincipales === 0 ? 'summary-card--success' : criticos > 0 || sinVenta > 0 ? 'summary-card--danger' : 'summary-card--warning'}`;
  }

  const cumplimientoBar = document.getElementById('cumplimientoMetaBar');
  const inventarioBar = document.getElementById('inventarioBar');
  if (cumplimientoBar) cumplimientoBar.style.width = `${cumplimientoPct}%`;
  if (inventarioBar) inventarioBar.style.width = `${Math.min(100, Math.max(8, inventarioTotal / 100))}%`;

  const alertBreakdown = document.getElementById('alertBreakdown');
  if (alertBreakdown) {
    alertBreakdown.innerHTML = alertasPrincipales > 0 ? `
      ${criticos ? `<span class="alert-chip alert-chip--critical">${criticos} crítico${criticos === 1 ? '' : 's'}</span>` : ''}
      ${sinVenta ? `<span class="alert-chip alert-chip--sinventa">${sinVenta} sin venta</span>` : ''}
      ${lentos ? `<span class="alert-chip alert-chip--lento">${lentos} lento${lentos === 1 ? '' : 's'}</span>` : ''}
    ` : '';
  }
};
