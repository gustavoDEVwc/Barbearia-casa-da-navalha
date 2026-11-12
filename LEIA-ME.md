# Casa Navalha: modelo de site de barbearia

## Estrutura
- `index.html` site público (agendamento) · `admin.html` painel
- `js/config.js` TUDO que muda por cliente: nome, textos, serviços, barbeiros, horários, pagamentos, Firebase
- `js/store.js` camada de dados (demonstração em localStorage ou Firestore)
- `firestore.rules` regras de segurança do Firestore

## Modo demonstração (padrão)
Com `FIREBASE.apiKey` vazio, tudo funciona sem backend, só neste navegador.
Painel: `admin@casanavalha.exemplo` / `admin123` (definidos em `ADMIN`, no config.js).

## Colocar um cliente no ar (Firestore)
1. Firebase Console: criar projeto; ativar **Firestore** e **Authentication** (e-mail/senha e também **Anônimo**, usado pelo site para reservar).
2. Authentication > Users: criar o usuário do dono; copiar o **UID**.
3. `firestore.rules`: trocar `COLE_AQUI_O_UID_DO_ADMIN` pelo UID; conferir `barbeiros()` e `formas()` (iguais ao config.js); publicar as regras.
4. `js/config.js`: colar a configuração do app Web em `FIREBASE` e ajustar nome, serviços, barbeiros (`id` sem espaços ou acentos), horários e pagamentos.
5. Publicar a pasta em qualquer hospedagem estática (Firebase Hosting, Netlify...).

## Como os dados ficam
- `ocupacao`: pública, sem dados pessoais (dia, hora, barbeiro, duração). É o que o site lê.
- `agendamentos`: dados do cliente; só o painel lê e altera. O id (`ag_DATA_HORA_barbeiro`) impede duas reservas no mesmo início.
- `clientes`: criados pelo painel a partir dos agendamentos (ou cadastrados à mão).
- `config/geral`: opção "bloquear horários seguintes".
- Cancelamentos e faltas ficam em `agendamentos` com id `arq_...` (histórico) e liberam o horário.

## Limites conhecidos
- Dois clientes reservando intervalos que se sobrepõem no mesmo instante podem passar pela checagem do navegador; a regra só impede o mesmo horário de início.
- O painel carrega os últimos `JANELA_DIAS` dias (config.js) de agendamentos.
