'use strict';
/* ---------- state ---------- */
// startPortal — портал, в который гость попадает в начале вечеринки; фигурка в нём определяет персонажа (квест и способность)
function newPlayer(name, i, charId, startPortal = null){
  return {id:uid('p'), name, color:COLORS[i % COLORS.length], avatar: i < AVATARS.length ? 'builtin:'+i : null,
    rp:START.rp, ep2:START.ep2, charId: charId || null, startPortal, batch:null, prefs:null, prize:null};
}
// в подготовке персонаж участника = фигурка в его стартовом портале; квесты пересобираются при любом изменении
function syncSetupChars(s = state){
  if(s.phase !== 'setup') return;
  s.players.forEach(p => {
    const box = p.startPortal ? s.boxes.find(b => b.id === s.portals[p.startPortal - 1]) : null;
    p.charId = box ? box.figureId : null;
  });
  const want = s.players.filter(p => p.charId).map(p => p.id + ':' + p.charId).join();
  const have = s.quests.map(q => q.holder + ':' + q.origin).join();
  if(want !== have) s.quests = s.players.filter(p => p.charId).map(p => newQuest(p.charId, p.id));
}
// экземпляр квеста: origin — персонаж, которому квест принадлежал изначально (и чья способность за него открывается)
function newQuest(origin, holder, note){
  return {id:uid('q'), origin, holder, status:'open', history:[{t:Date.now(), text: note || 'Назначен в начале игры'}]};
}
const newGame = name => ({id:uid('g'), name, status:'planned', results:null});
const freshFinal = () => ({tiebreak:null, order:[], draw:null, results:{}, confirmed:false, revealed:[]});
const freshEffects = () => ({disguises:[], invisible:[], protections:[], vouchers:[]});
function freshFigures(){
  return DEFAULT_FIGURES.map(([name,nameEn,color,quest],i) => ({id:'fig'+(i+1), name, nameEn, color, quest, image:null, desc:''}));
}
function freshState(){
  const figures = freshFigures();
  const boxes = figures.map((f,i) => ({id:'box'+(i+1), label:'BX-'+String(i+1).padStart(2,'0'), figureId:f.id, condition:'perfect', notes:'', photo:null, recognizable:false}));
  const players = DEMO_NAMES.map((n,i) => newPlayer(n, i, null, i + 1));
  const s = {app:'spiderverse-party', schema:SCHEMA, createdAt:Date.now(),
    phase:'setup', roundIdx:0, roundSerial:0, settings:{reduceMotion:false},
    rounds: ROUND_TEMPLATES.map(r => ({id:r.id, name:r.name, title:r.title, optional:r.optional, enabled:!r.optional, games:r.games.map(newGame)})),
    players, figures, boxes, portals: shuffle(boxes.map(b=>b.id)), home:null,
    quests: [],
    abilities:[], effects:freshEffects(), actions:[], pendingId:null,
    final:freshFinal(), announcements:[], log:[], media:{}};
  syncSetupChars(s);
  s.log.push({id:uid('e'), t:Date.now(), type:'setup', text:'Создана новая игра: 11 участников (0 RP, 2 EP), 11 фигурок, случайная раскладка порталов', pub:false});
  return s;
}

/* ---------- миграция сохранений ---------- */
function migrate(s){
  if(!s.schema){ // схема 1: прототип без игровой механики
    const n = freshState();
    n.figures = n.figures.map(f => { const o = (s.figures||[]).find(x => x.id === f.id); return o ? {...f, name:o.name||f.name, image:o.image||null, desc:o.desc||''} : f; });
    if(Array.isArray(s.boxes) && s.boxes.length === PORTALS) n.boxes = s.boxes;
    if(Array.isArray(s.portals) && s.portals.length === PORTALS) n.portals = s.portals;
    n.media = s.media || {};
    n.players = (s.players||[]).map((p,i) => ({...newPlayer(p.name, i, i < PORTALS ? 'fig'+(i+1) : null),
      id:p.id, color:p.color, avatar:p.avatar ?? null, rp:p.rp|0, ep2:Math.round((+p.ep||0)*2)}));
    n.quests = n.players.filter(p => p.charId).map(p => newQuest(p.charId, p.id));
    n.log = (s.log||[]).slice();
    n.log.push({id:uid('e'), t:Date.now(), type:'system', pub:false, text:'Сохранение обновлено до схемы 2: игроки, очки, фигурки, коробки и раскладка сохранены; этапы, финал и магазин-заглушка сброшены; персонажи назначены по порядку'});
    n.migratedFrom = 1;
    return n;
  }
  return s;
}
// подстраховка для импортированных файлов той же схемы
function normalize(s){
  s.media ||= {}; s.log ||= []; s.actions ||= []; s.abilities ||= []; s.announcements ||= [];
  s.settings = Object.assign({reduceMotion:false}, s.settings);
  s.effects = Object.assign(freshEffects(), s.effects);
  s.effects.vouchers.forEach(v => { if(v.giver && !v.holder){ v.holder = v.giver; delete v.giver; } });
  // сохранения без стартовых порталов: берём текущий портал фигурки-персонажа
  s.players.forEach(p => { if(p.startPortal === undefined){ const b = p.charId && s.boxes.find(x => x.figureId === p.charId); p.startPortal = b ? s.portals.indexOf(b.id) + 1 || null : null; } });
  s.final = Object.assign(freshFinal(), s.final);
}

let state, ui, undoStack;
const IS_GUEST = /guest/.test(location.hash);
function load(){
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(LS.state)); } catch(e){ raw = null; }
  state = raw && raw.app === 'spiderverse-party' ? migrate(raw) : freshState();
  normalize(state);
  // старые демо-имена в подготовке заменяются на список участников
  if(state.phase === 'setup' && state.players.map(p => p.name).join() === OLD_DEMO_NAMES.join()) state.players.forEach((p, i) => { p.name = DEMO_NAMES[i]; });
  try { ui = JSON.parse(localStorage.getItem(LS.ui)) || {}; } catch(e){ ui = {}; }
  ui = Object.assign({screen:'dash', revealed:[], logType:'', logPlayer:'', figFilter:'all', finalTab:0, playerSort:'rank'}, ui);
  // режим хранится отдельно для каждого окна: окно гостей всегда в демонстрации
  let mode = null; try { mode = sessionStorage.getItem('sv-mode'); } catch(e){}
  ui.mode = IS_GUEST ? 'demo' : (mode || 'host');
  ui.sel = []; ui.warp = []; ui.anim = '';
  try { undoStack = JSON.parse(localStorage.getItem(LS.undo)) || []; } catch(e){ undoStack = []; }
  if(state.migratedFrom){ delete state.migratedFrom; undoStack = []; save(); setTimeout(() => toast('Сохранение обновлено до новой схемы данных (v2). Подробности — в журнале.', 'var(--yellow)'), 300); }
}
let saveWarned = false;
function save(){
  gcMedia();
  try { localStorage.setItem(LS.state, JSON.stringify(state)); saveWarned = false; }
  catch(e){ if(!saveWarned){ toast('Не удалось сохранить в браузере: хранилище переполнено. Уменьшите число фотографий или сделайте экспорт JSON.', 'var(--red)'); saveWarned = true; } }
  saveUndo(); saveUi();
}
function saveUi(){
  try { const {warp, sel, mode, anim, ...rest} = ui; localStorage.setItem(LS.ui, JSON.stringify(rest)); } catch(e){}
  try { if(!IS_GUEST) sessionStorage.setItem('sv-mode', ui.mode); } catch(e){}
}
function saveUndo(){ try { localStorage.setItem(LS.undo, JSON.stringify(undoStack)); } catch(e){ undoStack = undoStack.slice(-5); try{ localStorage.setItem(LS.undo, JSON.stringify(undoStack)); }catch(_){} } }
// удаляет изображения, на которые больше нигде не ссылаются (включая снимки отмены)
function gcMedia(){
  const live = JSON.stringify({...state, media:null}) + undoStack.map(u=>u.snap).join('');
  for(const id of Object.keys(state.media)) if(!live.includes('"'+id+'"')) delete state.media[id];
}
const snapshot = () => JSON.stringify({...state, media:undefined});
function restore(snap){ const media = state.media; state = JSON.parse(snap); state.media = media; normalize(state); }

/* Единая точка изменения состояния.
   Снимок для ручной отмены → mutate() → запись в журнал → сохранение.
   Если mutate() бросает GameError, все изменения откатываются. */
let busy = false;
function act(entry, mutate, opts = {}){
  if(busy) return false;
  busy = true;
  const undoItem = {label: opts.label || 'изменение', snap: snapshot()};
  const logLen = state.log.length;
  let extra;
  try {
    extra = mutate();
    syncSetupChars();
  } catch(err){
    // откатываем, только если mutate() успел что-то изменить (ссылки на объекты остаются валидными)
    if(snapshot() !== undoItem.snap) restore(undoItem.snap);
    busy = false;
    if(err instanceof GameError){ toast(err.message, 'var(--red)'); render(); return false; }
    throw err;
  }
  const e = typeof entry === 'function' ? entry(extra) : entry;
  if(e) addLog(e);
  const last = state.log[state.log.length-1];
  if(!opts.label && state.log.length > logLen) undoItem.label = last.text;
  undoStack.push(undoItem);
  if(undoStack.length > UNDO_LIMIT) undoStack.shift();
  save();
  busy = false;
  if(opts.render !== false) render();
  return true;
}
function addLog(e){
  const type = EVENT_TYPES[e.type] || {pub:false};
  state.log.push({id:uid('e'), t:Date.now(), type:e.type, text:e.text, secret:e.secret || '', playerId:e.playerId || null, pub: e.pub ?? type.pub});
}
// публичное объявление для экрана гостей (показывается один раз, не хранится как видимая таблица)
function announce(a){
  state.announcements.push({id:uid('an'), t:Date.now(), ...a});
  if(state.announcements.length > 25) state.announcements.splice(0, state.announcements.length - 25);
}
// ручной откат ведущего — не путать с игровой отменой способности
function undo(){
  const u = undoStack.pop();
  if(!u) return toast('Нечего отменять');
  restore(u.snap);
  addLog({type:'system', pub:false, text:'Ручной откат ведущего: ' + u.label});
  save(); render(); toast('Откат: ' + u.label, 'var(--yellow)');
}
