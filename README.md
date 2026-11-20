# Casa Navalha: site-modelo de barbearia

Modelo de site para barbearias com **agendamento online** e **painel administrativo**.
Todos os nomes, preços, endereço e horários são **fictícios**. É um template para adaptar a cada cliente.

**Demonstração:** https://[SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/](https://gustavodevwc.github.io/Barbearia-casa-da-navalha/)
**Painel (demo):** `/admin.html` com `admin@casanavalha.exemplo` / `admin123` (aparecem na tela de login)

## O que tem
**Site**
- Topo com imagem de fundo e os próximos horários livres, clicáveis
- Faixa de serviços em loop infinito e carrossel de serviços estilo Netflix (setas, arrastar com o mouse, teclado)
- Agendamento em 6 passos: vários serviços (soma valor e duração), barbeiro com foto, dia, horário, forma de pagamento e dados
- Horários seguintes ficam indisponíveis quando o atendimento dura mais de 30 minutos
- Bloco "Mais informações" com horário de funcionamento e status "aberto agora"
- Responsivo (mobile first), SEO básico, compartilhamento com pré-visualização

**Painel**
- Login por e-mail e senha, agenda em colunas por barbeiro, desativar e reativar horários, novo agendamento no balcão
- Receber pagamento (Pix, dinheiro, débito, crédito), cancelar, marcar falta
- Clientes com histórico, relatórios por período (faturamento por serviço, por forma de pagamento) e relatório detalhado com filtro e exportação em CSV

## Tecnologias
HTML, CSS e JavaScript puros (sem build). Dados em **Firebase (Firestore + Authentication)** ou em modo demonstração (`localStorage`).

## Estrutura
```
index.html  admin.html  404.html  robots.txt  sitemap.xml  favicon.svg  firestore.rules
css/   style.css (site) · admin.css (painel)
js/    config.js (TUDO que muda por cliente) · store.js (camada de dados) · script.js (site) · admin.js (painel)
img/   fotos, imagem de compartilhamento e ícone
```

## Rodar localmente
Abra a pasta com um servidor estático (extensão Live Server do VS Code, ou `python -m http.server`) e acesse `http://localhost:8000`.
Sem preencher o Firebase, tudo funciona em **modo demonstração**: os dados ficam só no navegador.

## Publicar no GitHub Pages
1. Crie um repositório e envie estes arquivos na **raiz** (o `index.html` precisa ficar na raiz).
2. Settings → Pages → *Deploy from a branch* → `main` / `(root)`.
3. O endereço será `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.
4. **Troque o endereço de exemplo** pelo real nestes arquivos (procure por `SEU-USUARIO`): `index.html` (canonical, og:url, og:image, twitter:image), `404.html`, `sitemap.xml`, `robots.txt`, `js/config.js` (`SITE.seo.url`) e este README.
5. Opcional: cadastre o site no Google Search Console e envie o `sitemap.xml`.

## Colocar um cliente real no ar (Firestore)
1. Firebase Console: criar projeto; ativar **Firestore** e **Authentication** (e-mail/senha e também **Anônimo**, usado pelo site para reservar).
2. Authentication → Users: criar o usuário do dono e copiar o **UID**.
3. `firestore.rules`: trocar `COLE_AQUI_O_UID_DO_ADMIN` pelo UID; conferir `barbeiros()` e `formas()` (iguais ao `config.js`); publicar as regras.
4. `js/config.js`: colar a configuração do app Web em `FIREBASE` e ajustar nome, textos, serviços, barbeiros (`id` sem espaços ou acentos), horários e pagamentos.
5. Authentication → Settings → **Authorized domains**: adicionar o domínio onde o site será publicado.
6. Ligar o SEO local: em `SITE.seo`, preencher telefone e endereço reais e trocar `schema:false` por `schema:true`.

> **Portfólio público:** publique em modo demonstração (`FIREBASE.apiKey` vazio). Com o Firebase ligado, qualquer visitante consegue criar reservas no seu banco.

## Como os dados ficam no Firestore
- `ocupacao`: pública, sem dados pessoais (dia, hora, barbeiro, duração). É o que o site lê.
- `agendamentos`: dados do cliente; só o painel lê e altera. O id (`ag_DATA_HORA_barbeiro`) impede duas reservas no mesmo início.
- `clientes`: criados pelo painel a partir dos agendamentos (ou cadastrados à mão).
- `config/geral`: opção "bloquear horários seguintes".
- Cancelamentos e faltas ficam em `agendamentos` com id `arq_...` (histórico) e liberam o horário.

## Limites conhecidos
- Dois clientes reservando intervalos que se sobrepõem no mesmo instante podem passar pela checagem do navegador; a regra só impede o mesmo horário de início.
- O painel carrega os últimos `JANELA_DIAS` dias de agendamentos (`config.js`).
- A senha do painel em modo demonstração fica no código e **não é segurança**; em produção o login é feito pelo Firebase Authentication.

## Imagens
As fotos em `img/` (fundo e barbeiros) são de demonstração. Antes de usar em um site comercial, troque por fotos próprias ou com licença de uso (por exemplo, Unsplash ou Pexels) e registre o crédito aqui.
