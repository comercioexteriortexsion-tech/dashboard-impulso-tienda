(function(){
  function numberValue(value){
    var n=Number(value);
    return isNaN(n)?0:n;
  }

  function formatNumberLocal(value){
    return numberValue(value).toLocaleString('es-CO',{maximumFractionDigits:0});
  }

  function formatMoneyLocal(value){
    return '$ '+numberValue(value).toLocaleString('es-CO',{maximumFractionDigits:0});
  }

  function formatPercentLocal(value){
    var n=numberValue(value);
    if(Math.abs(n)<=1){n=n*100;}
    return n.toLocaleString('es-CO',{maximumFractionDigits:1})+'%';
  }

  function getUpdateText(){
    var el=document.getElementById('ultimaActualizacion');
    return el&&el.textContent?el.textContent:'Sin dato';
  }

  function currentStore(){
    try{
      if(typeof currentStoreName!=='undefined'&&currentStoreName){return currentStoreName;}
    }catch(e){}
    var select=document.getElementById('storeSelect');
    return select&&select.value?select.value:'';
  }

  function currentDashboard(){
    var store=currentStore();
    try{
      if(store&&typeof storeDashboards!=='undefined'){return storeDashboards[store]||null;}
    }catch(e){}
    return null;
  }

  function sectionCounts(zones){
    var counts={urgent:0,review:0,follow:0};
    (zones||[]).forEach(function(row){
      counts.urgent+=numberValue(row.referenciasUrgentes);
      counts.review+=numberValue(row.referenciasRevisar);
      counts.follow+=numberValue(row.referenciasSeguimiento);
    });
    return counts;
  }

  function getRefPriority(item){
    if(typeof getSemaphoreName==='function'){
      try{return getSemaphoreName(item);}catch(e){}
    }
    var text=String((item&&item.prioridad_simple)||'').toLowerCase();
    if(text.indexOf('urgente')>=0||text.indexOf('alta')>=0)return 'urgente';
    if(text.indexOf('revisar')>=0||text.indexOf('media')>=0)return 'revisar';
    return 'seguimiento';
  }

  function reason(item){
    if(typeof getReasonFromApi==='function'){
      try{return getReasonFromApi(item);}catch(e){}
    }
    return String((item&&item.motivo_simple)||(item&&item.criterio_critico)||'Revisar en tienda').trim();
  }

  function buildGeneralReport(){
    var s=(typeof generalSummary!=='undefined'&&generalSummary)?generalSummary:{};
    var rankingMeta=(typeof rankingCumplimientoTiendas!=='undefined'&&Array.isArray(rankingCumplimientoTiendas))?rankingCumplimientoTiendas:[];
    var rankingAlertas=(typeof rankingAlertasTiendas!=='undefined'&&Array.isArray(rankingAlertasTiendas))?rankingAlertasTiendas:[];
    var topMeta=rankingMeta.slice(0,3).map(function(row,index){return (index+1)+'. '+row.tienda+' - '+formatPercentLocal(row.cumplimiento);}).join('\n');
    var topAlertas=rankingAlertas.slice(0,3).map(function(row,index){return (index+1)+'. '+row.tienda+' - '+formatNumberLocal(row.alertas)+' alertas';}).join('\n');

    return [
      'REPORTE EJECUTIVO - IMPULSO EN TIENDA',
      'Vista: General / Todas las tiendas',
      'Actualizacion: '+getUpdateText(),
      '',
      'RESUMEN COMERCIAL',
      '- Tiendas evaluadas: '+formatNumberLocal(s.total_tiendas),
      '- Cumplimiento meta: '+formatPercentLocal(s.cumplimiento_meta),
      '- Avance esperado: '+formatPercentLocal(s.avance_esperado_mes),
      '- Venta mes: '+formatMoneyLocal(s.venta_pesos_mes),
      '- Meta mes: '+formatMoneyLocal(s.meta_venta_pesos),
      '- Inventario total: '+formatNumberLocal(s.inventario_total)+' und.',
      '- Alertas activas: '+formatNumberLocal(s.alertas_total),
      '',
      'TOP CUMPLIMIENTO',
      topMeta||'Sin datos disponibles',
      '',
      'MAYOR NIVEL DE ALERTAS',
      topAlertas||'Sin datos disponibles',
      '',
      'LECTURA EJECUTIVA',
      'Priorizar tiendas con mayor numero de alertas y revisar secciones con baja rotacion, inventario alto o referencias sin venta reciente.'
    ].join('\n');
  }

  function buildStoreReport(){
    var store=currentStore();
    var dash=currentDashboard();
    if(!store||!dash){return buildGeneralReport();}

    var s=dash.resumen||{};
    var zones=Array.isArray(dash.zonas)?dash.zonas:[];
    var counts=sectionCounts(zones);
    var topZones=zones.slice(0,5).map(function(row,index){
      return (index+1)+'. '+row.mundo+' / '+row.seccion+' - '+formatNumberLocal(row.alertas)+' alertas - '+formatPercentLocal(row.porcentajeAlertas)+' revisar';
    }).join('\n');

    var refs=[];
    zones.forEach(function(z){
      (Array.isArray(z.productosCriticos)?z.productosCriticos:[]).forEach(function(item){
        refs.push({
          referencia:item.referencia||'',
          descripcion:item.descripcion||'',
          prioridad:getRefPriority(item),
          inventario:numberValue(item.inventario_unidades),
          motivo:reason(item)
        });
      });
    });

    var priorityOrder={urgente:1,revisar:2,seguimiento:3};
    refs.sort(function(a,b){
      return (priorityOrder[a.prioridad]||9)-(priorityOrder[b.prioridad]||9)||b.inventario-a.inventario||String(a.referencia).localeCompare(String(b.referencia),'es');
    });

    var topRefs=refs.slice(0,8).map(function(item,index){
      return (index+1)+'. '+item.referencia+' - '+item.descripcion+' | '+item.prioridad.toUpperCase()+' | Hay '+formatNumberLocal(item.inventario)+' und. | '+item.motivo;
    }).join('\n');

    return [
      'REPORTE EJECUTIVO - IMPULSO EN TIENDA',
      'Tienda: '+store,
      'Actualizacion: '+getUpdateText(),
      '',
      'RESUMEN COMERCIAL',
      '- Cumplimiento meta: '+formatPercentLocal(s.cumplimiento_meta),
      '- Avance esperado: '+formatPercentLocal(s.avance_esperado_mes),
      '- Venta mes: '+formatMoneyLocal(s.venta_pesos_mes),
      '- Meta mes: '+formatMoneyLocal(s.meta_venta_pesos),
      '- Inventario total: '+formatNumberLocal(s.inventario_total)+' und.',
      '- Alertas activas: '+formatNumberLocal(s.alertas_total),
      '',
      'SEMAFORO DE ALERTAS',
      '- Urgentes: '+formatNumberLocal(counts.urgent),
      '- Revisar: '+formatNumberLocal(counts.review),
      '- Seguimiento: '+formatNumberLocal(counts.follow),
      '',
      'SECCIONES PRIORITARIAS',
      topZones||'Sin secciones criticas disponibles',
      '',
      'REFERENCIAS PRIORITARIAS',
      topRefs||'Sin referencias criticas disponibles',
      '',
      'ACCION RECOMENDADA',
      'Revisar primero las referencias urgentes, validar exhibicion y disponibilidad en piso, y ejecutar acciones comerciales sobre las secciones con mayor porcentaje de revision.'
    ].join('\n');
  }

  function copyText(text){
    if(navigator.clipboard&&navigator.clipboard.writeText){return navigator.clipboard.writeText(text);}
    var input=document.createElement('textarea');
    input.value=text;
    input.setAttribute('readonly','readonly');
    input.style.position='fixed';
    input.style.left='-9999px';
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    return Promise.resolve();
  }

  function openReport(){
    var report=currentStore()?buildStoreReport():buildGeneralReport();
    window.prompt('Reporte ejecutivo generado. Copialo o usa Ctrl+C:',report);
    copyText(report).then(function(){
      if(typeof showToast==='function'){showToast('Reporte ejecutivo copiado.');}
    }).catch(function(){});
  }

  function addButton(){
    var anchor=document.getElementById('copyStoreLinkButton')||document.getElementById('changeStoreButton');
    if(!anchor||document.getElementById('executiveReportButton'))return;
    var button=document.createElement('button');
    button.id='executiveReportButton';
    button.type='button';
    button.className='header-change-store';
    button.textContent='Reporte';
    button.style.marginLeft='6px';
    button.addEventListener('click',openReport);
    anchor.insertAdjacentElement('afterend',button);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addButton);else addButton();
})();
