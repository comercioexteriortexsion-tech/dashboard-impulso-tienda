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

  function activate(){
    if(typeof renderDashboard!=='function')return false;

    var originalRenderDashboard=renderDashboard;

    renderDashboard=function(storeName){
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
