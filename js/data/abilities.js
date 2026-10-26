'use strict';
/* Магазин: 12 покупаемых способностей. Цена — в половинках EP (price: 6 = 3 EP).
   Поля:
   - fields   — цели, которые выбирает игрок (рисует ui/forms.js)
   - validate — проверка при объявлении и повторно при исполнении (строка ошибки или null)
   - execute  — эффект; вызывается только после закрытия окна реакции.
     Возвращает {logType, private[], host, publicText, announce, portals, anim, interactive}
   - limits   — perPlayer: раз на игрока за раунд; total: всего за раунд */
const SHOP_CATEGORIES = [
  {id:'recon',   name:'Разведка',     icon:'eye',    color:'#2ec5ff'},
  {id:'counter', name:'Контрдействие', icon:'shield', color:'#3dff9a'},
  {id:'move',    name:'Перемещения',  icon:'swap',   color:'#ff3ea5'},
];
const distinct = (arr, n, what='порталы') => (arr || []).filter(Boolean).length < n ? `Выберите ${what}` : new Set(arr.map(String)).size < n ? `${what[0].toUpperCase()+what.slice(1)} должны быть разными` : null;
const moveAnnounce = (title, text, portals, anim, pairs) => ({kind:'move', title, text, portals, anim, pairs});

const SHOP = [
  /* ---------- Разведка ---------- */
  {id:'search', cat:'recon', name:'Поиск аномалии', icon:'scan', price:6, cancelable:true,
    desc:'Выберите фигурку по имени — игрок приватно узнаёт номер её текущего портала.',
    fields:[{key:'fig', type:'figure', label:'Фигурка'}],
    validate: t => t.fig ? null : 'Выберите фигурку',
    execute(t){
      const s = searchByName(t.fig, true);
      return {logType:'info', private:[s.portal ? `«${figName(t.fig)}» — портал №${s.portal}` : `«${figName(t.fig)}» — ${UNRECOGNIZED.toLowerCase()}, местоположение не определено`], host:s.effect};
    }},
  {id:'double', cat:'recon', name:'Двойное сканирование', icon:'eye', price:4, cancelable:true,
    desc:'Выберите два разных портала — игрок приватно узнаёт находящиеся там фигурки.',
    fields:[{key:'portals', type:'portals', count:2, label:'Порталы'}],
    validate: t => distinct(t.portals, 2),
    execute(t){
      const obs = t.portals.map(n => [+n, observe(+n)]);
      return {logType:'info', private:obs.map(([n,o]) => `Портал №${n}: ${o.label}`), host:obs.filter(([,o])=>o.effect).map(([n,o])=>`№${n} — ${o.effect}`).join('; ')};
    }},
  {id:'radar', cat:'recon', name:'Радар батча', icon:'grid', price:2, cancelable:true, limits:{perPlayer:1},
    desc:'Выберите батч — игрок узнаёт две случайные фигурки в нём с номерами их порталов.',
    fields:[{key:'batch', type:'batch', label:'Батч'}],
    validate: t => t.batch === undefined || t.batch === '' ? 'Выберите батч' : null,
    execute(t){
      const ns = pickN(BATCHES[+t.batch].portals, 2).sort((a,b) => a-b);
      const obs = ns.map(n => [n, observe(n)]);
      return {logType:'info', random:{portals:ns}, private:obs.map(([n,o]) => `Портал №${n}: ${o.label}`), host:`Выпали порталы №${ns.join(' и №')}. ` + obs.filter(([,o])=>o.effect).map(([n,o])=>`№${n} — ${o.effect}`).join('; ')};
    }},
  {id:'expose', cat:'recon', name:'Публичное разоблачение', icon:'eye', price:2, cancelable:true, limits:{perPlayer:1},
    desc:'Содержимое выбранного портала объявляется всем один раз. Постоянной метки не остаётся — запоминайте!',
    fields:[{key:'portal', type:'portal', label:'Портал'}],
    validate: t => t.portal ? null : 'Выберите портал',
    execute(t){
      const n = +t.portal, o = observe(n);
      return {logType:'info', pub:true, publicText:`Портал №${n} публично разоблачён (результат показан гостям один раз)`, host:`Объявлено: «${o.label}»` + (o.effect ? ` · ${o.effect}` : ''),
        announce:{kind:'expose', title:`Портал №${n}`, text:o.label, portals:[n]}, portals:[n], anim:'expose'};
    }},
  {id:'gambler', cat:'recon', name:'Азартный игрок', icon:'star', price:2, cancelable:true,
    desc:'Игрок приватно называет пары «портал — фигурка». Пока угадывает — продолжает бесплатно, первая ошибка завершает серию. Проверка по реальному расположению.',
    fields:[],
    execute: () => ({logType:'info', interactive:'gambler', claims:[], host:'Серия начата (маскировки игнорируются)'})},
  {id:'acrobat', cat:'recon', name:'Акробат', icon:'list', price:2, cancelable:true,
    desc:'До пяти объективно проверяемых утверждений о расположении. Сообщается только число верных. Проверка по реальному расположению.',
    fields:[{key:'st', type:'statements', max:5, label:'Утверждения'}],
    validate: t => (t.st || []).filter(statementComplete).length ? null : 'Добавьте хотя бы одно полное утверждение',
    execute(t){
      const list = (t.st || []).filter(statementComplete);
      const res = list.map(s => [s, evalStatement(s)]);
      const k = res.filter(([,v]) => v).length;
      return {logType:'info', private:[`Верных утверждений: ${k} из ${list.length}`], host:res.map(([s,v]) => `${v?'✓':'✗'} ${statementText(s)}`).join('; ')};
    }},

  /* ---------- Контрдействие ---------- */
  {id:'glitch', cat:'counter', name:'Сбой канона', icon:'shield', price:6, reactionOnly:true,
    desc:'Отменяет чужую покупную способность в окне реакции, до выполнения её эффекта. Покупается прямо в окне реакции.'},

  /* ---------- Перемещения ---------- */
  {id:'swap', cat:'move', name:'Обмен вселенными', icon:'swap', price:6, cancelable:true,
    desc:'Поменять содержимое двух выбранных порталов.',
    fields:[{key:'portals', type:'portals', count:2, free:true, label:'Порталы'}],
    validate: t => distinct(t.portals, 2) || (requireFree(t.portals.map(Number)), null),
    execute(t){
      const [a, b] = t.portals.map(Number);
      swapPortals(a, b);
      return {logType:'move', publicText:`Обмен вселенными: №${a} ⇄ №${b}`, host:`${figAt(b).name} ⇄ ${figAt(a).name}`,
        announce:moveAnnounce('Обмен вселенными', `№${a} ⇄ №${b}`, [a,b], 'swap', [[a,b]]), portals:[a,b], anim:'swap'};
    }},
  {id:'shift', cat:'move', name:'Сдвиг реальности', icon:'cycle', price:8, cancelable:true,
    desc:'Циклически сдвинуть фигурки по всем порталам на выбранное число позиций. Защищённые Киборгом порталы пропускаются и остаются на месте.',
    fields:[{key:'steps', type:'number', min:1, max:10, label:'На сколько позиций'}, {key:'dir', type:'direction', label:'Направление'}],
    validate: t => !(+t.steps >= 1 && +t.steps <= 10) ? 'Укажите сдвиг от 1 до 10' : !t.dir ? 'Выберите направление' : null,
    execute(t){
      const k = +t.steps, dir = t.dir === 'back' ? -1 : 1;
      const prot = ALL_PORTALS.filter(isProtected);
      const free = shiftFree(k, dir);
      const txt = `Сдвиг реальности: на ${k} ${plural(k,'позицию','позиции','позиций')} ${dir>0?'вперёд':'назад'}` + (prot.length ? `; на месте остались защищённые №${prot.join(', №')}` : '');
      return {logType:'move', publicText:txt, host:'Новая раскладка: ' + layoutText(), announce:moveAnnounce('Сдвиг реальности', txt, free, 'shift'), portals:free, anim:'shift'};
    }},
  {id:'even', cat:'move', name:'Чётный сбой', icon:'swap', price:8, cancelable:true,
    desc:'Обменять пары 1↔2, 3↔4, 5↔6, 7↔8, 9↔10. Портал 11 не меняется. Пара с защищённым порталом пропускается целиком.',
    fields:[],
    execute(){
      const {done, skipped} = evenGlitch();
      const txt = `Чётный сбой: ${done.map(([a,b]) => `№${a}⇄№${b}`).join(', ') || 'ни одна пара не сдвинулась'}` + (skipped.length ? `; пропущены защищённые пары ${skipped.map(([a,b]) => `${a}–${b}`).join(', ')}` : '');
      const ps = done.flat();
      return {logType:'move', publicText:txt, host:'Новая раскладка: ' + layoutText(), announce:moveAnnounce('Чётный сбой', txt, ps, 'swap', done), portals:ps, anim:'swap'};
    }},
  {id:'quantum', cat:'move', name:'Квантовая нестабильность', icon:'star', price:6, cancelable:true, limits:{total:2},
    desc:'Случайно перемешать содержимое трёх выбранных порталов. Не более двух покупок всеми игроками за раунд.',
    fields:[{key:'portals', type:'portals', count:3, free:true, label:'Порталы'}],
    validate: t => distinct(t.portals, 3) || (requireFree(t.portals.map(Number)), null),
    execute(t){
      const ns = t.portals.map(Number).sort((a,b) => a-b);
      const perm = shuffleFree(ns);
      const moves = permPairs(ns, perm);
      return {logType:'move', random:{perm}, publicText:`Квантовая нестабильность: перемешаны №${ns.join(', №')}`, host:`Выпало: ${flowText(moves) || 'расклад не изменился'}`,
        announce:moveAnnounce('Квантовая нестабильность', `Перемешаны порталы №${ns.join(', №')}`, ns, 'shuffle'), portals:ns, anim:'shuffle'};
    }},
  {id:'inter', cat:'move', name:'Межпространственный обмен', icon:'cycle', price:8, cancelable:true,
    desc:'Выберите батч и две позиции в нём — они обмениваются с двумя случайными позициями за пределами батча.',
    fields:[{key:'batch', type:'batch', label:'Батч'}, {key:'portals', type:'portals', count:2, free:true, inBatch:'batch', label:'Позиции внутри батча'}],
    validate(t){
      if(t.batch === undefined || t.batch === '') return 'Выберите батч';
      const e = distinct(t.portals, 2); if(e) return e;
      const b = BATCHES[+t.batch], ns = t.portals.map(Number);
      if(ns.some(n => !b.portals.includes(n))) return 'Обе позиции должны быть внутри выбранного батча';
      requireFree(ns);
      if(freePortals(ALL_PORTALS.filter(n => !b.portals.includes(n))).length < 2) return 'Вне батча меньше двух незащищённых позиций';
      return null;
    },
    execute(t){
      const b = BATCHES[+t.batch], ins = t.portals.map(Number);
      const outs = pickN(freePortals(ALL_PORTALS.filter(n => !b.portals.includes(n))), 2);
      ins.forEach((n, i) => swapPortals(n, outs[i]));
      const pairs = ins.map((n, i) => [n, outs[i]]);
      const txt = `Межпространственный обмен: ${pairs.map(([a,c]) => `№${a} ⇄ №${c}`).join(', ')}`;
      return {logType:'move', random:{outs}, publicText:txt, host:'Новая раскладка: ' + layoutText(), announce:moveAnnounce('Межпространственный обмен', txt, pairs.flat(), 'swap', pairs), portals:pairs.flat(), anim:'swap'};
    }},
];
