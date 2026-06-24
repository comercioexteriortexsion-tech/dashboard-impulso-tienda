(function(){
  function selectedStore(){
    if(typeof currentStoreName!=='undefined'&&currentStoreName){return currentStoreName;}
    var select=document.getElementById('storeSelect');
    return select&&select.value?select.value:'';
  }

  function buildUrl(store){
    return window.location.origin+window.location.pathname+'?tienda='+encodeURIComponent(store);
  }

  function showLink(url){
    window.prompt('Copia este enlace de la tienda:',url);
  }

  function addButton(){
    var changeButton=document.getElementById('changeStoreButton');
    if(!changeButton||document.getElementById('copyStoreLinkButton')){return;}

    var button=document.createElement('button');
    button.id='copyStoreLinkButton';
    button.type='button';
    button.className='header-change-store';
    button.textContent='Link tienda';
    button.style.marginLeft='6px';

    button.addEventListener('click',function(){
      var store=selectedStore();
      if(!store){
        if(typeof showToast==='function'){showToast('Selecciona una tienda primero.');}
        return;
      }
      showLink(buildUrl(store));
    });

    changeButton.insertAdjacentElement('afterend',button);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',addButton);
  }else{
    addButton();
  }
})();
