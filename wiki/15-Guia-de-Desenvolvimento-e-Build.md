# 15. Guia de Desenvolvimento & Build

Este guia é voltado para desenvolvedores que desejam contribuir com o código-fonte do **tClavis**, customizar funcionalidades ou compilar binários personalizados para seus ambientes.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia | Papel |
| :--- | :--- | :--- |
| **Desktop Core** | [Electron 34](https://www.electronjs.org/) | Runtime de desktop baseado em Chromium e Node.js 22. |
| **Interface / UI** | [React 18](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/) | Frontend moderno com tipagem estrita de componentes e rotas. |
| **Estilização** | [Tailwind CSS 3](https://tailwindcss.com/) | Design responsivo com suporte nativo ao tema escuro. |
| **Build Tooling** | [Vite 6](https://vitejs.dev/) | Bundler ultrarrápido com Hot Module Replacement (HMR). |
| **Empacotador** | [electron-builder 25](https://www.electron.build/) | Geração de instaladores NSIS e executáveis portáteis. |
| **Banco Local** | [sql.js](https://sql.js.org/) (SQLite WebAssembly) | Banco de dados relacional embarcado gravado em arquivo local. |
| **Ícones** | [Lucide React](https://lucide.dev/) | Ícones vetoriais modernos e consistentes. |

---

## 📂 Estrutura de Diretórios do Projeto

```
tClavis/
├── build/                 # Ícones de compilação (.ico, .png, tray)
├── docs/                  # Capturas de tela e documentação estática
├── wiki/                  # Arquivos markdown da Wiki oficial do GitHub
├── src/
│   ├── main/              # Processo Principal do Electron (Node.js)
│   │   ├── db/            # Schema, migrations e persistência SQLite
│   │   ├── mikrotik/      # Clientes RouterOS API, REST e MNDP Discovery
│   │   ├── security/      # CredentialVault (DPAPI, AES-GCM, Scrypt)
│   │   ├── services/      # SyncWorker com backoff exponencial e Tray
│   │   ├── updater/       # Integração com GitHub Releases API
│   │   └── index.ts       # Ponto de entrada do processo Electron
│   ├── preload/           # Bridge segura entre Electron e React (IPC)
│   │   └── index.ts
│   ├── renderer/          # Processo de Renderização (React 18)
│   │   ├── src/
│   │   │   ├── components/# Componentes reutilizáveis (Modais, Cards, Headers)
│   │   │   ├── views/     # Telas principais (Dashboard, Routers, Users, etc.)
│   │   │   └── App.tsx    # Orquestrador de rotas e estado global
│   │   └── index.html
│   └── shared/            # Modelos e interfaces TypeScript compartilhados
│       └── types.ts
├── electron-builder.yml   # Configuração de build para Windows
├── package.json           # Dependências e scripts npm
├── tailwind.config.js     # Configuração de temas e cores Tailwind
└── vite.config.ts         # Configuração de compilação do Vite
```

---

## ⚙️ Pré-requisitos para Desenvolvimento

* **Node.js:** Versão 18.0.0 ou superior (recomendado Node.js 20 ou 22 LTS).
* **npm:** Versão 9 ou superior.
* **Git:** Instalado e configurado no terminal.

---

## 🚀 Comandos de Desenvolvimento

### 1. Clonar e Instalar Dependências
```bash
git clone https://github.com/TTreter/tClavis.git
cd tClavis
npm install
```

### 2. Rodar em Modo de Desenvolvimento (Live Reload)
```bash
npm run dev
```
O Vite iniciará o servidor de desenvolvimento do renderer e abrirá a janela do Electron com recarregamento instantâneo a cada alteração de código.

---

## 📦 Comandos de Empacotamento e Distribuição

### Gerar Executável Portátil (Portable EXE)
Gera um único executável autônomo que não requer instalação:
```bash
npm run pack:portable
```
O arquivo será gerado em: `release/tClavis <versao>.exe`.

### Gerar Instalador Completo (NSIS Setup)
Gera o instalador padrão do Windows com assistente de instalação, atalhos na Área de Trabalho e suporte a desinstalação pelo Painel de Controle:
```bash
npm run build
```
O arquivo será gerado em: `release/tClavis Setup <versao>.exe`.

---

## 🤝 Como Contribuir

1. Faça um **Fork** do projeto.
2. Crie uma branch para a sua feature (`git checkout -b feature/minha-melhoria`).
3. Faça commit das alterações (`git commit -m 'feat: Adiciona suporte a novo protocolo'`).
4. Envie para o GitHub (`git push origin feature/minha-melhoria`).
5. Abra um **Pull Request**.
