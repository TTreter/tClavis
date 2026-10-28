# 🛡️ Auditoria de Segurança, Controle de Acesso (PIN) & Checklist de Atualizações

> **Documento:** Auditoria e Especificação Técnica de Segurança  
> **App:** tClavis — MikroTik Hotspot Multi-Router Sync Manager  
> **Data:** Outubro de 2026  
> **Status:** Concluído (v2.1.0)  

---

## 🔍 1. Diagnóstico de Segurança do Aplicativo Atual

Uma auditoria minuciosa na arquitetura atual identificou as seguintes vulnerabilidades e pontos de atenção:

### 🔴 1. Ausência de Controle de Acesso Local (Console Aberto)
* **Vulnerabilidade:** Qualquer pessoa com acesso físico ao computador onde o tClavis está instalado pode abrir o executável, visualizar usuários, excluir contas, alterar senhas no cluster MikroTik ou adicionar novos roteadores sem qualquer barreira de identificação.
* **Solução:** Implementação de um **PIN Mestre de Segurança** de 4 a 8 dígitos, exigido no primeiro acesso após a instalação e necessário para autorizar qualquer operação de escrita ou visualização de senhas.

### 🔴 2. Exposição Indiscriminada de Senhas em Tela
* **Vulnerabilidade:** O botão do olhinho (`👁️`) na tabela de usuários permitia revelar senhas instantaneamente para qualquer espectador próximo à tela (*shoulder surfing*).
* **Solução:** Mascaramento estrito de senhas. Para revelar a senha ou abrir o formulário de edição, o operador deve estar em uma **Sessão Desbloqueada por PIN** válida.

### 🔴 3. Sessão sem Expiração Automática
* **Vulnerabilidade:** Se um operador desbloqueasse o app pela manhã, o sistema permaneceria permanentemente vulnerável caso o operador se ausentasse da mesa.
* **Solução:** **Sessão Temporizada com Auto-Bloqueio (5 Minutos):** Ao digitar o PIN correto, o operador ganha um passe livre de autorização válido por exatamente 5 minutos (configurável). Após esse período, o tClavis auto-bloqueia silenciosamente a visualização de senhas e a edição, exigindo o PIN novamente para novas alterações.

### 🔴 4. Poluição de Memória no MikroTik por Vouchers Obsoletos
* **Vulnerabilidade:** Vouchers temporários que venceram ou que foram gerados para eventos e nunca chegaram a ser conectados continuam residindo indefinidamente na memória RAM/Flash do RouterOS. Isso reduz a performance das caixas e polui as tabelas de IP/Host.
* **Solução:** **Módulo de Expurgo Inteligente (Purge):** Varredura e remoção segura em lote de:
  1. Vouchers nunca utilizados (`uptime = 0s`) criados há mais de X dias.
  2. Vouchers com tempo de validade 100% esgotado (`uptime >= limit-uptime`).

### 🔴 5. Falta de Gestão de Ciclo de Vida do Processo
* **Vulnerabilidade:** Ao clicar no "X", o app fechava completamente, interrompendo o monitor de background e a fila de retry do cluster.
* **Solução:** Adição de configurações para **Minimizar para a Bandeja do Sistema (Tray)** ao fechar e opção de **Iniciar com o Windows**.

### 🔴 6. Ausência de Atualizador Integrado (Update Mechanism)
* **Problema:** Usuários precisam verificar manualmente o repositório do GitHub para saber se há correções de segurança ou novas versões, e baixar instaladores manualmente.
* **Solução:** **Sistema de Auto-Atualização Integrado com GitHub Releases:**
  1. Verificação automática e manual de novas versões via GitHub API (`TTreter/tClavis`).
  2. Comparação de semver (`tag_name` vs `app.getVersion()`).
  3. Exibição das novidades/changelog da versão.
  4. Download direto do instalador com barra de progresso em tempo real.
  5. Acionamento do instalador e reinicialização com 1 clique.

---

## 🏗️ 2. Arquitetura da Solução de Segurança

### 2.1 Armazenamento Seguro do PIN no SQLite (`app_settings`)
O PIN **NUNCA** é armazenado em texto puro. O tClavis gera um salt criptográfico aleatório de 16 bytes e deriva a chave usando **Scrypt** (função com resistência comprovada a ataques de força bruta por GPU/ASIC):
$$\text{Hash} = \text{scrypt}(\text{PIN}, \text{Salt}, 32)$$

Ao validar o PIN digitado, o sistema calcula o hash com o salt armazenado e compara em tempo constante para evitar ataques de temporização (*timing attacks*).

### 2.2 Estrutura da Sessão Temporizada
```
[Operador clica em Editar / Ver Senha]
                  │
                  ▼
         ¿Sessão está ativa?
         (Agora < unlockedUntil)
            /           \
          SIM           NÃO
          /               \
         ▼                 ▼
[Ação Executada]    [Exibir Modal de PIN]
                           │
                           ▼
                   ¿PIN Correto?
                     /       \
                   SIM       NÃO
                   /           \
                  ▼             ▼
      [Define unlockedUntil    [Exibir Alerta de Erro]
       = Agora + 5 minutos]
                  │
                  ▼
           [Ação Executada]
```

### 2.3 Arquitetura do Atualizador via GitHub Releases
```
[App Inicia ou Operador Clica em "Verificar Atualizações"]
                           │
                           ▼
          [Requisição GET GitHub Releases API]
           api.github.com/repos/TTreter/tClavis/releases/latest
                           │
                           ▼
          ¿Versão Remota > Versão Local?
                     /           \
                   NÃO           SIM
                   /               \
                  ▼                 ▼
         ["App Atualizado"]   [Exibir Modal / Card com Changelog]
                                    │
                                    ▼
                         [Operador Clica em "Baixar"]
                                    │
                                    ▼
                         [Download com Progresso (%)]
                         Salva em %TEMP%/tClavis-Setup.exe
                                    │
                                    ▼
                         [Download Concluído]
                         ["Instalar e Reiniciar Agora"]
                                    │
                                    ▼
                         [Executa Instalador e Encerra App]
```

---

## 📋 3. Checklist de Desenvolvimento

### 🔒 Módulo A: Sistema de PIN & Controle de Sessão
- [x] **A.1** Criar tabela `app_settings` no SQLite para armazenar configurações, hash e salt do PIN mestre.
- [x] **A.2** Implementar serviço de criptografia para registro e validação do PIN (`auth:set_pin`, `auth:verify_pin`, `auth:has_pin`).
- [x] **A.3** Criar modal de **Boas-Vindas / Cadastro de Primeiro PIN** na inicialização se nenhum PIN estiver configurado.
- [x] **A.4** Criar modal flutuante compacto de **Confirmação de PIN** (para desbloquear sessão de 5 minutos).
- [x] **A.5** Proteger a revelação de senhas na tabela (`UsersView`), exigindo autenticação do PIN.
- [x] **A.6** Proteger as ações de criação, edição e exclusão de usuários e roteadores contra chamadas não autorizadas.
- [x] **A.7** Adicionar badge/indicador visual no cabeçalho: 🔓 *Autorizado (X min restantes)* / 🔒 *Bloqueado*.

### ⚙️ Módulo B: Nova Aba de Configurações (`SettingsView`)
- [x] **B.1** Adicionar botão de navegação "Configurações" na barra lateral esquerda.
- [x] **B.2** Aba **Segurança**:
  - [x] Formulário de alteração de PIN (PIN Atual ➔ Novo PIN ➔ Confirmar).
  - [x] Seletor de tempo de expiração da sessão (1 min, 5 min, 15 min, ou sempre pedir).
- [x] **B.3** Aba **Inicialização & Sistema**:
  - [x] Opção: *Iniciar tClavis junto com o Windows*.
  - [x] Opção: *Minimizar para a Bandeja do Sistema ao fechar*.
- [x] **B.4** Adicionar IPC no Electron para `app.setLoginItemSettings` e controle do evento `close` da janela principal.

### 🧹 Módulo C: Expurgo de Vouchers Inativos e Expirados
- [x] **C.1** Criar método `syncEngine.findObsoleteVouchers()` / `db.findPurgeableVouchers()` para listar vouchers que nunca foram usados ou com tempo esgotado.
- [x] **C.2** Criar modal interativo de **Expurgo de Vouchers**:
  - [x] Filtro: *Nunca Utilizados (Uptime = 0)* vs. *Tempo Esgotado*.
  - [x] Seletor de idade: Criados há mais de 7, 15, 30 ou 60 dias.
  - [x] Tabela com prévia dos vouchers que serão apagados.
  - [x] Confirmação com exclusão física em todos os roteadores do cluster e no banco local.
- [x] **C.3** Registrar a ação de expurgo na tabela `system_logs`.

### 🚀 Módulo D: Sistema de Atualização via GitHub Releases (Auto-Updater)
- [x] **D.1** Implementar serviço de atualização no processo Main (`src/main/updater/githubUpdater.ts`):
  - [x] Buscar última release via API do GitHub (`GET /repos/TTreter/tClavis/releases/latest`).
  - [x] Comparar versão remota vs. versão local (`app.getVersion()`).
  - [x] Fazer download em stream do asset do instalador (`.exe`) com monitoramento de progresso (bytes recebidos / total).
  - [x] Executar o instalador baixado no Windows (`child_process.spawn`) e fechar o aplicativo.
- [x] **D.2** Expor handlers IPC no Electron (`updater:check`, `updater:download`, `updater:install`, `updater:progress`).
- [x] **D.3** Adicionar interface de Atualização na aba de Configurações (`SettingsView` ➔ Aba *Atualizações*):
  - [x] Exibição da versão instalada e status (Atualizado / Atualização Disponível).
  - [x] Botão "Verificar se há atualizações".
  - [x] Card de release com changelog / notas da versão e data de publicação.
  - [x] Botão "Baixar Atualização" com barra de progresso animada (0% - 100%).
  - [x] Botão "Instalar e Reiniciar" após conclusão do download.
- [x] **D.4** Verificação automática em segundo plano na inicialização (opcional/silenciosa, avisando se houver nova versão).

---

## 📈 4. Cronograma de Execução

1. **Sprint A:** Implementação do banco `app_settings`, hashing de PIN e endpoints IPC. *(Concluído)*
2. **Sprint B:** Criação do modal de Setup Inicial e Modal de Verificação de PIN no Frontend. *(Concluído)*
3. **Sprint C:** Criação da ferramenta de Expurgo de Vouchers Inativos/Expirados (`VoucherPurgeModal.tsx`). *(Concluído)*
4. **Sprint D:** Implementação do motor de atualização via GitHub Releases no Main e Preload. *(Concluído)*
5. **Sprint E:** Criação da tela de Configurações (`SettingsView`) reunindo PIN, Sistema, Expurgo e Atualizações. *(Concluído)*
6. **Sprint F:** Integração completa no `App.tsx` (bloqueio de senhas, badge de sessão, auto-bloqueio). *(Concluído)*
7. **Sprint G:** Testes de compilação, validação de segurança e publicação de release. *(Concluído)*
