'use strict';
/* =====================================================================
   SCREENS
   ===================================================================== */
const SCREENS = [
  {id:'dash',      name:'Вечеринка',   icon:'grid',   color:'#ff2e4d', desc:'Раунд, игра, ближайшие действия'},
  {id:'players',   name:'Участники',   icon:'users',  color:'#ff3ea5', desc:'RP, EP, квесты, способности'},
  {id:'portals',   name:'Порталы',     icon:'cycle',  color:'#2ec5ff', desc:'Схема, защита, коробки'},
  {id:'gallery',   name:'Фигурки',     icon:'star',   color:'#ff5fa2', desc:'Все 11 минифигурок'},
  {id:'shop',      name:'Магазин',     icon:'cart',   color:'#ffe14d', desc:'12 покупаемых способностей'},
  {id:'unique',    name:'Способности', icon:'star',   color:'#c77dff', desc:'Уникальные способности персонажей', host:true},
  {id:'reactions', name:'Реакции',     icon:'shield', color:'#3dff9a', desc:'Окно реакции', host:true},
  {id:'rewards',   name:'Награды',     icon:'trophy', color:'#ff8a00', desc:'Раунды, игры и результаты'},
  {id:'final',     name:'Финал',       icon:'box',    color:'#8a3ffc', desc:'Заморозка, батчи, распределение'},
  {id:'log',       name:'Журнал',      icon:'list',   color:'#00f5d4', desc:'История и ручной откат'},
  {id:'figures',   name:'Коробки',     icon:'box',    color:'#3dff9a', desc:'Редактор фигурок и коробок', host:true},
  {id:'data',      name:'Данные',      icon:'download', color:'#a99bc8', desc:'Экспорт, импорт, проверка', host:true},
];
const VIEWS = () => ({dash:viewDash, players:viewPlayers, portals:viewPortals, gallery:viewGallery, shop:viewShop, unique:viewUnique, reactions:viewReactions,
  rewards:viewRewards, final:viewFinal, log:viewLog, figures:viewFigures, data:viewData});

function renderTop(){
  const pend = pendingAction();
  $('#top').innerHTML = `
    <div class="brand" data-a="go" data-s="dash"><div class="logo">${SPIDER('#000')}</div>
      <div><div class="brand-t">Паучья мультивселенная</div><div class="brand-s">${esc(roundLabel())}</div></div></div>
    <div class="top-actions">
      ${isDemo() ? '' : `${pend ? `<button class="btn red sm pulse" data-a="go" data-s="reactions">Окно реакции открыто</button>` : ''}
      <button class="iconbtn" title="Повторить последнее объявление на экране гостей" data-a="annLast">${ICONS.eye}</button>
      <button class="iconbtn" title="Ручной откат последнего действия" data-a="undo">${ICONS.undo}</button>
      <button class="iconbtn" title="Экспорт в JSON" data-a="export">${ICONS.download}</button>`}
      ${IS_GUEST ? '<div class="modesw"><span class="dot"></span>Экран гостей</div>' : `<div class="modesw" data-a="mode" title="Переключить режим"><span class="dot"></span>${isDemo()?'Демонстрация':'Ведущий'}</div>`}
    </div>
    <nav class="tabs">${SCREENS.filter(s => !(s.host && isDemo())).map(s => `<button class="tab ${ui.screen===s.id?'on':''}" data-a="go" data-s="${s.id}"><span>${s.name}${s.id==='reactions' && pend ? ' •' : ''}</span></button>`).join('')}</nav>`;
}

let warpTimer = null;
function render(){
  document.body.classList.toggle('demo', isDemo());
  document.body.classList.toggle('reduce', !!state.settings.reduceMotion);
  renderTop();
  const scr = SCREENS.find(s => s.id === ui.screen) || SCREENS[0];
  $('#view').innerHTML = scr.host && isDemo() ? lockedScreen() : VIEWS()[scr.id]();
  if(ui.warp.length){
    clearTimeout(warpTimer);
    warpTimer = setTimeout(() => { ui.warp = []; document.querySelectorAll('.portal.warp').forEach(el => el.classList.remove('warp')); }, 1200);
  }
  pullAnnouncements();
}

Object.assign(A, {
  go: d => { ui.screen = d.s; saveUi(); render(); window.scrollTo({top:0}); },
  closeModal: () => closeModal(),
  undo: () => confirmBox('Ручной откат', 'Состояние игры вернётся к моменту перед последним действием. Это исправление ведущего, а не игровая отмена способности.', 'Откатить').then(ok => ok && undo()),
  mode: () => {
    if(!isDemo()){ ui.mode = 'demo'; ui.revealed = []; ui.sel = []; closeModal(); saveUi(); render(); toast('Режим демонстрации: секреты скрыты', 'var(--green)'); return; }
    openModal(`<h2 style="color:var(--red)">⚠ Выход из режима демонстрации</h2>
      <div class="warnbig">Сейчас на экране может быть раскрыта <b>секретная информация</b>: содержимое порталов, квесты, способности и заметки ведущего.<br><br>Убедитесь, что гости не видят экран.</div>
      <p class="muted small">Удерживайте кнопку, чтобы подтвердить.</p>
      <div class="foot"><button class="btn ghost" data-a="closeModal">Остаться в демонстрации</button><button class="btn red lg hold" id="holdBtn"><span class="fill"></span><span>Удерживать — режим ведущего</span></button></div>`, 'danger');
    const btn = $('#holdBtn'); let tm;
    const start = e => { e.preventDefault(); btn.classList.add('holding'); tm = setTimeout(() => { closeModal(); ui.mode = 'host'; saveUi(); render(); toast('Режим ведущего', 'var(--red)'); }, 1600); };
    const stop = () => { btn.classList.remove('holding'); clearTimeout(tm); };
    btn.addEventListener('pointerdown', start); ['pointerup','pointerleave','pointercancel'].forEach(ev => btn.addEventListener(ev, stop));
  },
});

/* защита от двойного нажатия: одно и то же действие на одном элементе не чаще раза в 600 мс */
let lastClick = {el:null, t:0};
document.addEventListener('click', e => {
  if(e.target.dataset && e.target.dataset.bg){ closeModal(); A._modalClose && A._modalClose(); A._modalClose = null; return; }
  const el = e.target.closest('[data-a]'); if(!el || el.disabled) return;
  const now = Date.now();
  if(lastClick.el === el && now - lastClick.t < 600){ e.preventDefault(); return; }
  lastClick = {el, t:now};
  const fn = A[el.dataset.a]; if(fn){ e.preventDefault(); e.stopPropagation(); fn(el.dataset, el, e); }
});
document.addEventListener('change', e => { const el = e.target.closest('[data-c]'); if(el && C[el.dataset.c]) C[el.dataset.c](el.dataset, el); });
document.addEventListener('keydown', e => { if(e.key === 'Escape'){ if($('#ann')) hideAnnouncement(); else if($('#modal').innerHTML){ closeModal(); A._modalClose && A._modalClose(); A._modalClose = null; } } });

$('#fileImg').addEventListener('change', async e => {
  const file = e.target.files[0], t = uploadTarget; if(!file || !t) return;
  try {
    const url = await readImage(file, t.kind==='player' ? 256 : 520);
    const id = uid('m_'); state.media[id] = url;
    const o = t.kind==='figure'?F(t.id):t.kind==='box'?B(t.id):P(t.id);
    act({type:'setup', text:'Загружено изображение: ' + (o.name||o.label), playerId: t.kind==='player'?o.id:null}, () => { o[t.field] = id; });
    if(t.kind==='player') playerModal(o.id);
  } catch(err){ toast('Не удалось прочитать изображение', 'var(--red)'); }
});

/* синхронизация окон: окно гостей получает новое состояние и показывает объявления */
window.addEventListener('storage', e => {
  if(e.key !== LS.state || !e.newValue) return;
  try { state = JSON.parse(e.newValue); normalize(state); } catch(err){ return; }
  try { undoStack = JSON.parse(localStorage.getItem(LS.undo)) || []; } catch(err){}
  if(!$('#modal').innerHTML || isDemo()) render();
  pullAnnouncements();
});

load();
initAnnouncements();
render();
