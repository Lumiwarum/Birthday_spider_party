'use strict';
/* Информационная система.
   Реальное расположение не меняется маскировками; они влияют только на «обычное распознавание».
   effect — пояснение для ведущего, какой эффект повлиял на ответ (игрок его не видит). */
const UNRECOGNIZED = 'Не распознано';

// обычное распознавание содержимого портала (сканирования, радар, публичное разоблачение)
function observe(n){
  const f = figAt(n);
  if(state.effects.invisible.includes(f.id))
    return {label:UNRECOGNIZED, real:f.id, effect:`Невидимость Майлза: на самом деле ${f.name}`};
  const d = state.effects.disguises.find(x => x.figId === f.id);
  if(d) return {label:figName(d.fakeId), real:f.id, effect:`Ложное полнолуние: на самом деле ${f.name}`};
  return {label:f.name, real:f.id, effect:''};
}

// поиск по имени («Поиск аномалии»). commit=true расходует одноразовую подмену Оборотня
function searchByName(fid, commit){
  if(state.effects.invisible.includes(fid))
    return {portal:0, effect:`Невидимость Майлза: реально в портале №${portalOfFig(fid)}`};
  const d = state.effects.disguises.find(x => x.figId === fid && !x.searchSpoofUsed);
  if(d){
    const n = portalOfFig(d.fakeId);
    if(commit) d.searchSpoofUsed = true;
    return {portal:n, effect:`Ложное полнолуние: одноразовая подмена поиска — показан портал «${figName(d.fakeId)}», реально №${portalOfFig(fid)}`};
  }
  return {portal:portalOfFig(fid), effect:''};
}

/* Утверждения «Акробата» — всегда по реальному расположению */
const STATEMENT_TYPES = {
  in:        'Фигурка в портале',
  notin:     'Фигурки нет в портале',
  inbatch:   'Фигурка в батче',
  notinbatch:'Фигурки нет в батче',
  same:      'Две фигурки в одном батче',
  manual:    'Своя формулировка (проверяет ведущий)',
};
function statementText(s){
  const fb = n => BATCHES[n] ? batchName(BATCHES[n]) : '?';
  switch(s.type){
    case 'in':         return `«${figName(s.fig)}» в портале №${s.portal}`;
    case 'notin':      return `«${figName(s.fig)}» не в портале №${s.portal}`;
    case 'inbatch':    return `«${figName(s.fig)}» в ${fb(s.batch)}`;
    case 'notinbatch': return `«${figName(s.fig)}» не в ${fb(s.batch)}`;
    case 'same':       return `«${figName(s.fig)}» и «${figName(s.fig2)}» в одном батче`;
    case 'manual':     return s.text || '(пусто)';
  }
  return '?';
}
function statementComplete(s){
  if(!s || !s.type) return false;
  if(s.type === 'manual') return !!(s.text || '').trim();
  if(!s.fig) return false;
  if(s.type === 'in' || s.type === 'notin') return !!s.portal;
  if(s.type === 'inbatch' || s.type === 'notinbatch') return s.batch !== undefined && s.batch !== '';
  if(s.type === 'same') return !!s.fig2 && s.fig2 !== s.fig;
  return false;
}
function evalStatement(s){
  const at = fid => portalOfFig(fid);
  switch(s.type){
    case 'in':         return at(s.fig) === +s.portal;
    case 'notin':      return at(s.fig) !== +s.portal;
    case 'inbatch':    return batchOf(at(s.fig)).id === +s.batch;
    case 'notinbatch': return batchOf(at(s.fig)).id !== +s.batch;
    case 'same':       return batchOf(at(s.fig)).id === batchOf(at(s.fig2)).id;
    case 'manual':     return !!s.truth;
  }
  return false;
}
