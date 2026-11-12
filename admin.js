/* admin.js: painel administrativo. Dados e login: store.js (Firestore ou demonstração) · listas: config.js */
const $ = (id) => document.getElementById(id),
  dig = Store.dig,
  hm = Store.hm,
  today = () => Store.iso(new Date());
const pad = (n) => String(n).padStart(2, "0");
const brl = (v) =>
    "R$ " +
    Number(v).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  fd = (s) => s.split("-").reverse().join("/");
const fmt = (m) =>
  m >= 60 ? Math.floor(m / 60) + "h" + (m % 60 ? pad(m % 60) : "") : m + " min";
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const mask = (v) => {
  v = dig(v).slice(0, 11);
  return v.length > 6
    ? `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`
    : v.length > 2
      ? `(${v.slice(0, 2)}) ${v.slice(2)}`
      : v;
};
const cap = (n) =>
  (n || "")
    .trim()
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
const ST = {
    agendado: "Agendado",
    concluido: "Concluído",
    cancelado: "Cancelado",
    faltou: "Faltou",
  },
  COL = [
    "#d9763f",
    "#f1e9da",
    "#7fa58b",
    "#c9a24b",
    "#a9552a",
    "#9fb8c4",
    "#b78fb3",
    "#8a8a7a",
  ];
let tab = "agenda",
  day = today(),
  fb = "all",
  hf = "",
  cq = "",
  cf = "all",
  rDe = Store.iso(new Date(Date.now() - 29 * 864e5)),
  rAte = today(),
  rep = [],
  nSlot = null,
  on = false;
const key = (a) => a.data + String(a.inicio).padStart(4, "0"),
  live = (a) => a.status === "agendado" || a.status === "concluido";

function notify(msg, t) {
  const e = document.createElement("div");
  e.className = "toast " + (t || "");
  e.textContent = msg;
  $("notes").append(e);
  setTimeout(() => e.remove(), 3500);
}
function modal(t, b, f) {
  $("mTitle").textContent = t;
  $("mBody").innerHTML = b;
  $("mFoot").innerHTML = f || "";
  $("modal").classList.add("open");
}
const closeModal = () => $("modal").classList.remove("open");
const run = async (fn, ok) => {
  try {
    await fn();
    if (ok) notify(ok);
  } catch (e) {
    console.error(e);
    notify(e.message || "Não foi possível concluir a ação.", "erro");
  }
};

/* ---------- acesso ---------- */
$("lh").textContent =
  Store.mode === "local"
    ? "Demonstração: " + ADMIN.email + " / " + ADMIN.senha
    : "";
$("lf").onsubmit = async (e) => {
  e.preventDefault();
  const b = e.target.querySelector(".btn-primary");
  $("le").textContent = "";
  b.disabled = true;
  try {
    await Store.auth.login($("em").value.trim(), $("pw").value);
  } catch (x) {
    $("le").textContent = x.message;
  } finally {
    b.disabled = false;
  }
};
Store.auth.onChange((ok) => {
  on = ok;
  $("login").hidden = ok;
  $("app").hidden = !ok;
  if (!ok) {
    $("pw").value = "";
    return;
  }
  if (Store.mode === "local" && !Store.seeded) seed(true);
  show();
});
Store.onChange(() => {
  if (!on) return;
  Store.syncClients();
  if (tab === "agenda") show();
  else if (tab === "clientes") rows();
  else if (tab === "reports") gerar();
});
Store.init("admin");

/* ---------- dados de demonstração (só no modo local) ---------- */
function seed(keep) {
  // keep: mantém o que já foi agendado no site e cria só histórico passado
  if (!keep) Store.demo.reset();
  let r = 7;
  const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280,
    pick = (n) => Math.floor(rnd() * n);
  const nomes = [
    "Carlos Mendes",
    "João Pedro Alves",
    "Rafael Souza",
    "Bruno Lima",
    "Tiago Ramos",
    "Marcos Silva",
    "André Costa",
    "Felipe Rocha",
    "Lucas Prado",
    "Diego Nunes",
  ];
  const cl = nomes.map((n, i) => ({
    n,
    t:
      "(00) 9" +
      String(1000 + i * 137).slice(0, 4) +
      "-" +
      String(2000 + i * 311).slice(0, 4),
  }));
  for (let o = -35; o <= (keep ? -1 : 4); o++) {
    const dt = new Date();
    dt.setHours(0, 0, 0, 0);
    dt.setDate(dt.getDate() + o);
    const H = HOURS[dt.getDay()];
    if (!H) continue;
    BARBERS.forEach((_, b) => {
      let m = H[0] * 60 + 30 * pick(4);
      while (true) {
        const ids = [
            ...new Set([
              pick(SERVICES.length),
              ...(rnd() < 0.35 ? [pick(SERVICES.length)] : []),
            ]),
          ],
          svc = ids.map((i) => ({
            nome: SERVICES[i].n,
            valor: SERVICES[i].p,
            duracao: SERVICES[i].m,
          }));
        const min = svc.reduce((s, x) => s + x.duracao, 0),
          n = Math.ceil(min / 30);
        if (m + n * 30 > H[1] * 60) break;
        const c = cl[pick(cl.length)],
          x = rnd(),
          s =
            o < 0
              ? x < 0.07
                ? "cancelado"
                : x < 0.12
                  ? "faltou"
                  : "concluido"
              : "agendado",
          pg = PAGAMENTOS[pick(PAGAMENTOS.length)];
        const a = {
          nome: c.n,
          tel: c.t,
          svc,
          min,
          valor: svc.reduce((q, y) => q + y.valor, 0),
          barbeiro: b,
          data: Store.iso(dt),
          inicio: m,
          pagamento: pg,
        };
        Store.demo.insert(
          a,
          s === "concluido"
            ? { status: "concluido", pagamentoForma: pg }
            : s === "agendado"
              ? {}
              : { status: s, id: "arq_" + a.data + "_" + a.inicio + "_" + b },
        );
        m += n * 30 + 30 * pick(3);
      }
    });
  }
  Store.demo.done();
}

/* ---------- AGENDA ---------- */
const slotsOf = (d) => {
  const H = HOURS[new Date(d + "T12:00").getDay()],
    a = [];
  if (H) for (let m = H[0] * 60; m < H[1] * 60; m += 30) a.push(m);
  return a;
};
function column(b) {
  const H = slotsOf(day),
    rows = {},
    long = Store.cfg.bloquear;
  Store.appts
    .filter((a) => a.data === day && a.barbeiro === b && live(a))
    .forEach((a) => {
      const n = long ? Math.max(1, Math.ceil(a.min / 30)) : 1;
      rows[a.inicio] = { a };
      for (let i = 1; i < n; i++)
        rows[a.inicio + i * 30] = rows[a.inicio + i * 30] || { c: a };
    });
  Store.blocks
    .filter((x) => x.data === day && x.barbeiro === b)
    .forEach((x) => {
      if (!rows[x.inicio]) rows[x.inicio] = { off: 1 };
    });
  const body = H.map((m) => {
    const r = rows[m];
    let c,
      k = "free";
    if (r && r.a) {
      k = "busy";
      const a = r.a;
      c = `<div><button class="who" data-a="hist" data-k="${dig(a.tel)}">${esc(a.nome)}</button><span>${esc(a.servicos.join(" + "))} · ${fmt(a.min)}</span>
      <span>${brl(a.valor)} · <span class="st ${a.status}">${ST[a.status]}</span>${a.pago ? " <small>Pago · " + esc(a.pagamento) + "</small>" : a.pagamento ? " <small>Prefere " + esc(a.pagamento) + "</small>" : ""}</span>
      ${a.status === "agendado" ? `<span class="act"><select data-id="${a.id}" aria-label="Forma de pagamento">${PAGAMENTOS.map((p) => `<option ${p === a.pagamento ? "selected" : ""}>${p}</option>`).join("")}</select><button data-a="done" data-id="${a.id}">Receber</button><button data-a="noshow" data-id="${a.id}">Faltou</button><button data-a="cancel" data-id="${a.id}">Cancelar</button></span>` : ""}</div>`;
    } else if (r && r.c) {
      k = "cont";
      c = `<div>em atendimento · ${esc(r.c.nome)}</div>`;
    } else if (r && r.off) {
      k = "off";
      c = "<div>Desativado</div>";
    } else
      c = `<div><button class="free-btn" data-a="new" data-b="${b}" data-m="${m}">+ Agendar horário</button></div>`;
    return `<div class="slot ${k}"><span class="t">${hm(m)}</span>${c}</div>`;
  }).join("");
  return `<section class="col"><h2>${BARBERS[b].n}</h2>${body}</section>`;
}
function agenda() {
  const H = slotsOf(day),
    bs = fb === "all" ? BARBERS.map((_, i) => i) : [+fb];
  const L = Store.appts.filter(
      (a) => a.data === day && bs.includes(a.barbeiro),
    ),
    ok = L.filter(live);
  return `<div class="toolbar"><div class="field"><label for="dataFiltro">Dia</label><input type="date" id="dataFiltro" value="${day}"></div>
  <div class="field"><label for="barbFiltro">Barbeiro</label><select id="barbFiltro"><option value="all">Todos</option>${BARBERS.map((b, i) => `<option value="${i}" ${fb == i ? "selected" : ""}>${b.n}</option>`).join("")}</select></div>
  <div class="field"><label for="horaFiltro">Horário (desativar/reativar)</label><select id="horaFiltro"><option value="">Dia inteiro</option>${H.map((m) => `<option value="${m}" ${hf == m ? "selected" : ""}>${hm(m)}</option>`).join("")}</select></div>
  <div class="actions"><button class="btn btn-light" data-a="hoje">Hoje</button><button class="btn btn-del" data-a="block"><i class="bx bx-block"></i> Desativar</button><button class="btn btn-success" data-a="unblock"><i class="bx bx-reset"></i> Reativar</button></div></div>
  <p class="hours-note">${H.length ? `Funcionamento: ${hm(H[0])} às ${hm(H[H.length - 1] + 30)} · ${ok.length} atendimentos · previsto ${brl(ok.reduce((s, a) => s + a.valor, 0))} · recebido ${brl(L.filter((a) => a.pago).reduce((s, a) => s + a.valor, 0))}` : "Fechado neste dia da semana."}</p>
  ${H.length ? `<div class="cols">${bs.map(column).join("")}</div>` : ""}`;
}
const targets = () => {
  const bs = fb === "all" ? BARBERS.map((_, i) => i) : [+fb],
    H = hf === "" ? slotsOf(day) : [+hf];
  return bs.flatMap((b) => H.map((m) => ({ data: day, b, m })));
};
function newAppt(b, m) {
  nSlot = { b, m };
  const tot = () => {
    const l = [...document.querySelectorAll("#nSvcs input:checked")].map(
      (i) => SERVICES[+i.value],
    );
    return {
      l,
      v: l.reduce((s, x) => s + x.p, 0),
      m: l.reduce((s, x) => s + x.m, 0),
    };
  };
  modal(
    `Novo agendamento, ${BARBERS[b].n} às ${hm(m)}`,
    `<div class="form-grid"><div><label for="nCli">Cliente</label><input id="nCli" list="nList" placeholder="Digite ou selecione"><datalist id="nList">${Store.clients.map((c) => `<option value="${esc(c.nome)}">`).join("")}</datalist></div>
   <div><label for="nTel">Telefone</label><input id="nTel" type="tel" maxlength="15" placeholder="(XX) XXXXX-XXXX"></div>
   <div><label>Serviços (um ou mais)</label><div class="pick" id="nSvcs">${SERVICES.map((x, i) => `<label class="pick-row"><input type="checkbox" value="${i}"><span>${esc(x.n)}</span><small>${brl(x.p)} · ${fmt(x.m)}</small></label>`).join("")}</div><small id="nRes"></small></div>
   <div><label for="nVal">Valor (R$)</label><input id="nVal" type="number" step="0.01" placeholder="0,00"></div></div>`,
    '<button class="btn btn-light" data-a="close">Cancelar</button><button class="btn btn-primary" data-a="savenew">Salvar agendamento</button>',
  );
  $("nSvcs").onchange = () => {
    const t = tot();
    $("nVal").value = t.l.length ? t.v.toFixed(2) : "";
    $("nRes").textContent = t.l.length
      ? `Duração total: ${fmt(t.m)} (termina às ${hm(m + t.m)})`
      : "";
  };
}

/* ---------- CLIENTES ---------- */
function clientes() {
  return `<div class="kpis"><div class="kpi"><small>Clientes cadastrados</small><b id="kCli">0</b></div><div class="kpi"><small>Ativos</small><b id="kAtv">0</b></div></div>
  <div class="grid"><div class="card"><div class="card-h"><h3>Novo cliente</h3></div><div class="card-b"><form id="clientForm" class="form-grid" novalidate>
    <div><label for="cNome">Nome *</label><input id="cNome" required placeholder="Nome completo"></div>
    <div><label for="cTel">Telefone</label><input id="cTel" type="tel" placeholder="(XX) XXXXX-XXXX" maxlength="15"></div>
    <div><label for="cSt">Status</label><select id="cSt"><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></div>
    <button class="btn btn-primary" type="submit">Salvar cliente</button></form></div></div>
  <div class="card"><div class="card-h"><h3>Lista de clientes</h3></div><div class="card-b"><div class="ctl"><div class="search"><i class="bx bx-search"></i><input type="search" id="cBusca" placeholder="Buscar por nome ou telefone..." value="${esc(cq)}" aria-label="Buscar cliente"></div>
    <div class="ftabs" id="cFiltro">${[
      ["all", "Todos"],
      ["ativo", "Ativos"],
      ["inativo", "Inativos"],
    ]
      .map(
        ([v, l]) =>
          `<button data-f="${v}" class="${cf === v ? "on" : ""}">${l}</button>`,
      )
      .join("")}</div></div></div>
    <div class="tw"><table><thead><tr><th>Nome</th><th>Telefone</th><th>Status</th><th>Ações</th></tr></thead><tbody id="cBody"></tbody></table></div></div></div>`;
}
function rows() {
  if (!$("cBody")) return;
  const q = cq.toLowerCase(),
    C = Store.clients;
  $("kCli").textContent = C.length;
  $("kAtv").textContent = C.filter((c) => c.status === "ativo").length;
  const L = C.filter(
    (c) =>
      (cf === "all" || c.status === cf) &&
      (c.nome + c.tel).toLowerCase().includes(q),
  ).sort((a, b) => a.nome.localeCompare(b.nome));
  $("cBody").innerHTML =
    L.map(
      (
        c,
      ) => `<tr><td><b>${esc(c.nome)}</b></td><td>${esc(c.tel) || "—"}</td><td><span class="st ${c.status === "ativo" ? "concluido" : "cancelado"}">${c.status === "ativo" ? "Ativo" : "Inativo"}</span></td>
  <td class="act"><button data-a="hist" data-k="${esc(c.k)}">Histórico</button><button data-a="tgl" data-k="${esc(c.k)}">${c.status === "ativo" ? "Inativar" : "Ativar"}</button><button data-a="del" data-k="${esc(c.k)}">Excluir</button></td></tr>`,
    ).join("") || '<tr><td colspan="4">Nenhum cliente encontrado.</td></tr>';
}
function hist(k) {
  const c = Store.clients.find((x) => x.k === k),
    L = Store.appts
      .filter((a) => dig(a.tel) === k)
      .sort((a, b) => key(b).localeCompare(key(a))),
    ok = L.filter((a) => a.status === "concluido"),
    tot = ok.reduce((s, a) => s + a.valor, 0);
  modal(
    c ? c.nome : L[0] ? L[0].nome : "Cliente",
    `<p class="hours-note">${esc(c ? c.tel : "")}</p><div class="stats"><div><small>Visitas</small><b>${ok.length}</b></div><div><small>Total gasto</small><b>${brl(tot)}</b></div><div><small>Ticket médio</small><b>${brl(ok.length ? tot / ok.length : 0)}</b></div><div><small>Última visita</small><b>${ok.length ? fd(ok[0].data) : "—"}</b></div></div>
  <div class="tw"><table><thead><tr><th>Data</th><th>Serviços</th><th>Barbeiro</th><th>Valor</th><th>Pagamento</th><th>Status</th></tr></thead><tbody>${L.map((a) => `<tr><td>${fd(a.data)}<br><small>${hm(a.inicio)}</small></td><td>${esc(a.servicos.join(" + "))}</td><td>${BARBERS[a.barbeiro].n}</td><td>${brl(a.valor)}</td><td>${esc(a.pagamento || "—")}</td><td><span class="st ${a.status}">${ST[a.status]}</span></td></tr>`).join("") || '<tr><td colspan="6">Sem atendimentos.</td></tr>'}</tbody></table></div>`,
  );
}

/* ---------- RELATÓRIOS ---------- */
function reports() {
  return `<div class="kpis"><div class="kpi"><small>Atendimentos</small><b id="kQtd">0</b></div><div class="kpi"><small>Faturamento</small><b id="kFat">R$ 0,00</b></div><div class="kpi"><small>Ticket médio</small><b id="kTkt">R$ 0,00</b></div></div>
  <div class="card"><div class="card-h"><h3>Relatório detalhado</h3></div><div class="card-b"><div class="toolbar" style="margin:0"><div class="field"><label for="relDe">De</label><input type="date" id="relDe" value="${rDe}"></div><div class="field"><label for="relAte">Até</label><input type="date" id="relAte" value="${rAte}"></div>
    <div class="actions"><button class="btn btn-primary" data-a="gerar"><i class="bx bx-bar-chart"></i> Gerar</button><button class="btn btn-light" data-a="csv"><i class="bx bx-download"></i> CSV</button></div></div></div>
    <div class="tw"><table><thead><tr><th>Data</th><th>Hora</th><th>Cliente</th><th>Serviços</th><th>Barbeiro</th><th>Forma</th><th>Valor</th></tr></thead><tbody id="rBody"></tbody></table></div></div>
  <div class="grid" style="grid-template-columns:1fr 1fr"><div class="card"><div class="card-h"><h3>Faturamento por serviço</h3></div><div class="card-b rep" id="rSvc"></div></div>
  <div class="card"><div class="card-h"><h3>Por forma de pagamento</h3></div><div class="tw"><table><thead><tr><th>Forma</th><th>Atend.</th><th>Valor</th><th>%</th></tr></thead><tbody id="rPay"></tbody></table></div></div></div>`;
}
function gerar() {
  if (!$("relDe")) return;
  rDe = $("relDe").value;
  rAte = $("relAte").value;
  rep = Store.appts
    .filter((a) => a.status === "concluido" && a.data >= rDe && a.data <= rAte)
    .sort((a, b) => key(b).localeCompare(key(a)));
  const T = rep.reduce((s, a) => s + a.valor, 0);
  $("kQtd").textContent = rep.length;
  $("kFat").textContent = brl(T);
  $("kTkt").textContent = brl(rep.length ? T / rep.length : 0);
  $("rBody").innerHTML =
    rep
      .map(
        (a) =>
          `<tr><td>${fd(a.data)}</td><td>${hm(a.inicio)}</td><td>${esc(a.nome)}</td><td>${esc(a.servicos.join(" + "))}</td><td>${BARBERS[a.barbeiro].n}</td><td>${esc(a.pagamento)}</td><td>${brl(a.valor)}</td></tr>`,
      )
      .join("") ||
    '<tr><td colspan="7">Sem atendimentos concluídos no período.</td></tr>';
  const S = {};
  rep.forEach((a) =>
    a.servicos.forEach((n) => {
      const s = SERVICES.find((x) => x.n === n);
      S[n] = (S[n] || 0) + (s ? s.p : a.valor / a.servicos.length);
    }),
  );
  const E = Object.entries(S).sort((a, b) => b[1] - a[1]),
    tot = E.reduce((s, e) => s + e[1], 0);
  let acc = 0;
  const g = E.map((e, i) => {
    const a = (acc / tot) * 100;
    acc += e[1];
    return `${COL[i % COL.length]} ${a}% ${(acc / tot) * 100}%`;
  }).join(",");
  $("rSvc").innerHTML = E.length
    ? `<div class="donut" role="img" aria-label="Faturamento por serviço" style="background:conic-gradient(${g})"></div><div class="leg">${E.map((e, i) => `<div><span><i style="background:${COL[i % COL.length]}"></i>${esc(e[0])}</span><b>${brl(e[1])}</b></div>`).join("")}</div>`
    : '<p class="hours-note">Sem dados no período.</p>';
  $("rPay").innerHTML = PAGAMENTOS.map((p) => {
    const x = rep.filter((a) => a.pagamento === p),
      v = x.reduce((s, a) => s + a.valor, 0);
    return `<tr><td>${esc(p)}</td><td>${x.length}</td><td>${brl(v)}</td><td>${T ? Math.round((v / T) * 100) : 0}%</td></tr>`;
  }).join("");
}
function csv() {
  if (!rep.length)
    return notify("Gere um relatório com dados antes de exportar.", "erro");
  const q = (v) => '"' + String(v).replace(/"/g, '""') + '"',
    L = [
      ["Data", "Hora", "Cliente", "Serviços", "Barbeiro", "Forma", "Valor"],
      ...rep.map((a) => [
        fd(a.data),
        hm(a.inicio),
        a.nome,
        a.servicos.join(" + "),
        BARBERS[a.barbeiro].n,
        a.pagamento,
        Number(a.valor).toFixed(2).replace(".", ","),
      ]),
    ];
  const u = URL.createObjectURL(
      new Blob(["\ufeff" + L.map((r) => r.map(q).join(";")).join("\n")], {
        type: "text/csv;charset=utf-8",
      }),
    ),
    a = document.createElement("a");
  a.href = u;
  a.download = `relatorio_${rDe}_a_${rAte}.csv`;
  a.click();
  URL.revokeObjectURL(u);
}

/* ---------- CONFIGURAÇÕES ---------- */
const config =
  () => `<div class="card" style="max-width:720px"><div class="card-b"><label class="sw"><input type="checkbox" id="blk" ${Store.cfg.bloquear ? "checked" : ""}><span><b>Bloquear os horários seguintes</b><br><small>Ligado: se o cliente agenda serviços que somam mais de 30 minutos, os horários seguintes do barbeiro saem da lista até o fim do atendimento. Desligado: só o horário de início é bloqueado.</small></span></label></div></div>
  <div class="card" style="max-width:720px"><div class="card-b"><h2>Formas de pagamento aceitas</h2><p class="hours-note">${PAGAMENTOS.join(" · ")} (edite em config.js e em firestore.rules)</p></div></div>
  <div class="card" style="max-width:720px"><div class="card-b"><h2>Banco de dados</h2><p class="hours-note">${Store.mode === "firestore" ? "Conectado ao Firebase (Firestore). Os dados são compartilhados entre dispositivos." : "Modo demonstração: os dados ficam só neste navegador. Preencha FIREBASE no config.js para usar o Firestore."}</p>
  ${Store.mode === "local" ? '<div class="actions"><button class="btn btn-light" data-a="seed">Recarregar demonstração</button><button class="btn btn-del" data-a="wipe">Apagar todos os dados</button></div>' : ""}</div></div>`;

/* ---------- navegação e eventos ---------- */
const V = { agenda, clientes, reports, config };
function show() {
  document
    .querySelectorAll("#tabs button")
    .forEach((b) => b.setAttribute("aria-current", b.dataset.tab === tab));
  $("view").innerHTML = V[tab]();
  if (tab === "clientes") rows();
  if (tab === "reports") gerar();
}
const shift = (n) => {
  const d = new Date(day + "T12:00");
  d.setDate(d.getDate() + n);
  day = Store.iso(d);
};
$("tabs").onclick = (e) => {
  const b = e.target.closest("button");
  if (b) {
    tab = b.dataset.tab;
    show();
  }
};
document.addEventListener("click", async (e) => {
  const f = e.target.closest("[data-f]");
  if (f) {
    cf = f.dataset.f;
    document
      .querySelectorAll("#cFiltro button")
      .forEach((b) => b.classList.toggle("on", b === f));
    return rows();
  }
  if (e.target.id === "modal") return closeModal();
  const b = e.target.closest("[data-a]");
  if (!b) return;
  const a = b.dataset.a,
    i = b.dataset.id,
    k = b.dataset.k;
  if (a === "close") closeModal();
  if (a === "reset") {
    const em = $("em").value.trim();
    if (!em)
      return ($("le").textContent =
        'Digite seu e-mail acima e toque em "Esqueci minha senha".');
    run(async () => {
      notify(await Store.auth.reset(em));
    });
  }
  if (a === "logout") Store.auth.logout();
  if (a === "hoje") {
    day = today();
    show();
  }
  if (a === "block") {
    const T = targets().filter((x) => !Store.busy(x.data, x.b).has(x.m));
    if (hf !== "" && !T.length)
      return notify("Já existe agendamento ou bloqueio neste horário.", "erro");
    run(() => Store.bloquear(T), `${T.length} horário(s) desativado(s).`);
  }
  if (a === "unblock")
    run(async () => {
      const n = await Store.desbloquear(targets());
      notify(
        n
          ? `${n} horário(s) reativado(s).`
          : "Não há nada desativado neste filtro.",
        n ? "" : "erro",
      );
    });
  if (a === "done") {
    const s = document.querySelector(`select[data-id="${i}"]`);
    run(
      () =>
        Store.atualizar(i, {
          status: "concluido",
          pagamentoForma: s ? s.value : "",
        }),
      "Atendimento concluído e pago.",
    );
  }
  if (a === "noshow")
    run(
      () => Store.arquivar(i, "faltou"),
      "Marcado como falta. O horário foi liberado.",
    );
  if (
    a === "cancel" &&
    confirm("Cancelar este agendamento? O horário volta a ficar disponível.")
  )
    run(() => Store.arquivar(i, "cancelado"), "Agendamento cancelado.");
  if (a === "new") newAppt(+b.dataset.b, +b.dataset.m);
  if (a === "savenew") {
    const l = [...document.querySelectorAll("#nSvcs input:checked")].map(
        (x) => SERVICES[+x.value],
      ),
      nome = cap($("nCli").value),
      m = nSlot.m;
    if (!nome || !l.length)
      return notify("Cliente e ao menos um serviço são obrigatórios.", "erro");
    const min = l.reduce((s, x) => s + x.m, 0),
      tel = $("nTel").value.trim();
    run(async () => {
      await Store.reservar({
        nome,
        tel,
        svc: l.map((x) => ({ nome: x.n, valor: x.p, duracao: x.m })),
        min,
        valor: Number($("nVal").value) || l.reduce((s, x) => s + x.p, 0),
        barbeiro: nSlot.b,
        data: day,
        inicio: m,
        pagamento: "",
      });
      closeModal();
    }, "Agendamento criado.");
  }
  if (a === "hist") hist(k);
  if (a === "tgl") {
    const c = Store.clients.find((x) => x.k === k);
    run(
      () =>
        Store.setClient(k, {
          status: c.status === "ativo" ? "inativo" : "ativo",
        }),
      "Status alterado.",
    );
  }
  if (
    a === "del" &&
    confirm("Excluir este cliente? Os atendimentos continuam nos relatórios.")
  )
    run(() => Store.delClient(k), "Cliente excluído.");
  if (a === "gerar") gerar();
  if (a === "csv") csv();
  if (a === "seed" && confirm("Substituir todos os dados pela demonstração?")) {
    seed();
    notify("Demonstração carregada.");
  }
  if (
    a === "wipe" &&
    confirm("Apagar todos os agendamentos, clientes e bloqueios?")
  ) {
    Store.demo.reset();
    Store.demo.done();
    notify("Dados apagados.");
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});
document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.id === "dataFiltro" && t.value) {
    day = t.value;
    hf = "";
    show();
  }
  if (t.id === "barbFiltro") {
    fb = t.value;
    show();
  }
  if (t.id === "horaFiltro") hf = t.value;
  if (t.id === "blk")
    run(
      () => Store.setCfg({ bloquearSeguintes: t.checked }),
      t.checked
        ? "Horários seguintes serão bloqueados."
        : "Só o horário de início será bloqueado.",
    );
});
document.addEventListener("input", (e) => {
  if (e.target.id === "cBusca") {
    cq = e.target.value;
    rows();
  }
  if (e.target.id === "cTel" || e.target.id === "nTel")
    e.target.value = mask(e.target.value);
});
document.addEventListener("submit", (e) => {
  if (e.target.id !== "clientForm") return;
  e.preventDefault();
  const n = cap($("cNome").value);
  if (!n) return notify("Informe o nome do cliente.", "erro");
  const f = e.target;
  run(async () => {
    if (
      !(await Store.addClient({
        nome: n,
        tel: mask($("cTel").value),
        status: $("cSt").value,
      }))
    )
      throw new Error("Já existe um cliente com este telefone.");
    f.reset();
  }, "Cliente salvo.");
});
