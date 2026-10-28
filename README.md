<p align="center">
  <img src="build/icon.png" width="140" height="140" alt="tClavis Logo" />
</p>

<h1 align="center">tClavis</h1>

<p align="center">
  <strong>Gestor Centralizado & Sincronizador Inteligente de Hotspots MikroTik RouterOS</strong><br />
  <em>Administre múltiplos roteadores MikroTik simultaneamente com replicação em tempo real, proteção por PIN mestre e expurgo automático de vouchers.</em>
</p>

<p align="center">
  <a href="https://github.com/TTreter/tClavis/releases/latest">
    <img src="https://img.shields.io/github/v/release/TTreter/tClavis?style=for-the-badge&color=00f2fe&logo=github" alt="Latest Release" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License MIT" />
  </a>
  <img src="https://img.shields.io/badge/Platform-Windows-0078D6?style=for-the-badge&logo=windows" alt="Platform Windows" />
  <img src="https://img.shields.io/badge/MikroTik-RouterOS%20v6%20%7C%20v7-black?style=for-the-badge" alt="RouterOS" />
  <img src="https://img.shields.io/badge/Electron-34-47848F?style=for-the-badge&logo=electron" alt="Electron" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
</p>

---

## 📖 Visão Geral

O **tClavis** é uma aplicação desktop desenvolvida para resolver de forma definitiva a administração de redes Wi-Fi e Hotspot baseadas em múltiplos roteadores **MikroTik RouterOS**. 

Em ambientes corporativos, pousadas, escolas, eventos ou provedores com mais de uma caixa MikroTik, manter usuários, senhas e vouchers sincronizados manualmente exige esforço duplicado ou a configuração onerosa e complexa de servidores RADIUS externos. O **tClavis** atua como uma camada de orquestração inteligente que mantém todo o cluster perfeitamente alinhado em tempo real.

---

## 🚀 Principais Funcionalidades

### 🔄 1. Sincronização em Cluster Multi-MikroTik
* Criação, edição, alteração de senhas e exclusão de contas refletidas simultaneamente em todos os roteadores do cluster.
* **Fila de Retry Resiliente:** Se uma das caixas estiver offline ou reiniciar, a alteração é armazenada em fila local segura e sincronizada automaticamente assim que a conexão for reestabelecida.
* **Descoberta MNDP:** Localização automática de roteadores MikroTik na rede local via protocolo MikroTik Neighbor Discovery.

### 🔒 2. Controle de Acesso Local com PIN Mestre & Auto-Bloqueio
* **Configuração no Primeiro Acesso:** Proteção do aplicativo por PIN numérico (4 a 8 dígitos).
* **Mascaramento Estrito de Senhas:** Nenhuma senha de usuário ou roteador é exibida sem autorização expressa.
* **Sessão Autorizada Temporizada (5 Minutos):** Ao digitar o PIN correto, o operador ganha passe livre temporário para visualizar senhas e efetuar alterações sem ter que redigitar o PIN a cada clique.
* **Auto-Bloqueio Silencioso:** Após o tempo expirar (ou ao clicar em *Bloquear*), o app volta imediatamente ao estado restrito.
* **Criptografia Forte:** PIN protegido com chave derivada via **Scrypt** e Salt criptográfico de 16 bytes, validado com `crypto.timingSafeEqual` (imunidade a *timing attacks*).

### 🧹 3. Expurgo Inteligente de Vouchers Obsoletos
* Ferramenta nativa para detectar e expurgar em lote:
  1. Vouchers criados e nunca utilizados (`uptime = 0s`) com filtros de 7, 15, 30, 60 ou 90 dias.
  2. Vouchers com limite de tempo 100% esgotado (`uptime >= limit-uptime`).
* Libera memória RAM e espaço em Flash nas RouterBoards, acelerando a navegação e a tabela de ARP/Hosts.
* Confirmação segura com prévia tabular e exclusão física em todos os roteadores sincronizados.

### 🔍 4. Auditoria de Paridade (Diff Checker & Auto-Repair)
* Varredura detalhada que compara o banco de dados do tClavis contra as tabelas `/ip hotspot user` de cada roteador.
* Identificação visual de discrepâncias (usuários ausentes, perfis incompatíveis ou contas órfãs).
* Botão de **Reparo com 1 Clique** para harmonizar todo o cluster.

### 🔀 5. Mapeamento Lógico De-Para (Grupos e Perfis)
* Criação de Grupos Lógicos globais (ex: *Visitantes*, *Colaboradores*, *VIP*).
* Tradução automática do grupo para o perfil específico configurado em cada roteador (ex: *Perfil_10M* na Sede e *Guest_Pousada* na Filial).

### 🔗 6. Vinculação de Servidores Hotspot
* Permite vincular instâncias de Hotspot com nomes diferentes em caixas distintas sob uma única regra lógica de distribuição.

### 📡 7. Monitor Unificado de Sessões Ativas
* Painel centralizado que monitora em tempo real todos os clientes conectados em `/ip hotspot active`.
* Exibição de IP, MAC, Uptime, consumo de Bytes e roteador de conexão.
* Botão para desconectar (*kick*) o usuário remotamente.

### 🖨️ 8. Gerador de Vouchers em Lote com QR Code
* Geração rápida de centenas de acessos com senhas randômicas e limites configuráveis de tempo (`limit-uptime`) e tráfego (`limit-bytes-total`).
* Layout otimizado para impressão:
  * **Impressoras Térmicas Não Fiscais:** Formatos 58mm e 80mm com corte automático.
  * **Folha A4:** Grade organizada para corte manual.
* Impressão de **QR Code** para autenticação rápida sem digitação.

### 🛡️ 9. Dispositivos Autorizados (IP & MAC Binding / Bypass)
* Cadastro centralizado de liberação de dispositivos sem navegador (Smart TVs, câmeras IP, impressoras de rede, consoles).
* Replicação imediata do Binding em todos os MikroTiks.

### 📦 10. Backup & Restauração com Criptografia
* Exportação completa de roteadores, usuários, grupos e mapeamentos em arquivo `.json`.
* Proteção opcional por senha usando **AES-256-GCM** e derivação de chave Scrypt.

### 🚀 11. Atualizador Integrado via GitHub Releases
* Verificação nativa de novas versões diretamente pelo aplicativo.
* Exibição das novidades/changelog da versão.
* Download direto do instalador com monitoramento de taxa de transferência e porcentagem.
* Instalação automática e reinicialização com 1 clique.

### 🖥️ 12. Ciclo de Vida do Sistema Operacional
* Opção de **Iniciar com o Windows** em segundo plano.
* Opção de **Minimizar para a Bandeja do Sistema (Tray)** ao clicar no "X", garantindo que a fila de sincronização continue ativa.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
| :--- | :--- |
| **Desktop Runtime** | [Electron 34](https://www.electronjs.org/) (Node.js 22 + Chromium) |
| **Interface / UI** | [React 18](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/) |
| **Build & Bundler** | [Vite 6](https://vitejs.dev/), [electron-builder 25](https://www.electron.build/) |
| **Banco de Dados Local** | [SQLite (`sql.js`)](https://sql.js.org/) com persistência em arquivo local |
| **Criptografia** | [Node.js Native Crypto](https://nodejs.org/api/crypto.html) (Scrypt, AES-256-GCM, SafeStorage) |
| **Protocolo de Rede** | MikroTik RouterOS API nativa (TCP 8728) e REST API (v7) |
| **Ícones** | [Lucide React](https://lucide.dev/) |

---

## 📥 Como Instalar

Baixe o executável mais recente na página de **[Releases](https://github.com/TTreter/tClavis/releases/latest)**:

1. **Instalador Oficial (`tClavis Setup X.X.X.exe`):**
   * Instalação recomendada para Windows.
   * Cria atalhos no menu iniciar e área de trabalho.
   * Suporte completo para inicialização automática com o Windows.
2. **Versão Portátil (`tClavis X.X.X.exe`):**
   * Não requer instalação. Basta salvar em uma pasta de sua preferência e executar diretamente.

---

## 💻 Desenvolvimento & Compilação Local

### Pré-requisitos
* [Node.js](https://nodejs.org/) versão 18 ou superior.
* `npm` instalado.

### 1. Clonar o repositório
```bash
git clone https://github.com/TTreter/tClavis.git
cd tClavis
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Rodar em ambiente de desenvolvimento
```bash
npm run dev
```

### 4. Gerar executáveis de produção
```bash
# Compilar versão portátil (Portable EXE)
npm run pack:portable

# Compilar instalador completo (NSIS Installer)
npm run build
```
Os arquivos gerados estarão disponíveis na pasta `release/`.

---

## 🔒 Arquitetura de Segurança

* **Context Isolation:** O processo de renderização (React) roda com `contextIsolation: true` e `nodeIntegration: false`. Toda a comunicação com o sistema operacional ocorre exclusivamente via IPC validado na camada `preload`.
* **Proteção contra Popups:** Bloqueio estrito de novas janelas com redirecionamento de links externos para o navegador padrão do sistema.
* **Sanitização de Protocolo:** Validação de entradas para impedir *byte injection* ou quebra de palavras no protocolo binário do RouterOS.
* **Criptografia de Senhas Locais:** As senhas dos roteadores são armazenadas criptografadas localmente.

---

## 📄 Licença

Distribuído sob a licença **MIT**. Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<p align="center">
  Desenvolvido por <strong>Tiago Treter</strong>
</p>
