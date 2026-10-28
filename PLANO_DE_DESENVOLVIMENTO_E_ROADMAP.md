# 🚀 Plano Estratégico de Desenvolvimento, Otimizações e Roadmap — tClavis v2.0

> **Documento Gerado:** Outubro de 2026  
> **Status:** Ativo & Em Execução  
> **Autor / Mantenedor:** Tiago Treter & Antigravity AI  
> **Projeto:** tClavis — Gestor Centralizado & Sincronizador de Hotspot MikroTik  

---

## 📌 Sumário Executivo

O **tClavis** é uma solução para administração de redes MikroTik RouterOS distribuídas, atuando na abstração, sincronização em tempo real e auditoria de paridade de contas Hotspot sem a complexidade operacional de servidores RADIUS externos.

Este documento consolida:
1. **Diagnóstico Técnico Aprofundado:** Análise detalhada do código-fonte (arquitetura, concorrência, banco de dados, segurança e comunicação de rede).
2. **Gargalos, Vulnerabilidades e Correções Imediatas:** Identificação de pontos críticos de falha e soluções aplicadas.
3. **Novas Funcionalidades e Diferenciais Competitivos:** Recursos essenciais para ambientes corporativos, hoteleiros e eventos.
4. **Planejamento e Checklist em Etapas:** Roteiro progressivo com tarefas acionáveis para guiar as próximas versões do aplicativo.

---

## 🔍 1. Diagnóstico Técnico Aprofundado do Código Atual

### 1.1 Camada de Persistência e Banco de Dados (`src/main/db/database.ts`)
* **Estado Atual:** Utiliza `sql.js` (SQLite compilado em WebAssembly) mantido em memória e serializado via `fs.writeFileSync(this.dbPath, buffer)` a cada alteração (`save()`).
* **Pontos Fortes:** Portabilidade instantânea sem compilações nativas (C++) no Electron e sem dependências de binários externos.
* **Gargalos Identificados:**
  * **I/O Bloqueante:** A cada inserção de usuário, alteração de status de roteador ou item da fila, o arquivo `.db` inteiro é reescrito no disco de forma síncrona, consumindo I/O e gerando risco de corrupção se o app for encerrado abruptamente durante o salvamento.
  * **Concorrência:** Não possui suporte nativo a WAL mode (*Write-Ahead Logging*).
  * **Correção Imediata Realizada:** Foi implementado o método `enqueueSync(routerId, action, payload)`, que estava ausente e causava exceção de runtime durante a importação de usuários com a opção `syncToOtherRouters: true`.

### 1.2 Protocolo de Comunicação MikroTik (`ros-client.ts` e `ros-rest-client.ts`)
* **Estado Atual:**
  * `ros-client.ts`: Implementa o protocolo binário proprietário da MikroTik (portas 8728 e 8729 TLS), suportando autenticação moderna e desafio legado MD5 (RouterOS <= 6.42).
  * `ros-rest-client.ts`: Cliente HTTP/HTTPS REST para RouterOS v7.1+.
* **Gargalos Identificados:**
  * **Dead Code:** `ros-rest-client.ts` não está conectado ao `sync-engine.ts`. O app usa exclusivamente o protocolo binário por socket.
  * **Race Conditions no Socket:** No `RosClient`, cada conexão processa estritamente um comando por vez (`if (this.currentPromise) throw new Error(...)`). Quando múltiplos processos do Electron (ex: teste manual do usuário + worker de fila de fundo) requisitam o mesmo cliente do pool, ocorre rejeição não tratada de comando concorrente.
  * **Falta de Mutex:** É necessário um semáforo/mutex por socket para enfileirar comandos sequencialmente em vez de rejeitar.

### 1.3 Motor de Sincronização e Worker (`sync-engine.ts` e `sync-worker.ts`)
* **Estado Atual:** Pool de conexões com expiração por inatividade (15s/60s), fila de retry com backoff exponencial (30s, 60s, 120s, 300s) e auditoria de paridade (Diff Checker).
* **Gargalos Identificados:**
  * **Reprocessamento Não Segmentado:** No `sync-worker.ts`, quando um item pendente da fila de um roteador específico é reprocessado, o worker chama `syncEngine.syncUserToCluster(user)`, o que dispara a sincronização para **todos** os roteadores do cluster, e não apenas para aquele que havia falhado.
  * **Multiplicação de Itens na Fila:** Se outro roteador falhar durante essa chamada secundária, novos itens de fila são inseridos desnecessariamente.

### 1.4 Segurança e Cofre de Credenciais (`src/main/security/crypto.ts`)
* **Estado Atual:** Tenta usar `safeStorage` (DPAPI no Windows / Keychain no macOS) e recorre a AES-256-GCM com chave derivada da máquina.
* **Gargalos Identificados:**
  * **Portabilidade de Backup:** Se o usuário exportar o backup do tClavis em um computador e importar em outro, as senhas criptografadas com DPAPI ou com o `MACHINE_SEED` (`hostname_platform_arch`) não poderão ser decifradas na nova máquina, quebrando o acesso aos roteadores.
  * **Backup sem Senha:** O arquivo `tclavis-backup.json` exporta senhas e tokens em texto aberto ou cifras ilegíveis sem senha mestra do operador.

### 1.5 Interface do Usuário e Frontend (`src/renderer/src/`)
* **Estado Atual:** React 18, Vite 6, Tailwind CSS com tema escuro e ícones Lucide.
* **Gargalos Identificados:**
  * **`App.tsx` Sobrecarragado:** Concentra mais de 680 linhas gerenciando 8 modais simultaneamente via `useState`, o que provoca renderizações desnecessárias.
  * **Voucher com QR Code Simulado:** O gerador de vouchers exibe um ícone vetorial estático `<QrCode />`, sem renderizar uma imagem QR Code real utilizável para leitura óptica em celulares.
  * **Sessões Ativas sem Polling Configurável:** As sessões ativas só atualizam com clique manual do operador.

---

## 💡 2. Sugestões de Melhorias, Otimizações e Novas Funções

### 2.1 Novas Funcionalidades de Alto Impacto (Faltantes no App)

1. **Gerador de QR Code Real para Vouchers & Wi-Fi Easy Connect:**
   * Geração visual de QR Code real em cada voucher (utilizando `qrcode` / `canvas`).
   * **Modo 1 (URL Hotspot):** Redireciona o celular diretamente para a URL de login: `http://<ip-roteador>/login?username=X&password=Y`.
   * **Modo 2 (Wi-Fi Easy Connect):** Formato padrão `WIFI:T:WPA;S:NomeDaRede;P:senha;;` para conexão com um clique.

2. **Módulo de Impressão Térmica Dedicada (58mm e 80mm ESC/POS) e Exportação PDF:**
   * Layout CSS responsivo com estilo `@media print` otimizado para rolos de bobina térmica padrão de ponto de venda (58mm e 80mm).
   * Impressão sem cabeçalho/rodapé do navegador e com corte automático de papel.
   * Exportação do lote gerado para arquivo PDF e planilha CSV.
   * Personalização de cabeçalho (Nome do Estabelecimento, Logotipo, SSID e Termos de Uso).

3. **Ações em Massa (Batch Operations) na Tabela de Usuários:**
   * Checkbox de seleção múltipla (Selecionar Todos / Inverter Seleção).
   * Botões de ação rápida:
     * 🗑️ *Excluir selecionados*
     * 🔄 *Sincronizar selecionados*
     * 🏷️ *Trocar perfil/grupo dos selecionados*
     * ⏸️ *Habilitar / Desabilitar selecionados*

4. **Painel de Tráfego e Monitoramento em Tempo Real:**
   * Gráficos dinâmicos de consumo de banda por roteador (Download/Upload em Mbps).
   * Contador histórico de usuários ativos ao longo das últimas 24 horas.
   * Indicador visual de consumo de CPU e RAM de cada caixa MikroTik conectada.

5. **Multi-Cluster / Gestão Multi-Sites:**
   * Possibilidade de criar e alternar entre múltiplos clusters lógicos (ex: "Cluster Hotel Matriz", "Cluster Filial Shopping", "Cluster Eventos").
   * Roteadores isolados por cluster para empresas com unidades independentes.

6. **Log de Auditoria e Histórico de Ações (Activity Feed):**
   * Registro histórico com timestamp e usuário de cada evento:
     * *Criação/Exclusão de usuário*
     * *Tentativa e falha de sincronização*
     * *Desconexão forçada de cliente (Kick)*
     * *Restauração de backup*
   * Filtro de logs com exportação em `.csv`.

7. **Descoberta Automática de MikroTiks na Rede Local (MNDP):**
   * Envio de pacote UDP broadcast na porta 5678 para detectar automaticamente roteadores MikroTik na rede local (IP, Identity, RouterOS Version e MAC).
   * Botão "Detectar Roteadores na LAN" no modal de adição de MikroTik.

8. **Backup Criptografado com Senha Mestra:**
   * Opção de exportar o backup protegido com senha mestra definida pelo usuário (criptografia AES-256 via Argon2/PBKDF2).
   * Permite migrar roteadores e senhas com segurança total entre máquinas e técnicos diferentes.

---

## ⚡ 3. Otimizações de Desempenho e Arquitetura

1. **Motor Híbrido de Comunicação (Dual Driver: Binary + REST API):**
   * Roteadores com **RouterOS v7.1+**: priorizar chamadas HTTP REST (`/rest/ip/hotspot/user`) com HTTP Keep-Alive, que oferecem maior velocidade e dispensam manipulação de pacotes binários brutos.
   * Roteadores com **RouterOS v6.x**: manter o driver binário nativo via TCP 8728 / SSL 8729.

2. **Mutex de Socket e Fila de Concorrência:**
   * Implementação de fila sequencial no `RosClient`. Se duas requisições simultâneas chegarem para o mesmo roteador, a segunda aguarda a conclusão da primeira sem gerar erro.

3. **Segmentação da Fila de Sincronização (`syncUserToSingleRouter`):**
   * Refatoração para que o `sync-worker.ts` sincronize exclusivamente o `routerId` alvo do item da fila, evitando tráfego e requisições repetidas nos roteadores que já receberam os dados com sucesso.

4. **Gerenciamento de Estado Global no Frontend:**
   * Extração do estado de modais e dados de `App.tsx` para stores leves (ex: Zustand ou React Context dedicado com reducers).

---

## 📋 4. Checklist de Desenvolvimento em Etapas

### 🚀 ETAPA 1: Estabilidade do Núcleo e Correção de Gargalos Críticos
*Meta: Eliminar pontos únicos de falha e garantir estabilidade operacional 100% livre de exceções.*

- [x] **1.1** Resolver erro de tipagem no TypeScript (`App.tsx` com caminho de importação incorreto para `types.ts`).
- [x] **1.2** Implementar método `enqueueSync` em `database.ts` para sanar quebra de execução na importação de usuários.
- [x] **1.3** Remover textos e referências fixas (hardcoded) no modal de auditoria de paridade (`ParityAuditModal.tsx`).
- [x] **1.4** Implementar Mutex/Queue interno no `RosClient` para proteger chamadas simultâneas de comandos no mesmo socket.
- [x] **1.5** Criar método `syncUserToSingleRouter(routerId, user)` no `SyncEngine` para que a fila de retry não reenvie dados a caixas já sincronizadas.
- [x] **1.6** Adicionar tratamento contra duplicação de itens na fila `sync_queue` durante falhas sucessivas.
- [x] **1.7** Implementar sanitização e proteção contra travamentos quando o roteador retornar caracteres especiais ou codificação ISO-8859-1 em comentários e nomes.

---

### 🖨️ ETAPA 2: Módulo Avançado de Vouchers, Impressão Térmica e QR Code Real
*Meta: Transformar a emissão de vouchers em uma ferramenta completa para recepção, hotéis e comércios.*

- [x] **2.1** Integrar biblioteca de renderização de QR Code (`qrcode` / `@types/qrcode`) no bundle do Renderer.
- [x] **2.2** Gerar QR Code real em cada cartão de voucher contendo o link de autenticação direta ou dados da rede Wi-Fi.
- [x] **2.3** Criar template de impressão térmica para bobinas de **58mm** (mini impressoras POS USB/Bluetooth).
- [x] **2.4** Criar template de impressão térmica para bobinas de **80mm** (padrão Bematech, Elgin, Epson).
- [x] **2.5** Criar seletor de layout no cabeçalho: "Bobina Térmica 58mm", "Bobina Térmica 80mm" e "Folha A4 em Grade (Cartões)".
- [x] **2.6** Incluir personalização do cabeçalho do voucher: Nome da Empresa, Nome da Rede Wi-Fi (SSID) e Termos de Uso.
- [x] **2.7** Adicionar botão de exportação da lista de vouchers em formato **CSV** e **PDF**.
- [x] **2.8** Permitir expiração do voucher por data/hora fixa além do limite por tempo de uso (`limit-uptime`).

---

### 👥 ETAPA 3: Ações em Massa e Usabilidade da Tabela de Usuários
*Meta: Proporcionar agilidade no gerenciamento de bases com centenas ou milhares de contas.*

- [x] **3.1** Adicionar coluna de seleção (checkbox) em cada linha da tabela de usuários.
- [x] **3.2** Adicionar checkbox no cabeçalho com suporte a "Selecionar Todos", "Limpar Seleção" e contador de selecionados.
- [x] **3.3** Implementar barra de ações flutuante ao selecionar um ou mais usuários:
  - [x] Exclusão em lote com confirmação única.
  - [x] Re-sincronização forçada dos usuários selecionados.
  - [x] Mudança de Grupo Lógico / Perfil em lote.
  - [x] Habilitação / Desabilitação rápida em lote.
- [x] **3.4** Adicionar filtro avançado por status de sincronização: "Todos", "100% Síncronos", "Com Pendências" ou "Com Erro".
- [x] **3.5** Implementar paginação ou virtualização de lista para manter performance fluida com mais de 5.000 usuários.

---

### 🌐 ETAPA 4: Conexão Híbrida (REST API v7 + Binary v6) e Descoberta de Rede
*Meta: Maximizar a velocidade de sincronização e facilitar o onboarding de novas caixas.*

- [x] **4.1** Integrar `ros-rest-client.ts` ao fluxo do `SyncEngine` com auto-detecção da versão do RouterOS.
- [x] **4.2** Utilizar a API REST nativa em caixas RouterOS v7.1+, garantindo transações HTTP rápidas e sem overhead de sockets.
- [x] **4.3** Implementar mecanismo de fallback automático para o cliente binário caso a porta REST esteja desativada.
- [x] **4.4** Criar detector de roteadores na rede local via broadcast UDP MNDP (MikroTik Neighbor Discovery Protocol) na porta 5678.
- [x] **4.5** Adicionar botão "Escanear Rede Local" no modal de cadastro de roteador para autopreenchimento de IP e modelo.

---

### 📊 ETAPA 5: Monitor de Tráfego em Tempo Real, Sessões e Multi-Cluster
*Meta: Fornecer observabilidade ativa da rede e flexibilidade para múltiplos clientes ou unidades.*

- [x] **5.1** Adicionar seletor de auto-atualização na tela de Sessões Ativas (Desativado, a cada 5s, 10s, 30s).
- [x] **5.2** Adicionar campo de busca rápida por IP, MAC ou Nome de Usuário na tela de Sessões Ativas.
- [x] **5.3** Criar métricas de volume agregado de download e upload em tempo real na tela de Sessões e Dashboard.
- [x] **5.4** Implementar suporte a visualização e filtragem Multi-Cluster / Multi-Site.
- [x] **5.5** Adicionar monitor de recursos de hardware de cada roteador (CPU %, latência, status operacional).

---

### 🛡️ ETAPA 6: Auditoria Contínua, Logs de Atividade e Segurança de Backups
*Meta: Atender a requisitos de compliance corporativo, rastreabilidade e recuperação de desastres.*

- [x] **6.1** Criar tela e rotinas de **Logs de Auditoria & Eventos** com tabela filtrável por data, tipo de ação e status.
- [x] **6.2** Registrar todo evento operacional (criação de usuário, edição de senha, expurgo de órfãos, queda de roteador, kick).
- [x] **6.3** Adicionar agendador de Auditoria de Paridade em segundo plano com notificações nativas do sistema operacional no caso de divergências.
- [x] **6.4** Implementar exportação de backup protegida por senha com derivação de chave AES-256 (Scrypt + GCM).
- [x] **6.5** Implementar rotina de importação de backup independente da máquina de origem, solicitando a senha mestra se o arquivo estiver cifrado.
- [x] **6.6** Adicionar opção de "Limpar Dados de Demonstração" nas configurações para novas instalações limpas.

---

## 📈 5. Cronograma Recomendado de Implementação

| Sprint / Fase | Foco Principal | Prazo Estimado | Entregáveis Principais |
| :--- | :--- | :---: | :--- |
| **Fase 1** | Estabilidade & Correções de Núcleo | Sprint 1 | Mutex de socket, segmentação de fila e robustez contra erros |
| **Fase 2** | Vouchers & Impressão Térmica | Sprint 2 | QR Code real, templates 58mm/80mm e exportação PDF/CSV |
| **Fase 3** | Ações em Massa & Usabilidade | Sprint 3 | Multi-seleção, operações em lote e filtros avançados |
| **Fase 4** | Driver Híbrido REST v7 & Descoberta | Sprint 4 | Sincronização ultrarrápida via REST API e descoberta MNDP |
| **Fase 5** | Monitoramento & Multi-Cluster | Sprint 5 | Gráficos em tempo real, auto-refresh de sessões e multi-site |
| **Fase 6** | Auditoria, Logs & Backup Seguro | Sprint 6 | Feed de logs, backup cifrado e auditoria periódica |

---

## 🎯 Conclusão

Com a execução deste plano de melhorias, o **tClavis** consolida-se como a ferramenta definitiva e mais ágil do mercado para gestão descentralizada de Hotspots MikroTik, entregando confiabilidade empresarial, praticidade para operadores de atendimento e total segurança de dados.
