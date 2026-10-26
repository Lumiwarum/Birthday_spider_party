'use strict';
/* =====================================================================
   MODALS / TOAST
   ===================================================================== */
function openModal(html, cls=''){ $('#modal').innerHTML = `<div class="modal-bg" data-bg="1"><div class="modal ${cls}">${html}</div></div>`; }
function closeModal(){ $('#modal').innerHTML = ''; }
function confirmBox(title, text, ok='Подтвердить', danger=false){
  return new Promise(res => {
    openModal(`<h2>${title}</h2><div class="${danger?'warnbig':''}">${text}</div><div class="foot"><button class="btn ghost" data-a="cbNo">Отмена</button><button class="btn ${danger?'red':'violet'}" data-a="cbYes">${ok}</button></div>`, danger?'danger':'');
    A.cbYes = () => { closeModal(); res(true); };
    A.cbNo = () => { closeModal(); res(false); };
    A._modalClose = () => res(false);
  });
}
function toast(text, c){
  const el = document.createElement('div'); el.className = 'toast'; if(c) el.style.setProperty('--c', c); el.textContent = text;
  $('#toasts').appendChild(el); setTimeout(() => el.remove(), 3800);
}
