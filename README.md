# Projeto 2027 — Obsidian Nexus Command Center

Sistema de alta performance para gestão pessoal, hábitos, metas de longo prazo, finanças, acervo intelectual e cofre criptográfico com a identidade visual **Obsidian Nexus**.

---

## 🏛️ Estrutura do Projeto

```text
projeto-2027/
├── iniciar_projeto2027.bat   # Launcher automático com 1 duplo clique para Windows
├── database/
│   ├── projeto2027.db        # Banco de dados SQLite principal
│   └── schema.sqlite.sql     # Script SQL de criação das tabelas e índices
├── src/
│   ├── components/           # Componentes visuais modulares
│   │   ├── Sidebar.jsx       # Barra lateral com navegação, operador e status geral
│   │   ├── CommandPalette.jsx # Busca global instantânea (Cmd+K / Ctrl+K)
│   │   ├── TaskCard.jsx      # Card de tarefa com prioridade, prazo e status
│   │   ├── HabitChecklist.jsx # Checklist dos rituais com cálculo dinâmico
│   │   ├── HabitHeatmap.jsx  # Mapa de Calor de Consistência (84 dias) estilo GitHub
│   │   └── WeeklyReviewModal.jsx # Retrospectiva Semanal guiada com telemetria e exportação .md
│   ├── views/                # Telas completas da aplicação
│   │   ├── HubDiario.jsx     # Central do dia: Tarefas editáveis, Hábitos customizados, Diário e Foto do Dia
│   │   ├── Calendario.jsx    # Calendário mensal interativo com agenda e atalho para o Hub
│   │   ├── FocoTotal.jsx     # Modo Foco: Pomodoro, Modo Zen, ondas binaurais (Gamma/Alpha) e notificações
│   │   ├── Metas.jsx         # Painel minimalista de Metas e Vision Board Multi-Ano (2024-2030+)
│   │   ├── Financas.jsx      # Fluxo de caixa, Burn Ratio, exclusão de transações e assinaturas
│   │   ├── SaudeMetricas.jsx # Bio-métricas: peso, sono, hidratação, histórico de treinos e gráficos
│   │   ├── LeituraCinema.jsx # Acervo de livros (+10p, +25p, upload de capas), filmes e séries
│   │   ├── Cofre.jsx         # Notas, Cofre AES-256-GCM, gerador de senhas e backup/restauração JSON
│   │   └── Configuracoes.jsx # Painel de perfil (foto de avatar), temas de cores, Pomodoro e reset total
│   ├── services/             # Lógica de negócio, persistência e segurança
│   │   ├── gamification.js   # Sistema de XP, patentes e progressão de níveis de operador
│   │   ├── theme.js          # Sistema dinâmico de cores de destaque com variáveis CSS
│   │   ├── backend_logic.js  # Cálculos de hábitos e saúde financeira
│   │   ├── cryptoVault.js    # Criptografia ponta a ponta (AES-256-GCM, PBKDF2 100k, gerador de senhas)
│   │   └── db.js             # Repositório de dados com sincronização e persistência
│   ├── App.jsx               # Estrutura principal, atalhos de teclado (1-9) e cabeçalho dinâmico com XP
│   └── main.jsx              # Ponto de entrada React 18
├── server.js                 # API REST nativa Node.js conectada ao SQLite físico
├── index.html                # Shell HTML com Tailwind e tipografia Google Fonts
├── vite.config.js            # Configuração do Vite
├── package.json              # Dependências e scripts do projeto
└── README.md                 # Documentação oficial
```

---

## 🚀 Como Executar a Aplicação

### Método 1: Início Rápido com 1 Duplo Clique (Recomendado)
Basta dar um duplo clique no arquivo:
👉 **`iniciar_projeto2027.bat`**

O script iniciará o servidor e abrirá o aplicativo automaticamente no seu navegador padrão (`http://localhost:3000`).

---

### 🖥️ Inicialização Automática com o Windows
Para que o Nexus Command abra automaticamente sempre que você ligar ou reiniciar o computador:
* **Para ativar**: Dê 2 cliques no arquivo 👉 **`ativar_inicializacao_windows.bat`**. Ele cria o atalho no diretório de inicialização do Windows (`shell:startup`) configurado para rodar silenciosamente em segundo plano via `iniciar_silencioso.vbs`.
* **Para desativar**: Dê 2 cliques em 👉 **`desativar_inicializacao_windows.bat`**.

---

### 📱 Instalação como Aplicativo Nativo de Desktop (PWA)
O Nexus Command possui suporte nativo a **PWA (Progressive Web App)**:
1. Abra o sistema no Chrome, Brave ou Edge.
2. Na barra de endereço, clique no ícone **"Instalar aplicativo"** (ou no menu de 3 pontinhos `⋮` > *Instalar Nexus Command*).
3. O aplicativo passa a rodar em uma janela dedicada sem abas ou barras de navegador, criando um ícone direto na sua Área de Trabalho e no Menu Iniciar do Windows.

---

### Método 2: Iniciar Manualmente via Terminal
```bash
# Iniciar Frontend Vite
npm run dev
```

### ⌨️ Atalhos Globais de Teclado
* `J` ou `j`: Ativar o assistente de voz e IA **J.A.R.V.I.S.** (reconhecimento de fala e HUD tático).
* `⌘K` ou `Ctrl+K`: Abrir a **Paleta de Comandos** global (busca em tarefas, notas, metas e navegação).
* `Q` ou `q`: Abrir a **Captura Rápida Global** (Raycast-style para tarefas, gastos e notas rápidas).
* Teclas `1` a `9` (fora de campos de texto): Navegação instantânea:
  - `1`: Hub Diário (Tarefas, Hábitos, Rituais e Diário)
  - `2`: Calendário Interativo
  - `3`: Modo Foco (Pomodoro, Som Ambiente Binaural & Zen)
  - `4`: Metas & Objetivos (Multi-Ano com capas visuais)
  - `5`: Finanças & Assinaturas
  - `6`: Leitura & Cinema (Acervo com capas)
  - `7`: Cofre & Segundo Cérebro (Exportação .md e AES-256-GCM)
  - `8`: Configurações & Personalização (Temas, Avatar e Reset)
  - `9`: Saúde Física & Bio-Métricas (Sono, Hidratação e Treinos)
* `Espaço` (no Modo Foco): Iniciar / Pausar cronômetro.
* `Esc`: Fechar paletas, capturas e modais.

Endpoints disponíveis:
- `GET /api/health`: Status do servidor e banco SQLite
- `GET /api/daily-logs?date=YYYY-MM-DD` / `POST /api/daily-logs`
- `GET /api/tasks` / `POST /api/tasks` / `PATCH /api/tasks/:id` / `DELETE /api/tasks/:id`
- `GET /api/goals` / `POST /api/goals`
- `GET /api/transactions` / `POST /api/transactions`
- `GET /api/subscriptions` / `POST /api/subscriptions`
- `GET /api/media` / `POST /api/media`
- `GET /api/knowledge` / `POST /api/knowledge`
- `GET /api/vault` / `POST /api/vault` / `DELETE /api/vault/:id`
- `GET /api/backup`: Dump completo de todas as tabelas em formato JSON

---

## 🤖 Assistente Tático J.A.R.V.I.S. & Inteligência Neural

O **J.A.R.V.I.S.** é o assistente inteligente de voz e texto integrado ao Projeto 2027 com a estética futurista **Obsidian Nexus** (ciano elétrico, efeito radar e espectrograma acústico em tempo real).

### 🎙️ Comandos de Voz Nativos (Offline & Imediatos):
* **🎙️ Modo Mãos-Livres (Hands-Free)**: Ative a opção de Wake-Word no HUD ou em Configurações e fale apenas *"Jarvis..."* a qualquer momento para comandar o sistema sem tocar no mouse ou teclado!
* **☀️ Briefing do Dia**: *"Bom dia Jarvis"* ou *"Status do sistema"* — gera um relatório sonoro completo com tarefas pendentes, hábitos cumpridos e saldo em caixa.
* **🎯 Prioridades**: *"O que priorizar hoje?"* ou *"Minhas tarefas"* — lista suas principais demandas filtradas por prioridade.
* **📋 Criar Tarefa**: *"Adicionar tarefa [Título] para [Trabalho/Saúde/Financeiro/Pessoal] com prioridade [alta/média/baixa]"*.
* **✅ Concluir Tarefa**: *"Concluir tarefa [Título]"*.
* **📊 Checagem de Hábitos**: *"Como estão meus hábitos hoje?"* ou *"Concluir hábito [Nome]"*.
* **💰 Finanças e Gastos**: *"Adicionar gasto de 45 reais com almoço"* ou *"Qual o meu saldo do mês?"*.
* **⏱️ Modo Foco**: *"Iniciar pomodoro de 25 minutos"* ou *"Iniciar modo foco"*.
* **⏳ Contagem Regressiva**: *"Quanto tempo falta para 2027?"*.
* **🏆 Patente & XP**: *"Qual é o meu nível e minha patente?"*.
* **🗺️ Navegação Instantânea**: *"Abrir finanças"*, *"Ir para o cofre"*, *"Abrir calendário"*, *"Ver metas"*.

### 🧠 Inteligência Multimodal & Visão Computacional:
* **📷 Leitura de Comprovantes & Notas Fiscais**: Clique no ícone de câmera no J.A.R.V.I.S. HUD e envie a foto de um recibo. A IA extrai automaticamente valor, estabelecimento e categoria, inserindo o gasto diretamente em Finanças.
* **📝 Digitalização de Anotações**: Envie foto de cadernos ou folhas manuscritas para transcrição direta no Cofre.
* **📅 Exportação para Calendários Externos**: No módulo Calendário, clique em *Exportar .ICS* para sincronizar com Google Calendar, Outlook e Apple Calendar.
* **📊 Relatórios Executivos**: Em Configurações e Retrospectiva Semanal, exporte seu progresso em Markdown (.md) para o Obsidian ou gere impressão/PDF limpo.
* **🤖 Assistente Proativo**: Briefing sonoro automático no primeiro acesso do dia e lembrete noturno de hábitos às 19h.

---

## 🛡️ Segurança do Cofre (Zero-Knowledge)

O módulo `src/services/cryptoVault.js` protege as senhas locais:
* **Cifra**: AES-256-GCM com vetores de inicialização (IV) aleatórios de 12 bytes gerados via Web Crypto API.
* **Derivação de Chave (KDF)**: PBKDF2 com 100.000 iterações de HMAC-SHA-256 e salt exclusivo de 16 bytes.
* **Privacidade**: A Senha Mestra é processada exclusivamente na memória do cliente e nunca é persistida em texto plano.
* *Senha Mestra padrão para demonstração inicial*: `Master2027!`

---

## 📊 Regras de Negócio Centrais

* **Hábitos diários**: O serviço calcula a pontuação estrita de 0 a 7 a partir dos 7 rituais (`h_sleep_8h`, `h_morning_routine`, `h_exercise_1h`, `h_read_30m`, `h_healthy_diet`, `h_water_2l`, `h_plan_tomorrow`) alimentando em tempo real o gauge circular.
* **Saúde Financeira**: Calcula a proporção de queima de caixa (*Burn Ratio*) entre Gastos e Receitas, indicando zonas de segurança e status de alavancagem.
