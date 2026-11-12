/* store.js: camada de dados do site e do painel.
   Dois modos, escolhidos pelo config.js:
   · FIREBASE.apiKey preenchido  -> Firestore + Authentication (produção)
   · FIREBASE.apiKey vazio       -> localStorage (demonstração, sem backend)
   O resto do código só conversa com `Store`; o formato dos documentos é o mesmo nos dois modos.
   Coleções: ocupacao (pública, sem dados pessoais) · agendamentos (só painel) · clientes (só painel) · config/geral. */
const Store=(()=>{
  const FS=typeof FIREBASE!=='undefined'&&!!FIREBASE.apiKey,K='casanavalha_v2';
  const pad=n=>String(n).padStart(2,'0'),hm=m=>pad(Math.floor(m/60))+':'+pad(m%60),tm=h=>+h.slice(0,2)*60+ +h.slice(3,5);
  const iso=x=>x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate()),dig=s=>String(s||'').replace(/\D/g,'');
  const bidx=id=>BARBERS.findIndex(b=>b.id===id),slotId=(d,h,b)=>`ag_${d}_${h}_${b}`,blkId=(d,bi,m)=>`block_${BARBERS[bi].id}_${d}_${hm(m)}`;
  let R={ag:[],oc:[],cl:[],cfg:{bloquearSeguintes:true},seeded:false},subs=[],n=0,fb={},initP=null,adminCbs=[];
  const emit=()=>subs.forEach(f=>{try{f()}catch(e){console.error(e)}}),uid=p=>p+Date.now().toString(36)+(n++);
  const mem={}; // se o navegador bloquear o armazenamento, funciona só em memória nesta aba
  const ls={get:k=>{try{return localStorage.getItem(k)}catch(e){return mem[k]||null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){mem[k]=v}}};
  const ss={get:k=>{try{return sessionStorage.getItem(k)}catch(e){return mem['s'+k]||null}},set:(k,v)=>{try{sessionStorage.setItem(k,v)}catch(e){mem['s'+k]=v}},del:k=>{try{sessionStorage.removeItem(k)}catch(e){delete mem['s'+k]}}};
  const load=()=>{try{const x=JSON.parse(ls.get(K));if(x)R=Object.assign(R,x)}catch(e){}};
  const save=()=>{if(!FS)ls.set(K,JSON.stringify(R))};
  if(!FS){load();try{addEventListener('storage',e=>{if(e.key===K){load();emit()}})}catch(e){}}

  /* documento do Firestore <-> modelo usado pela interface */
  const fromAppt=x=>({id:x.id,nome:x.clienteNome||'',tel:x.clienteTel||'',servicos:(x.servicos||[]).map(s=>s.nome),min:x.duracao,valor:x.valor,barbeiro:Math.max(0,bidx(x.profissional)),
    data:x.dataISO,inicio:tm(x.hora),pagamento:x.pagamentoForma||x.pagamentoPref||'',status:x.status||'agendado',pago:x.status==='concluido'});
  const fromClient=x=>({id:x.id,k:dig(x.phone)||x.id,nome:x.name||'',tel:x.phone||'',status:x.status||'ativo'});
  function docsOf(a){const b=BARBERS[a.barbeiro],hora=hm(a.inicio),diaProf=a.data+'#'+b.id,id=slotId(a.data,hora,b.id);
    return{id,
      ag:{dataISO:a.data,hora,profissional:b.id,diaProf,barbeiroNome:b.n,clienteNome:a.nome,clienteTel:a.tel,servico:a.svc.map(s=>s.nome).join(' + '),servicos:a.svc,valor:a.valor,duracao:a.min,horaFim:hm(a.inicio+a.min),bloqueado:false,pagamentoPref:a.pagamento||'',status:'agendado'},
      oc:{dataISO:a.data,hora,diaProf,profissional:b.id,duracao:a.min,bloqueado:false}}}
  const strip=x=>{const y={...x};delete y.id;return y};

  /* ---------- Firestore ---------- */
  async function fsInit(role){
    const B='https://www.gstatic.com/firebasejs/10.12.2/';
    const [A,F,U]=await Promise.all([import(B+'firebase-app.js'),import(B+'firebase-firestore.js'),import(B+'firebase-auth.js')]);
    const app=A.initializeApp(FIREBASE);fb={F,U,db:F.getFirestore(app),auth:U.getAuth(app),unsub:[]};
    const col=c=>F.collection(fb.db,c),sub=(q,key)=>fb.unsub.push(F.onSnapshot(q,s=>{R[key]=s.docs.map(x=>({id:x.id,...x.data()}));emit()},e=>console.error(key,e)));
    const start=()=>{const hoje=iso(new Date()),desde=iso(new Date(Date.now()-JANELA_DIAS*864e5));
      sub(F.query(col('ocupacao'),F.where('dataISO','>=',role==='admin'?desde:hoje)),'oc');
      fb.unsub.push(F.onSnapshot(F.doc(fb.db,'config','geral'),s=>{if(s.exists())R.cfg={...R.cfg,...s.data()};emit()},()=>{}));
      if(role==='admin'){sub(F.query(col('agendamentos'),F.where('dataISO','>=',desde)),'ag');sub(F.query(col('clientes')),'cl')}};
    const stop=()=>{fb.unsub.splice(0).forEach(u=>u());R.ag=[];R.cl=[];emit()};
    if(role==='site'){try{await U.signInAnonymously(fb.auth)}catch(e){console.error(e)}start()}
    else U.onAuthStateChanged(fb.auth,u=>{const ok=!!u&&!u.isAnonymous;adminCbs.forEach(cb=>cb(ok));ok?start():stop()});
  }
  const init=role=>initP||(initP=FS?fsInit(role):Promise.resolve());

  /* ---------- acesso do painel ---------- */
  const MSG={'auth/invalid-credential':'E-mail ou senha incorretos.','auth/invalid-email':'E-mail inválido.','auth/user-disabled':'Esta conta está desativada.','auth/too-many-requests':'Muitas tentativas. Aguarde alguns minutos.','auth/network-request-failed':'Sem conexão. Verifique a internet.'};
  const auth={
    onChange(cb){adminCbs.push(cb);if(!FS)cb(!!ss.get('cn_adm'))},
    async login(e,p){
      if(FS){await init('admin');try{await fb.U.signInWithEmailAndPassword(fb.auth,e,p)}catch(x){throw new Error(MSG[x.code]||'Não foi possível entrar. Tente novamente.')}}
      else if(e.trim().toLowerCase()===ADMIN.email&&p===ADMIN.senha){ss.set('cn_adm','1');adminCbs.forEach(c=>c(true))}
      else throw new Error('E-mail ou senha incorretos.')},
    async logout(){if(FS)await fb.U.signOut(fb.auth);else{ss.del('cn_adm');adminCbs.forEach(c=>c(false))}},
    async reset(e){if(!FS)return'Em produção, o painel envia o e-mail de redefinição (Firebase Auth).';await init('admin');await fb.U.sendPasswordResetEmail(fb.auth,e);return'Enviamos um link para redefinir a senha.'}
  };

  /* ---------- escrita (todas retornam Promise) ---------- */
  async function reservar(a,extra){ // a: {nome,tel,svc:[{nome,valor,duracao}],min,valor,barbeiro,data,inicio,pagamento}
    const busy=api.busy(a.data,a.barbeiro),k=Math.max(1,Math.ceil(a.min/30));
    for(let i=0;i<k;i++)if(busy.has(a.inicio+i*30))throw new Error('Esse horário acabou de ser ocupado. Escolha outro.');
    const{id,ag,oc}=docsOf(a);
    if(FS){const{F,db}=fb,b=F.writeBatch(db),ts=F.serverTimestamp();b.set(F.doc(db,'agendamentos',id),{...ag,createdAt:ts});b.set(F.doc(db,'ocupacao',id),{...oc,createdAt:ts});
      try{await b.commit()}catch(e){throw new Error(e.code==='permission-denied'?'Esse horário acabou de ser ocupado. Escolha outro.':'Não foi possível agendar. Tente novamente.')}}
    else{if(R.ag.some(x=>x.id===id))throw new Error('Esse horário acabou de ser ocupado. Escolha outro.');R.ag.push({id,...ag,...extra,createdAt:Date.now()});R.oc.push({id,...oc,createdAt:Date.now()});save();emit()}
    return id}
  async function atualizar(id,p){if(FS)await fb.F.updateDoc(fb.F.doc(fb.db,'agendamentos',id),p);else{Object.assign(R.ag.find(y=>y.id===id),p);save();emit()}}
  async function arquivar(id,status){ // cancelado/faltou: guarda no histórico com outro id e libera o horário
    const x=R.ag.find(y=>y.id===id);if(!x)return;const nid='arq_'+id+'_'+Date.now().toString(36);
    if(FS){const{F,db}=fb,b=F.writeBatch(db);b.set(F.doc(db,'agendamentos',nid),{...strip(x),status,arquivadoEm:F.serverTimestamp()});b.delete(F.doc(db,'agendamentos',id));b.delete(F.doc(db,'ocupacao',id));await b.commit()}
    else{R.ag=R.ag.filter(y=>y.id!==id);R.oc=R.oc.filter(y=>y.id!==id);R.ag.push({...x,id:nid,status});save();emit()}}
  async function bloquear(items){ // items: [{data,b,m}]
    const L=items.map(i=>({id:blkId(i.data,i.b,i.m),dataISO:i.data,hora:hm(i.m),diaProf:i.data+'#'+BARBERS[i.b].id,profissional:BARBERS[i.b].id,bloqueado:true}));
    if(FS){for(let i=0;i<L.length;i+=400){const{F,db}=fb,b=F.writeBatch(db);L.slice(i,i+400).forEach(x=>b.set(F.doc(db,'ocupacao',x.id),{...strip(x),createdAt:F.serverTimestamp()}));await b.commit()}}
    else{L.forEach(x=>{if(!R.oc.some(o=>o.id===x.id))R.oc.push({...x,createdAt:Date.now()})});save();emit()}}
  async function desbloquear(items){const ids=new Set(items.map(i=>blkId(i.data,i.b,i.m))),L=R.oc.filter(o=>o.bloqueado&&ids.has(o.id));
    if(FS){for(let i=0;i<L.length;i+=400){const{F,db}=fb,b=F.writeBatch(db);L.slice(i,i+400).forEach(x=>b.delete(F.doc(db,'ocupacao',x.id)));await b.commit()}}
    else{R.oc=R.oc.filter(o=>!(o.bloqueado&&ids.has(o.id)));save();emit()}return L.length}
  async function addClient(c){const k=dig(c.tel);if(k&&R.cl.some(x=>dig(x.phone)===k))return false;const id=k?'cli_'+k:uid('cli_'),d={name:c.nome,phone:c.tel||'',type:'cliente',status:c.status||'ativo'};
    if(FS)await fb.F.setDoc(fb.F.doc(fb.db,'clientes',id),{...d,createdAt:fb.F.serverTimestamp()});else{R.cl.push({id,...d,createdAt:Date.now()});save();emit()}return true}
  async function setClient(k,p){const x=R.cl.find(y=>fromClient(y).k===k);if(!x)return;if(FS)await fb.F.updateDoc(fb.F.doc(fb.db,'clientes',x.id),p);else{Object.assign(x,p);save();emit()}}
  async function delClient(k){const x=R.cl.find(y=>fromClient(y).k===k);if(!x)return;if(FS)await fb.F.deleteDoc(fb.F.doc(fb.db,'clientes',x.id));else{R.cl=R.cl.filter(y=>y!==x);save();emit()}}
  async function syncClients(){ // todo agendamento vira cliente (o site não pode gravar em clientes)
    const have=new Set(R.cl.map(x=>dig(x.phone))),seen=new Set();
    for(const a of R.ag){const k=dig(a.clienteTel);if(k&&!have.has(k)&&!seen.has(k)){seen.add(k);await addClient({nome:a.clienteNome,tel:a.clienteTel})}}}
  async function setCfg(p){R.cfg={...R.cfg,...p};if(FS)await fb.F.setDoc(fb.F.doc(fb.db,'config','geral'),p,{merge:true});else{save();emit()}}

  /* ---------- demonstração (só modo local) ---------- */
  const demo={
    insert(a,extra){const{id,ag,oc}=docsOf(a),livre=extra&&(extra.status==='cancelado'||extra.status==='faltou');R.ag.push({id,...ag,...extra,createdAt:Date.now()});if(!livre)R.oc.push({id,...oc,createdAt:Date.now()})},
    done(){R.seeded=true;save();emit()},
    reset(){R={ag:[],oc:[],cl:[],cfg:{bloquearSeguintes:true},seeded:false};save();emit()}
  };

  const api={mode:FS?'firestore':'local',iso,dig,hm,tm,init,auth,demo,
    onChange(f){subs.push(f)},
    get seeded(){return R.seeded},
    get cfg(){return{bloquear:R.cfg.bloquearSeguintes!==false}},
    get appts(){return R.ag.map(fromAppt)},get clients(){return R.cl.map(fromClient)},
    get blocks(){return R.oc.filter(o=>o.bloqueado).map(o=>({data:o.dataISO,barbeiro:bidx(o.profissional),inicio:tm(o.hora)}))},
    /* minutos de início ocupados pelo barbeiro b no dia. Com "bloquear seguintes" ligado, um atendimento
       longo ocupa todos os blocos de 30 min dele; horários desativados no painel também entram. */
    busy(date,b){const s=new Set(),id=BARBERS[b].id,long=R.cfg.bloquearSeguintes!==false;
      R.oc.filter(o=>o.dataISO===date&&o.profissional===id).forEach(o=>{const m=tm(o.hora),k=o.bloqueado||!long?1:Math.max(1,Math.ceil(o.duracao/30));for(let i=0;i<k;i++)s.add(m+i*30)});return s},
    reservar,atualizar,arquivar,bloquear,desbloquear,addClient,setClient,delClient,syncClients,setCfg};
  return api;
})();
