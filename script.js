/* script.js: comportamento do site. Os dados vêm de config.js (carregue antes). */
const $=id=>document.getElementById(id);
const st={s:[],b:0,d:null,t:null,pay:null}; // s = índices dos serviços escolhidos
const brl=v=>'R$ '+v;
const key=d=>d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();
const pad=n=>String(n).padStart(2,'0');
const hm=m=>pad(Math.floor(m/60))+':'+pad(m%60);
const fmt=m=>m>=60?Math.floor(m/60)+'h'+(m%60?pad(m%60):''):m+' min';
const total=()=>st.s.reduce((a,i)=>({m:a.m+SERVICES[i].m,p:a.p+SERVICES[i].p}),{m:0,p:0});
const need=()=>Math.max(1,Math.ceil(total().m/30)); // blocos de 30 min

/* textos do config */
document.title=SITE.titulo;
document.querySelectorAll('[data-cfg]').forEach(e=>{const v=SITE[e.dataset.cfg];if(typeof v==='string')e.innerHTML=v});
$('logo').innerHTML=SITE.nome[0]+' <b>'+SITE.nome[1]+'</b>';
$('heroBg').style.backgroundImage='url("'+SITE.heroImg+'")';
$('addr').innerHTML='<p>'+SITE.endereco.join('<br>')+'</p><p>'+SITE.contato.join('<br>')+'</p>'+SITE.extras.map(t=>'<p>'+t+'</p>').join('');
$('rules').innerHTML=SITE.regras.map(t=>'<p>'+t+'</p>').join('');

/* SEO local: dados estruturados (JSON-LD) gerados do config.js; ligue em SITE.seo.schema */
if(SITE.seo&&SITE.seo.schema){
  const dia=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],q=SITE.seo;
  const ld={'@context':'https://schema.org','@type':'BarberShop',name:SITE.nome.join(' '),url:q.url,image:q.url+SITE.heroImg,telephone:q.telefone,priceRange:q.faixaPreco,
    address:{'@type':'PostalAddress',streetAddress:q.rua,addressLocality:q.cidade,addressRegion:q.uf,postalCode:q.cep,addressCountry:'BR'},
    openingHoursSpecification:Object.entries(HOURS).filter(([,h])=>h).map(([d,h])=>({'@type':'OpeningHoursSpecification',dayOfWeek:dia[d],opens:hm(h[0]*60),closes:hm(h[1]*60)})),
    hasOfferCatalog:{'@type':'OfferCatalog',name:'Serviços',itemListElement:SERVICES.map(v=>({'@type':'Offer',priceCurrency:'BRL',price:v.p.toFixed(2),itemOffered:{'@type':'Service',name:v.n,description:v.d}}))}};
  const sc=document.createElement('script');sc.type='application/ld+json';sc.textContent=JSON.stringify(ld);document.head.append(sc);
}

/* marquee infinito */
const words=SITE.frasesFaixa;
const mqHTML=words.map(w=>`<span>${w}</span>`).join('');
$('mq').innerHTML=mqHTML+mqHTML+mqHTML+mqHTML; // 2 metades idênticas para o loop sem emenda

/* dias disponíveis (próximos 8 dias abertos) */
const days=[];for(let i=0;days.length<8&&i<20;i++){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+i);if(HOURS[d.getDay()])days.push(d)}
const dayLabel=d=>WD[d.getDay()].slice(0,3)+' '+pad(d.getDate());

function slotsFor(d,b,n){
  const [o,c]=HOURS[d.getDay()],now=new Date(),a=[],busy=Store.busy(Store.iso(d),b);
  for(let m=o*60;m<c*60;m+=30){
    const past=key(d)===key(now)&&m<=now.getHours()*60+now.getMinutes();
    a.push({m,free:!past&&!busy.has(m)&&!(Store.mode==='local'&&SITE.demoOcupacao&&(key(d)%97+m/30*7+b*13)%5===0)}); // busy = agendamentos reais
  }
  return a.map((x,i)=>({t:hm(x.m),m:x.m,free:i+n<=a.length&&a.slice(i,i+n).every(y=>y.free)}));
}

/* hero: próximos horários livres */
function heroChips(){
  const found=[];
  for(const d of days){for(const s of slotsFor(d,0,1)){if(s.free&&found.length<5)found.push({d,t:s.t})}if(found.length>=5)break}
  $('nextChips').innerHTML=found.map((f,i)=>`<button class="chip" data-i="${i}">${f.d.getTime()===days[0].getTime()?'Hoje':dayLabel(f.d)} · ${f.t}</button>`).join('');
  $('nextChips').onclick=e=>{const b=e.target.closest('button');if(!b)return;const f=found[b.dataset.i];st.b=0;st.d=days.findIndex(x=>x.getTime()===f.d.getTime());st.t=f.t;render();location.hash='agendar'};
}

/* carousel estilo Netflix */
$('track').innerHTML=SERVICES.map((s,i)=>`<article class="card"><span class="tag">${s.m} min</span><h3>${s.n}</h3><p>${s.d}</p><div class="price"><small>R$</small>${s.p}</div><button class="btn" data-i="${i}">Agendar este</button></article>`).join('');
const tr=$('track'),pv=$('prev'),nx=$('next');
const edges=()=>{pv.hidden=tr.scrollLeft<8;nx.hidden=tr.scrollLeft>tr.scrollWidth-tr.clientWidth-8};
const step=()=>tr.clientWidth*.85;
pv.onclick=()=>tr.scrollBy({left:-step(),behavior:'smooth'});
nx.onclick=()=>tr.scrollBy({left:step(),behavior:'smooth'});
tr.addEventListener('scroll',edges,{passive:true});addEventListener('resize',edges);edges();
let down=false,sx=0,sl=0,moved=0;
tr.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;down=true;sx=e.clientX;sl=tr.scrollLeft;moved=0});
addEventListener('pointermove',e=>{if(!down)return;const dx=e.clientX-sx;moved=Math.abs(dx);if(moved>5)tr.classList.add('drag');tr.scrollLeft=sl-dx});
addEventListener('pointerup',()=>{if(!down)return;down=false;setTimeout(()=>tr.classList.remove('drag'),0)});
tr.addEventListener('keydown',e=>{if(e.key==='ArrowRight')nx.click();if(e.key==='ArrowLeft')pv.click()});
tr.addEventListener('click',e=>{const b=e.target.closest('.btn');if(!b||moved>5)return;const i=+b.dataset.i;if(!st.s.includes(i))st.s.push(i);render();location.hash='agendar'});

/* mais info */
(function(){
  const n=new Date(),h=HOURS[n.getDay()],m=n.getHours()*60+n.getMinutes();
  const open=h&&m>=h[0]*60&&m<h[1]*60,el=$('status');
  el.textContent=open?`Aberto agora · fecha às ${h[1]}h`:'Fechado agora';el.className='status'+(open?'':' off');
  $('hours').innerHTML=[1,2,3,4,5,6,0].map(i=>`<li class="${i===n.getDay()?'today':''}"><span>${WD[i]}</span><span>${HOURS[i]?HOURS[i][0]+'h – '+HOURS[i][1]+'h':'Fechado'}</span></li>`).join('');
})();

/* agendamento */
const chip=(label,on,attrs,dis)=>`<button class="chip" aria-pressed="${on}" ${dis?'disabled':''} ${attrs}>${label}</button>`;
function render(){
  const n=need(),T=total();
  if(st.d!==null&&st.t){const x=slotsFor(days[st.d],st.b,n).find(y=>y.t===st.t);if(!x||!x.free)st.t=null}
  $('cSvc').innerHTML=SERVICES.map((s,i)=>chip(`${s.n} · ${brl(s.p)} · ${fmt(s.m)}`,st.s.includes(i),`data-k="s" data-v="${i}"`)).join('');
  $('cBar').innerHTML=BARBERS.map((b,i)=>`<button class="barber" aria-pressed="${st.b===i}" data-k="b" data-v="${i}"><img src="${b.img}" alt="" width="92" height="92" loading="lazy" decoding="async" draggable="false"><span>${b.n}</span></button>`).join('');
  $('cPay').innerHTML=PAGAMENTOS.map(p=>chip(p,st.pay===p,`data-k="p" data-v="${p}"`)).join('');
  $('cDay').innerHTML=days.map((d,i)=>chip(i===0?'Hoje':dayLabel(d),st.d===i,`data-k="d" data-v="${i}"`)).join('');
  $('cTime').innerHTML=st.d===null?'<span style="color:var(--muted)">Escolha um dia para ver os horários.</span>':slotsFor(days[st.d],st.b,n).map(x=>chip(x.t,st.t===x.t,`data-k="t" data-v="${x.t}"`,!x.free)).join('');
  $('sS').innerHTML=st.s.length?st.s.map(i=>SERVICES[i].n).join('<br>'):'—';
  $('sM').textContent=st.s.length?fmt(T.m):'—';
  $('sB').textContent=BARBERS[st.b].n;
  $('sD').textContent=st.d===null?'—':dayLabel(days[st.d]);
  const x=st.t&&slotsFor(days[st.d],st.b,n).find(y=>y.t===st.t);
  $('sT').textContent=st.t?(st.s.length?st.t+' – '+hm(x.m+T.m):st.t):'—';
  $('sP').textContent=brl(T.p);
}
$('form').onclick=e=>{const b=e.target.closest('[data-k]');if(!b)return;const k=b.dataset.k,v=b.dataset.v;
  if(k==='s'){const i=+v,p=st.s.indexOf(i);p<0?st.s.push(i):st.s.splice(p,1)}
  if(k==='b')st.b=+v;if(k==='d'){st.d=+v;st.t=null}if(k==='t')st.t=v;if(k==='p')st.pay=v;
  $('msg').textContent='';$('go').disabled=false;render()};
$('go').onclick=async()=>{
  const m=$('msg'),nm=$('nm').value.trim(),ph=$('ph').value.replace(/\D/g,'');
  const err=t=>{m.className='msg err';m.textContent=t};
  if(!st.s.length)return err('Escolha pelo menos um serviço.');
  if(st.d===null||!st.t)return err('Escolha o dia e o horário.');
  if(!st.pay)return err('Escolha a forma de pagamento.');
  if(nm.length<2)return err('Informe seu nome.');
  if(ph.length<10)return err('Informe um celular com DDD.');
  const T=total(),go=$('go'),hh=st.t,sv=st.s.map(i=>SERVICES[i].n).join(' + '),bn=BARBERS[st.b].n,dl=dayLabel(days[st.d]),py=st.pay; // guarda antes: a lista é redesenhada ao gravar
  go.disabled=true;m.className='msg';m.textContent='Reservando...';
  try{await Store.reservar({nome:nm,tel:$('ph').value.trim(),svc:st.s.map(i=>({nome:SERVICES[i].n,valor:SERVICES[i].p,duracao:SERVICES[i].m})),min:T.m,valor:T.p,barbeiro:st.b,data:Store.iso(days[st.d]),inicio:Store.tm(st.t),pagamento:st.pay})}
  catch(e){go.disabled=false;st.t=null;render();return err(e.message)}
  m.className='msg ok';
  m.textContent=`Pronto, ${nm.split(' ')[0]}! ${sv} com ${bn}, ${dl} às ${hh}. Total ${brl(T.p)}, pagamento: ${py}.`+(Store.mode==='local'?' (Demonstração: dados só neste navegador.)':'');
  render(); // atualiza a lista: os horários usados somem
};
heroChips();render();
Store.onChange(()=>{heroChips();render()});Store.init('site').then(()=>{heroChips();render()});
