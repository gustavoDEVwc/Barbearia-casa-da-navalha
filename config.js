/* =====================================================
   CONFIG.JS: tudo que muda de um cliente para outro.
   Edite aqui; não é preciso mexer no HTML, CSS ou script.js.
   (Dados fictícios de demonstração.)
   ===================================================== */
const SITE={
  nome:['Casa','Navalha'],               // logo: 2ª palavra fica em cobre
  titulo:'Casa Navalha | Barbearia com agendamento online',
  /* SEO local: dados estruturados (BarberShop) gerados automaticamente a partir deste arquivo.
     Mantenha schema:false enquanto os dados forem fictícios; ligue (true) no site de um cliente real. */
  seo:{url:'https://gustavodevwc.github.io/Barbearia-casa-da-navalha/',schema:false,telefone:'+55-00-00000-0000',rua:'Rua das Acácias, 120',cidade:'Cidade Exemplo',uf:'UF',cep:'00000-000',faixaPreco:'$$'},
  demoOcupacao:true,                     // true: finge alguns horários ocupados (só para demonstrar)
  heroImg:'img/background.jpg',          // imagem de fundo do topo
  navServicos:'Serviços',navInfo:'Mais informações',navAgendar:'Agendar',
  ctaHero:'Agendar meu horário →',proximosTitulo:'Próximos horários livres',
  servicosTitulo:'Nossos serviços',
  servicosTexto:'Arraste, use as setas ou o teclado. Pode escolher mais de um serviço: o valor e o tempo são somados.',
  infoTitulo:'Mais informações',agendarTitulo:'Reserve seu horário',
  heroTitulo:'Corte com calma. Barba com <em>régua.</em>',
  heroTexto:'Barbearia de bairro com hora marcada de verdade: escolha o serviço, o barbeiro e o horário aqui mesmo.',
  endereco:['Rua das Acácias, 120 — Centro','Cidade Exemplo · UF'],
  contato:['(00) 0000-0000','contato@casanavalha.exemplo'],
  extras:['Estacionamento conveniado na esquina.'],
  regras:['Chegue 5 minutos antes. Cancelamento ou troca sem custo até 2 horas antes do horário.','Aceitamos Pix, débito e crédito.','Atendemos crianças a partir de 5 anos.'],
  rodape:'© Casa Navalha. Site-modelo: nomes, endereço, preços e horários são fictícios.',
  avisoRodape:'Nenhum dado digitado aqui é enviado ou salvo.',
  frasesFaixa:['Corte clássico','Barba toalha quente','Degradê navalhado','Pigmentação','Sobrancelha','Hidratação']
};

const PAGAMENTOS=['Pix','Dinheiro','Cartão de débito','Cartão de crédito']; // pagamento no local
const ADMIN={email:'admin@casanavalha.exemplo',senha:'admin123'}; // acesso de DEMONSTRAÇÃO do painel (admin.html)

/* ===== BANCO DE DADOS =====
   Vazio (apiKey: '') = modo demonstração, dados só no navegador.
   Para produção, crie um projeto no Firebase (Firestore + Authentication por e-mail/senha),
   cole aqui a configuração do app Web e publique o arquivo firestore.rules. */
const FIREBASE={apiKey:'',authDomain:'',projectId:'',storageBucket:'',messagingSenderId:'',appId:''};
const JANELA_DIAS=120; // o painel carrega os agendamentos dos últimos N dias (e os futuros)

const SERVICES=[
 {n:'Corte Clássico',d:'Tesoura e máquina, finalizado com navalha na nuca e laterais.',m:40,p:55},
 {n:'Barba Toalha Quente',d:'Toalha quente, óleo pré-barba, navalha e balm hidratante.',m:30,p:45},
 {n:'Corte + Barba',d:'O combo completo, no mesmo horário e com o mesmo barbeiro.',m:70,p:90},
 {n:'Degradê Navalhado',d:'Degradê preciso com acabamento a navalha e contorno limpo.',m:50,p:65},
 {n:'Pigmentação de Barba',d:'Preenche falhas e realça o desenho, com efeito natural.',m:40,p:60},
 {n:'Hidratação Capilar',d:'Tratamento para fio ressecado, com massagem no couro cabeludo.',m:30,p:40},
 {n:'Sobrancelha',d:'Alinhamento na navalha ou na pinça, sem exageros.',m:15,p:20}
];
const BARBERS=[ // foto e nome aparecem como botões no agendamento
 {id:'rafa',n:'Rafa',img:'img/barbeiro_1.jpeg'},
 {id:'dudu',n:'Dudu',img:'img/barbeiro_2.jpeg'},
 {id:'marcio',n:'Márcio',img:'img/barbeiro_3.jpg'}
];
const HOURS={0:null,1:null,2:[9,20],3:[9,20],4:[9,20],5:[9,20],6:[8,18]};
const WD=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
