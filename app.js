const KEY="financeQuest_v4_1";
const DEFAULT={balance:0,savings:0,savingsGoal:0,deferred:0,bills:[],credits:[],expenses:[],incomes:[],completedCredits:[],settings:{overdraft:100,salaryEuropcar:0,salaryDominos:0,ticketsRestaurant:0,monthProgressKey:""}};
let state=load(), viewMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1), chartMode="freedom";

function clone(x){return JSON.parse(JSON.stringify(x))}
function load(){try{const x=localStorage.getItem(KEY);return x?merge(clone(DEFAULT),JSON.parse(x)):clone(DEFAULT)}catch{return clone(DEFAULT)}}
function merge(a,b){return {...a,...b,settings:{...a.settings,...(b.settings||{})},bills:b.bills||[],credits:b.credits||[],expenses:b.expenses||[],incomes:b.incomes||[],completedCredits:b.completedCredits||[]}}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function $(id){return document.getElementById(id)}
function num(v){return Number(String(v??0).replace(",","."))||0}
function money(v){return num(v).toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})+" €"}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function iso(d){const x=d instanceof Date?d:new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`}
function uid(p){return p+"_"+Date.now()+"_"+Math.random().toString(36).slice(2,7)}
const MONTHS=["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
function monthLabel(d){return MONTHS[d.getMonth()]+" "+d.getFullYear()}

function activeCredits(){return state.credits.filter(c=>num(c.remaining)>0)}
function monthlyCredits(){return activeCredits().reduce((s,c)=>s+num(c.monthly),0)}
function debtRemaining(){return activeCredits().reduce((s,c)=>s+num(c.monthly)*num(c.remaining),0)}
function recurringBills(){return state.bills.filter(b=>b.active!==false).reduce((s,b)=>s+num(b.amount),0)}
function recurringIncome(){return state.incomes.filter(i=>i.type==="recurrent").reduce((s,i)=>s+num(i.amount),0)}
function pendingIncome(){return state.incomes.filter(i=>!i.received).reduce((s,i)=>s+num(i.amount),0)}
function monthExpenses(){const n=new Date();return state.expenses.filter(e=>{const d=new Date(e.date);return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear()}).reduce((s,e)=>s+num(e.amount),0)}
function monthDeferred(){const n=new Date();return state.expenses.filter(e=>e.payment==="deferred"&&new Date(e.date).getMonth()===n.getMonth()&&new Date(e.date).getFullYear()===n.getFullYear()).reduce((s,e)=>s+num(e.amount),0)}
function forecast(){return num(state.balance)+pendingIncome()+recurringIncome()-recurringBills()-monthlyCredits()-monthDeferred()-monthExpenses()}
function freedom(){const inc=Math.max(1,recurringIncome());const margin=Math.max(0,inc-recurringBills()-monthlyCredits());const creditScore=Math.max(0,1-monthlyCredits()/inc);const savingsScore=Math.min(1,state.savings/Math.max(1,inc*6));return Math.round((margin/inc)*45+creditScore*35+savingsScore*20)}

function setup(){
document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>show(b.dataset.screen));
$("settingsBtn").onclick=settingsModal;$("simulateBtn").onclick=simulation;$("prevMonth").onclick=()=>{viewMonth=new Date(viewMonth.getFullYear(),viewMonth.getMonth()-1,1);renderCalendar()};$("nextMonth").onclick=()=>{viewMonth=new Date(viewMonth.getFullYear(),viewMonth.getMonth()+1,1);renderCalendar()};$("todayBtn").onclick=()=>{viewMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);renderCalendar()};$("addCreditBtn").onclick=()=>openDay(iso(new Date()),true);$("modalClose").onclick=closeModal;$("modal").onclick=e=>{if(e.target===$("modal"))closeModal()};document.querySelectorAll(".view-tab").forEach(b=>b.onclick=()=>{chartMode=b.dataset.view;renderEvolution()});renderAll();applyMonthlyProgress()
}
function show(id){document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));$(id)?.classList.add("active");document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.screen===id));if(id==="calendarScreen")renderCalendar();if(id==="creditsScreen")renderCredits();if(id==="evolutionScreen")renderEvolution()}
function openModal(title,body){$("modalTitle").textContent=title;$("modalBody").innerHTML=body;$("modal").classList.remove("hidden")}
function closeModal(){$("modal").classList.add("hidden");$("modalBody").innerHTML=""}

function renderHome(){
$("currentBalance").textContent=money(state.balance);$("monthForecast").textContent=money(forecast());$("deferredTotal").textContent=money(state.deferred);$("incomePending").textContent=money(pendingIncome());$("billsPending").textContent=money(recurringBills()+monthlyCredits());$("monthExpenses").textContent=money(monthExpenses());$("monthIncome").textContent=money(recurringIncome()+state.incomes.filter(i=>i.type==="oneoff"&&i.received).reduce((s,i)=>s+num(i.amount),0));$("creditMonthlyTotal").textContent=money(monthlyCredits());$("savingsTotal").textContent=money(state.savings);
const f=freedom();$("freedomIndex").textContent=f+" %";$("freedomText").textContent=f<35?"Situation à consolider.":f<60?"Trajectoire encourageante.":"Bonne progression.";$("projectionMini").innerHTML=projection(3).map(r=>`<div class="projection-row"><span>${esc(r.label)}</span><strong>${money(r.savings)}</strong><span>${money(r.credits)}/mois</span></div>`).join("");$("alertBox").innerHTML=forecast()<0?`<div class="panel sim-negative">🔴 Prévision négative : ${money(forecast())}</div>`:forecast()<100?`<div class="panel">🟠 Marge faible : ${money(forecast())}</div>`:`<div class="panel sim-positive">🟢 Prévision positive : ${money(forecast())}</div>`
}

function dayEvents(date){
const k=iso(date),day=date.getDate(),events=[];
state.incomes.forEach(i=>{if(i.type==="oneoff"&&i.date===k)events.push({type:"income",text:"💰 +"+money(i.amount),name:i.label});if(i.type==="recurrent"&&num(i.day)===day)events.push({type:"income",text:"💰 +"+money(i.amount),name:i.label})});
state.expenses.forEach(e=>{if(e.date===k)events.push({type:e.payment==="deferred"?"deferred":"expense",text:(e.payment==="deferred"?"💳 ":"🛒 ")+money(e.amount),name:e.category})});
state.bills.forEach(b=>{if(num(b.day)===day&&b.active!==false)events.push({type:"credit",text:"🔄 "+b.name+" -"+money(b.amount),name:b.name})});
state.credits.forEach(c=>{const start=c.startDate?new Date(c.startDate+"T12:00:00"):null;const end=c.endDate?new Date(c.endDate+"T12:00:00"):creditEndDate(c);if(num(c.day||5)===day&&num(c.remaining)>0&&(!start||date>=start)&&date<=end)events.push({type:"credit",text:"🏦 "+c.name+" -"+money(c.monthly),name:c.name})});
return events
}
function creditEndDate(c){const start=new Date((c.startDate||iso(new Date()))+"T12:00:00");return new Date(start.getFullYear(),start.getMonth()+num(c.totalMonths||c.remaining),start.getDate())}
function renderCalendar(){
const y=viewMonth.getFullYear(),m=viewMonth.getMonth(),first=new Date(y,m,1),last=new Date(y,m+1,0),offset=(first.getDay()+6)%7;$("calendarTitle").textContent=monthLabel(viewMonth);let html="";
for(let i=0;i<offset;i++)html+=`<div class="calendar-blank"></div>`;
for(let d=1;d<=last.getDate();d++){const date=new Date(y,m,d),today=iso(date)===iso(new Date()),ev=dayEvents(date);html+=`<button class="calendar-day ${today?"today":""}" data-date="${iso(date)}"><span class="calendar-day-number">${d}</span>${ev.slice(0,5).map(e=>`<span class="event event-${e.type}">${e.text}</span>`).join("")}</button>`}
$("calendarGrid").innerHTML=html;document.querySelectorAll("[data-date]").forEach(b=>b.onclick=()=>openDay(b.dataset.date,false))
}
function openDay(dateKey,fromCredits=false){
const date=new Date(dateKey+"T12:00:00"),events=dayEvents(date);
let eventHtml="";
if(events.length){
  eventHtml=events.map(e=>"<p>"+e.text+"</p>").join("");
}else{
  eventHtml="<p class=\"muted\">Aucune opération.</p>";
}
const extra=fromCredits?"<p class=\"muted\">Tu peux créer ton crédit depuis cette date.</p>":"";
const body="<button class=\"primary\" id=\"newOperation\">＋ Nouvelle opération</button><div class=\"panel\">"+eventHtml+"</div>"+extra;
openModal("📅 "+date.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"}),body);
$("newOperation").onclick=()=>openOperation(dateKey);
}
function openOperation(defaultDate){
openModal("➕ Nouvelle opération",`<div class="choice-grid"><button class="choice-btn" data-op="expense">💳 Dépense</button><button class="choice-btn" data-op="income">💰 Revenu</button><button class="choice-btn" data-op="credit">🏦 Paiement fractionné</button><button class="choice-btn" data-op="bill">🔄 Prélèvement récurrent</button></div><div id="opForm" class="panel muted">Choisis un type.</div>`);
document.querySelectorAll("[data-op]").forEach(b=>b.onclick=()=>renderOperationForm(b.dataset.op,defaultDate))
}
function renderOperationForm(type,date){
const box=$("opForm");
if(type==="expense"){
box.innerHTML=`<div class="form-group"><label>Montant (€)</label><input id="oa" type="number" step="0.01"></div><div class="form-group"><label>Nature</label><select id="on"><option>Alimentation</option><option>Carburant</option><option>Loisirs</option><option>Parfums</option><option>Sport</option><option>Maison</option><option>Transport</option><option>Divers</option></select></div><div class="form-group"><label>Mode de paiement</label><select id="op"><option value="deferred">💳 Carte — débit différé</option><option value="instant">💳 Carte — débit immédiat</option><option value="cash">💵 Espèces</option><option value="transfer">🏦 Virement</option></select></div><button class="primary" id="saveOp">Enregistrer</button>`;
$("saveOp").onclick=()=>{const amount=num($("oa").value),payment=$("op").value;if(amount<=0)return alert("Montant invalide.");const exp={id:uid("exp"),date,amount,category:$("on").value,payment};state.expenses.push(exp);if(payment==="deferred")state.deferred+=amount;else state.balance-=amount;save();closeModal();renderAll()}
}
if(type==="income"){
box.innerHTML=`<div class="form-group"><label>Origine</label><input id="ol" placeholder="Vente, espèces déposées..."></div><div class="form-group"><label>Montant (€)</label><input id="oa" type="number" step="0.01"></div><button class="primary" id="saveOp">Enregistrer</button>`;
$("saveOp").onclick=()=>{const amount=num($("oa").value);if(amount<=0)return alert("Montant invalide.");state.incomes.push({id:uid("inc"),label:$("ol").value.trim()||"Revenu",amount,date,type:"oneoff",received:true});state.balance+=amount;save();closeModal();renderAll()}
}
if(type==="credit"){
box.innerHTML=`<div class="form-group"><label>Organisme / nom</label><input id="cl" placeholder="PayPal..."></div><div class="form-group"><label>Mensualité (€)</label><input id="cm" type="number" step="0.01"></div><div class="form-group"><label>Nombre de mensualités</label><input id="cr" type="number" min="1" value="4"></div><button class="primary" id="saveOp">Créer le crédit</button>`;
$("saveOp").onclick=()=>{const monthly=num($("cm").value),months=Math.max(1,Math.round(num($("cr").value)));if(monthly<=0)return alert("Mensualité invalide.");const d=new Date(date+"T12:00:00");const end=new Date(d.getFullYear(),d.getMonth()+months-1,d.getDate());state.credits.push({id:uid("credit"),name:$("cl").value.trim()||"Nouveau crédit",monthly,remaining:months,totalMonths:months,day:d.getDate(),startDate:date,endDate:iso(end)});save();closeModal();renderAll()}
}
if(type==="bill"){
box.innerHTML=`<div class="form-group"><label>Nom</label><input id="bl" placeholder="Loyer, Spotify..."></div><div class="form-group"><label>Montant (€)</label><input id="ba" type="number" step="0.01"></div><div class="form-group"><label>Jour du mois</label><input id="bd" type="number" min="1" max="31" value="${new Date(date+"T12:00:00").getDate()}"></div><button class="primary" id="saveOp">Créer le prélèvement</button>`;
$("saveOp").onclick=()=>{const amount=num($("ba").value);if(amount<=0)return alert("Montant invalide.");state.bills.push({id:uid("bill"),name:$("bl").value.trim()||"Prélèvement",amount,day:Math.min(31,Math.max(1,Math.round(num($("bd").value)))),active:true});save();closeModal();renderAll()}
}
}

function renderCredits(){
$("creditsMonthlySummary").textContent=money(monthlyCredits());$("debtSummary").textContent=money(debtRemaining());$("activeCreditCount").textContent=activeCredits().length;$("completedCreditCount").textContent=state.completedCredits.length;
$("creditList").innerHTML=activeCredits().length?activeCredits().map(c=>`<div class="credit-row"><div><h3>${esc(c.name)}</h3><div class="muted">${c.remaining} / ${c.totalMonths||c.remaining} mensualités restantes · départ ${c.startDate||"—"}</div></div><div class="credit-right"><strong>${money(c.monthly)}</strong><span class="muted">/mois</span><br><button class="danger" data-del="${c.id}">Supprimer</button></div></div>`).join(""):`<div class="panel">Aucun crédit actif.</div>`;
document.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{if(confirm("Supprimer ce crédit ?")){state.credits=state.credits.filter(c=>c.id!==b.dataset.del);save();renderAll()}});
$("completedCreditList").innerHTML=state.completedCredits.length?`<div class="panel"><div class="panel-title">🏆 Historique</div>${state.completedCredits.map(c=>`<p>🎉 ${esc(c.name)} — terminé le ${esc(c.date)}</p>`).join("")}</div>`:"";
}

function applyMonthlyProgress(){
const d=new Date();const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;if(state.settings.monthProgressKey===key)return;
const day=d.getDate();
state.credits.forEach(c=>{if(c.remaining>0&&day>=(c.day||5)){c.remaining=Math.max(0,c.remaining-1);if(c.remaining===0)state.completedCredits.push({name:c.name,date:iso(d)})}});
state.settings.monthProgressKey=key;save();
}

function projection(months){
let credits=state.credits.map(c=>({...c})),s=state.savings,rows=[];
for(let i=0;i<months;i++){const d=new Date(new Date().getFullYear(),new Date().getMonth()+i,1);const cm=credits.reduce((a,c)=>a+(c.remaining>0?num(c.monthly):0),0);const free=Math.max(0,recurringIncome()-recurringBills()-cm);s+=free;rows.push({label:monthLabel(d),savings:s,credits:cm,freedom:projectedFreedom(s,cm)});credits.forEach(c=>{if(c.remaining>0)c.remaining--})}
return rows;
}
function projectedFreedom(s,c){const income=Math.max(1,recurringIncome());const margin=Math.max(0,income-c);return Math.round((margin/income)*60+Math.min(1,s/Math.max(1,income*6))*40)}
function renderEvolution(){drawChart();$("projectionTable").innerHTML=projection(12).map(r=>`<div class="projection-row"><span>${esc(r.label)}</span><strong>${money(r.savings)}</strong><span>${money(r.credits)}/mois</span></div>`).join("");document.querySelectorAll(".view-tab").forEach(b=>b.classList.toggle("active",b.dataset.view===chartMode))}
function drawChart(){const c=$("evolutionChart");if(!c)return;const r=c.getBoundingClientRect(),dpr=devicePixelRatio||1;c.width=r.width*dpr;c.height=r.height*dpr;const x=c.getContext("2d");x.scale(dpr,dpr);const rows=projection(24),vals=rows.map(z=>chartMode==="credits"?z.credits:chartMode==="savings"?z.savings:z.freedom),max=Math.max(...vals,1),w=r.width,h=r.height,p=30;x.clearRect(0,0,w,h);x.strokeStyle="rgba(148,163,184,.15)";for(let i=0;i<5;i++){const y=p+(h-2*p)*i/4;x.beginPath();x.moveTo(p,y);x.lineTo(w-p,y);x.stroke()}const color=chartMode==="credits"?"#ef4444":chartMode==="savings"?"#22c55e":"#3b82f6";x.strokeStyle=color;x.lineWidth=3;x.beginPath();vals.forEach((v,i)=>{const xx=p+(w-2*p)*i/(vals.length-1),yy=h-p-(v/max)*(h-2*p);i?x.lineTo(xx,yy):x.moveTo(xx,yy)});x.stroke();x.fillStyle="#94a3b8";x.font="10px sans-serif";rows.forEach((z,i)=>{if(i%4===0){const xx=p+(w-2*p)*i/(rows.length-1);x.fillText(z.label.slice(0,3),xx-7,h-8)}})}

function settingsModal(){
openModal("⚙️ Paramètres",`<div class="form-group"><label>Solde actuel (€)</label><input id="sb" type="number" step="0.01" value="${state.balance}"></div><div class="form-group"><label>Découvert autorisé (€)</label><input id="so" type="number" step="0.01" value="${state.settings.overdraft}"></div><div class="form-group"><label>Salaire Europcar (€)</label><input id="se" type="number" step="0.01" value="${state.settings.salaryEuropcar}"></div><div class="form-group"><label>Salaire Domino's (€)</label><input id="sd" type="number" step="0.01" value="${state.settings.salaryDominos}"></div><div class="form-group"><label>Tickets restaurant (€)</label><input id="st" type="number" step="0.01" value="${state.settings.ticketsRestaurant}"></div><div class="form-group"><label>Épargne actuelle (€)</label><input id="ss" type="number" step="0.01" value="${state.savings}"></div><div class="form-actions"><button class="primary" id="saveSet">Enregistrer</button><button class="danger" id="resetAll">Tout remettre à zéro</button></div>`);
$("saveSet").onclick=()=>{state.balance=num($("sb").value);state.settings.overdraft=num($("so").value);state.settings.salaryEuropcar=num($("se").value);state.settings.salaryDominos=num($("sd").value);state.settings.ticketsRestaurant=num($("st").value);state.savings=num($("ss").value);save();closeModal();renderAll()};
$("resetAll").onclick=()=>{if(confirm("Effacer toutes les données ?")){state=clone(DEFAULT);save();closeModal();renderAll()}}
}
function simulation(){
openModal("🔮 Simulation",`<div class="form-group"><label>Revenu ponctuel (€)</label><input id="si" type="number" step="0.01" value="0"></div><div class="form-group"><label>Dépense immédiate (€)</label><input id="sx" type="number" step="0.01" value="0"></div><div class="form-group"><label>Nouveau crédit — mensualité (€)</label><input id="sc" type="number" step="0.01" value="0"></div><div class="form-group"><label>Durée (mois)</label><input id="sm" type="number" min="1" value="4"></div><div id="sr" class="sim-card">Entre les valeurs puis calcule.</div><button class="primary" id="goSim">Calculer</button>`);
$("goSim").onclick=()=>{const inc=num($("si").value),exp=num($("sx").value),cr=num($("sc").value),m=Math.max(1,Math.round(num($("sm").value))),base=forecast(),next=base+inc-exp-cr;$("sr").innerHTML=`<p>Prévision actuelle : <strong>${money(base)}</strong></p><p>Prévision simulée : <strong>${money(next)}</strong></p><p>Crédits actuels : <strong>${money(monthlyCredits())}/mois</strong></p><p>Avec nouveau crédit : <strong>${money(monthlyCredits()+cr)}/mois</strong></p><p>Coût total du nouveau crédit : <strong>${money(cr*m)}</strong></p>`}
}

function renderAll(){renderHome();renderCalendar();renderCredits();renderEvolution()}
function init(){setup();applyMonthlyProgress();renderAll()}
document.addEventListener("DOMContentLoaded",init);
