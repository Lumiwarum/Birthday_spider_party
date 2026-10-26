'use strict';
/* Личные квесты. Правило: способность «идёт за квестом» —
   выполнивший квест получает +3 RP, +3 EP и способность персонажа, которому квест принадлежал изначально.
   Исключение — квест, взятый Майлзом: +2 RP, +2 EP, «Невидимость» и способность владельца квеста. */
const questText = q => F(q.origin)?.quest || '';
const questTitle = q => `Квест ${figName(q.origin).split(' ')[0]}` + (q.extra ? ' (выдан взамен украденного)' : '');

function unlockAbility(q, fig = q.origin){
  const u = UNIQUE_BY_FIG[fig]; if(!u) return null;
  const inst = {id:uid('u'), type:u.id, owner:q.holder, questId:q.id, uses:0, charges:u.charges || 0, data:{}, t:Date.now()};
  if(u.id === 'tea') inst.data.drinkers = [];
  if(u.id === 'mayday') inst.data = {baby:null, used:{owner:null, baby:null}};
  state.abilities.push(inst);
  return inst;
}
function completeQuest(q, note){
  if(q.status === 'done') fail('Квест уже выполнен');
  const p = P(q.holder);
  q.status = 'done';
  q.history.push({t:Date.now(), text: note || 'Выполнен'});
  const reward = q.takenByMiles ? MILES_REWARD : QUEST_REWARD;
  p.rp += reward.rp; p.ep2 += reward.ep2;
  const names = [unlockAbility(q), q.takenByMiles ? unlockAbility(q, MILES) : null].filter(Boolean).map(i => `«${ABILITY[i.type].name}»`);
  addLog({type:'quest', playerId:p.id, pub:false, text:`${p.name}: личный квест выполнен — +${reward.rp} RP, +${fmtEP(reward.ep2)} EP${names.length ? `, ${names.length > 1 ? 'открыты способности' : 'открыта способность'} ${names.join(' и ')}` : ''}`, secret:`${questTitle(q)}: ${questText(q)}`});
}

/* Майлз: забирает незавершённый квест (его собственный квест закрывается без награды),
   жертва сразу получает +1 EP и квест Бродяги */
function milesSteal(milesQuestId, victimId){
  const mq = Q(milesQuestId), miles = P(mq.holder), victim = P(victimId);
  if(!mq || mq.origin !== MILES || mq.status !== 'open') fail('Нет незавершённого квеста Майлза');
  if(!victim || victim.id === miles.id) fail('Выберите другого участника');
  const vq = openQuestOf(victim.id);
  if(!vq) fail(`У ${victim.name} нет незавершённого квеста`);
  vq.holder = miles.id; vq.takenByMiles = true;
  vq.history.push({t:Date.now(), text:`Украден: ${victim.name} → ${miles.name}`});
  victim.ep2 += MILES_VICTIM_EP2;
  const pq = newQuest(PROWLER, victim.id, `Выдан взамен квеста, украденного игроком ${miles.name}`);
  pq.extra = true;
  state.quests.push(pq);
  mq.status = 'done'; mq.closedBySteal = true;
  mq.history.push({t:Date.now(), text:`Закрыт кражей квеста у ${victim.name} (без награды)`});
  addLog({type:'quest', pub:false, playerId:miles.id, text:`${miles.name} крадёт квест у ${victim.name}; ${victim.name} получает квест Бродяги и +${fmtEP(MILES_VICTIM_EP2)} EP`, secret:`Украден: ${questTitle(vq)} — ${questText(vq)}`});
}

/* «Утечка данных»: квест, фигурка и способность по каждому персонажу — без сведений о том, кто что выполнил */
const leakTable = () => state.figures.map(f => ({fig:f, quest:f.quest, ability:UNIQUE_BY_FIG[f.id]}));
function leakHtml(){
  const abs = src => src.startsWith('data:') ? src : new URL(src, location.href).href;
  const rows = leakTable().map(r => `<tr style="--c:${esc(r.fig.color)}"><td><div class="fig"><img src="${abs(figSrc(r.fig))}" alt=""><div><b>${esc(r.fig.name)}</b><span>${esc(r.fig.nameEn)}</span></div></div></td>
    <td class="q">${esc(r.quest)}</td><td class="ab"><b>${esc(r.ability.name)}</b><span>${esc(r.ability.desc)}</span></td></tr>`).join('');
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Утечка данных</title>
<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@700;900&family=Manrope:wght@500;700;800&display=swap" rel="stylesheet">
<style>
body{margin:0;background:#07040f;color:#f6efff;font:16px/1.45 'Manrope',system-ui,sans-serif;background-image:radial-gradient(900px 500px at 10% -10%,rgba(0,187,249,.3),transparent 60%),radial-gradient(900px 600px at 110% 20%,rgba(255,62,165,.25),transparent 60%);min-height:100vh}
.wrap{max-width:1200px;margin:0 auto;padding:32px 20px 60px}
.k{display:inline-block;background:#00bbf9;color:#001018;font:800 12px 'Manrope';letter-spacing:.2em;text-transform:uppercase;padding:5px 12px;transform:skew(-12deg);box-shadow:3px 3px 0 #000}
h1{font:900 clamp(34px,6vw,64px)/1 'Unbounded','Arial Black',sans-serif;text-transform:uppercase;margin:14px 0 6px;text-shadow:4px 4px 0 #000,-2px 0 #00bbf9,2px 0 #ff2e4d}
p.sub{color:#a99bc8;margin:0 0 24px}
table{width:100%;border-collapse:separate;border-spacing:0 10px}
th{text-align:left;font:800 12px 'Manrope';letter-spacing:.12em;text-transform:uppercase;color:#a99bc8;padding:0 14px}
td{background:linear-gradient(160deg,#1c1138,#0c0719);padding:14px;vertical-align:middle;border-top:2px solid #2c1f4f;border-bottom:2px solid #2c1f4f}
td:first-child{border-left:5px solid var(--c);border-radius:12px 0 0 12px}
td:last-child{border-right:2px solid #2c1f4f;border-radius:0 12px 12px 0}
.fig{display:flex;align-items:center;gap:14px;min-width:240px}
.fig img{width:64px;height:64px;border-radius:14px;object-fit:cover;border:2px solid var(--c);background:radial-gradient(circle at 50% 35%,var(--c),#0b0618 75%)}
.fig b{display:block;font:900 15px 'Unbounded',sans-serif}
.fig span,.ab span{display:block;color:#a99bc8;font-size:13px}
.q{font-weight:700;font-size:17px}
.ab b{color:var(--c);font:900 14px 'Unbounded',sans-serif}
@media(max-width:760px){table,tbody,tr,td{display:block}thead{display:none}td{border-radius:0!important;border-left:5px solid var(--c)!important}td:first-child{border-radius:12px 12px 0 0!important}td:last-child{border-radius:0 0 12px 12px!important;margin-bottom:10px}}
</style></head><body><div class="wrap"><span class="k">Утечка данных · Спайдер-Байт</span><h1>Все личные квесты</h1>
<p class="sub">За каждый выполненный квест: +${QUEST_REWARD.rp} RP, +${fmtEP(QUEST_REWARD.ep2)} EP и способность персонажа.</p>
<table><thead><tr><th>Фигурка</th><th>Квест</th><th>Способность</th></tr></thead><tbody>${rows}</tbody></table></div></body></html>`;
}
function openLeakTab(){
  const w = window.open('', '_blank');
  if(!w) return toast('Браузер заблокировал новую вкладку — разрешите всплывающие окна', 'var(--red)');
  w.document.open(); w.document.write(leakHtml()); w.document.close();
}
