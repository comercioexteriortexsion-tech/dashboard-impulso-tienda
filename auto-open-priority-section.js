(function(){
  function getActiveDashboard(){
    try{
      if(typeof currentStoreName!=='undefined'&&currentStoreName&&typeof storeDashboards!=='undefined'){
        return storeDashboards[currentStoreName]||null;
      }
    }catch(e){}
    return null;
  }

  function getFirstPrioritySection(dashboard){
    var zones=dashboard&&Array.isArray(dashboard.zonas)?dashboard.zonas:[];
    if(!zones.length)return null;
    return zones.find(function(row){
      return row&&row.key&&(Number(row.alertas)||0)>0;
    })||zones.find(function(row){
      return row&&row.key&&Array.isArray(row.productosCriticos)&&row.productosCriticos.length>0;
    })||zones[0];
  }

  function openFirstPrioritySection(){
    try{
      if(typeof currentStoreName==='undefined'||!currentStoreName)return;
      if(typeof openSectionKey!=='undefined'&&openSectionKey)return;
      var dashboard=getActiveDashboard();
      var first=getFirstPrioritySection(dashboard);
      if(!first||!first.key)return;
      openSectionKey=first.key;
      if(typeof renderMundoSeccionCalculated==='function'){
        renderMundoSeccionCalculated(dashboard.zonas||[]);
      }
    }catch(e){
      console.warn('No se pudo abrir la primera seccion prioritaria',e);
    }
  }

  function activate(){
    if(typeof renderDashboard!=='function')return false;
    var originalRenderDashboard=renderDashboard;
    renderDashboard=function(storeName){
      var result=originalRenderDashboard.apply(this,arguments);
      setTimeout(openFirstPrioritySection,80);
      return result;
    };
    setTimeout(openFirstPrioritySection,700);
    return true;
  }

  function init(){
    var attempts=0;
    function retry(){
      attempts++;
      if(activate())return;
      if(attempts<20)setTimeout(retry,250);
    }
    retry();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
