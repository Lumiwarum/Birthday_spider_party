'use strict';
/* Перемещения. Меняется только содержимое порталов (state.portals хранит id коробок),
   поэтому фигурка всегда едет вместе со своей коробкой и не может задвоиться. */
function requireFree(list){
  const p = list.filter(isProtected);
  if(p.length) fail(`Портал №${p.join(', №')} защищён Киборгом — его содержимое нельзя перемещать`);
}
function swapPortals(a, b){
  const p = state.portals; [p[a-1], p[b-1]] = [p[b-1], p[a-1]];
}
// perm[i] — индекс в nums, чьё содержимое попадёт в nums[i]
function applyPerm(nums, perm){
  const c = nums.map(n => state.portals[n-1]);
  nums.forEach((n, i) => { state.portals[n-1] = c[perm[i]]; });
}
// циклический сдвиг по незащищённым порталам; dir = 1 вперёд (№1 → №2), −1 назад
function shiftFree(steps, dir){
  const free = freePortals(ALL_PORTALS), m = free.length;
  if(m < 2) return free;
  const s = (((dir * steps) % m) + m) % m;
  const c = free.map(n => state.portals[n-1]);
  free.forEach((n, i) => { state.portals[free[(i + s) % m] - 1] = c[i]; });
  return free;
}
const EVEN_PAIRS = [[1,2],[3,4],[5,6],[7,8],[9,10]];
function evenGlitch(){
  const done = [], skipped = [];
  for(const [a, b] of EVEN_PAIRS){
    if(isProtected(a) || isProtected(b)) skipped.push([a, b]);
    else { swapPortals(a, b); done.push([a, b]); }
  }
  return {done, skipped};
}
// перемешивание содержимого списка порталов (все перестановки равновероятны); возвращает выпавшую перестановку
function shuffleFree(nums){
  const perm = randomPerm(nums.length);
  applyPerm(nums, perm);
  return perm;
}
const permPairs = (nums, perm) => nums.map((n, i) => [nums[perm[i]], n]).filter(([a, b]) => a !== b);
// текст перемещения для журнала ведущего: «№3 → №7 (Гвен Стейси)»
const flowText = moves => moves.map(([from, to]) => `№${from} → №${to}`).join(', ');
const layoutText = () => ALL_PORTALS.map(n => `№${n}: ${figAt(n).name}`).join('; ');
