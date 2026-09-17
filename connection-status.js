(function(){
  var STATUS_ID='connectionStatusIndicator';
  var STYLE_ID='connectionStatusStyles';
  var originalFetch=window.fetch;
  var appsScriptPattern=/script\.google\.com|script\.googleusercontent\.com/i;

  function injectStyles(){
    if(document.getElementById(STYLE_ID))return;
    var style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .app-header__right{
        display:flex!important;
        align-items:center!important;
        justify-content:flex-end!important;
        gap:6px!important;
        flex-wrap:wrap!important;
      }

      .connection-status-indicator{
        display:inline-flex!important;
        align-items:center!important;
        gap:5px!important;
        min-height:24px!important;
        padding:4px 8px!important;
        border-radius:999px!important;
        font-size:11px!important;
        font-weight:900!important;
        line-height:1!important;
        white-space:nowrap!important;
        border:1px solid transparent!important;
        box-shadow:0 2px 6px rgba(15,23,42,.08)!important;
      }

      .connection-status-indicator__dot{
        width:8px!important;
        height:8px!important;
        min-width:8px!important;
        border-radius:999px!important;
        display:inline-block!important;
      }

      .connection-status-indicator--online{
        background:#dcfce7!important;
        color:#166534!important;
        border-color:#86efac!important;
      }

      .connection-status-indicator--online .connection-status-indicator__dot{
        background:#22c55e!important;
      }

      .connection-status-indicator--offline{
        background:#fee2e2!important;
        color:#991b1b!important;
        border-color:#fca5a5!important;
      }

      .connection-status-indicator--offline .connection-status-indicator__dot{
        background:#ef4444!important;
      }

      @media(max-width:760px){
        .connection-status-indicator{
          min-height:22px!important;
          padding:4px 7px!important;
          font-size:10px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureIndicator(){
    injectStyles();
    var indicator=document.getElementById(STATUS_ID);
    if(indicator)return indicator;

    indicator=document.createElement('span');
    indicator.id=STATUS_ID;
    indicator.className='connection-status-indicator connection-status-indicator--offline';
    indicator.setAttribute('role','status');
    indicator.setAttribute('aria-live','polite');
    indicator.innerHTML='<span class="connection-status-indicator__dot" aria-hidden="true"></span><span class="connection-status-indicator__text">Falla conexión</span>';

    var headerRight=document.querySelector('.app-header__right');
    var refreshButton=document.getElementById('refreshButton');

    if(headerRight){
      if(refreshButton&&refreshButton.parentNode===headerRight){
        headerRight.insertBefore(indicator,refreshButton);
      }else{
        headerRight.appendChild(indicator);
      }
    }

    return indicator;
  }

  function setConnectionStatus(isOnline){
    var indicator=ensureIndicator();
    if(!indicator)return;

    indicator.classList.toggle('connection-status-indicator--online',!!isOnline);
    indicator.classList.toggle('connection-status-indicator--offline',!isOnline);

    var text=indicator.querySelector('.connection-status-indicator__text');
    if(text)text.textContent=isOnline?'En línea':'Falla conexión';
    indicator.setAttribute('title',isOnline?'Conexión en línea con Apps Script':'Falla en conexión con Apps Script');
  }

  function isAppsScriptRequest(input){
    try{
      var url=typeof input==='string'?input:(input&&input.url)||'';
      return appsScriptPattern.test(String(url));
    }catch(e){
      return false;
    }
  }

  window.setConnectionStatus=function(isOnline){
    setConnectionStatus(isOnline);
  };

  window.fetch=function(input,init){
    var isTarget=isAppsScriptRequest(input);
    return originalFetch.apply(this,arguments).then(function(response){
      if(isTarget)setConnectionStatus(!!(response&&response.ok));
      return response;
    }).catch(function(error){
      if(isTarget)setConnectionStatus(false);
      throw error;
    });
  };

  function init(){
    ensureIndicator();
    setConnectionStatus(navigator.onLine!==false);
    window.addEventListener('online',function(){setConnectionStatus(true);});
    window.addEventListener('offline',function(){setConnectionStatus(false);});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
