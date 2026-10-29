# 02. Instalação & Primeiro Acesso

Esta página orienta sobre como baixar, instalar e realizar a configuração inicial do **tClavis** no seu computador com Windows.

---

## 💻 Requisitos do Sistema

* **Sistema Operacional:** Windows 10 ou Windows 11 (64-bit).
* **Memória RAM:** Mínimo de 2 GB de RAM livre (recomendado 4 GB).
* **Espaço em Disco:** 250 MB livres.
* **Rede:** Interface de rede cabeada (Ethernet) ou Wi-Fi com alcance aos IPs dos seus roteadores MikroTik.

---

## 📥 Download do Aplicativo

Você pode baixar a versão mais recente diretamente na página oficial de lançamentos:

👉 **[Baixar a Versão Mais Recente (Releases)](https://github.com/TTreter/tClavis/releases/latest)**

### Escolhendo o Pacote Certo

| Pacote | Arquivo | Para quem é indicado |
| :--- | :--- | :--- |
| **Instalador Oficial (Recomendado)** | `tClavis Setup X.X.X.exe` | Usuários que desejam instalação completa no Windows, atalhos no Menu Iniciar e suporte completo para **Iniciar com o Windows**. |
| **Versão Portátil (Portable)** | `tClavis X.X.X.exe` | Técnicos e administradores que precisam rodar o app a partir de um pendrive sem instalar nada no sistema. |

---

## 🚀 Assistente de Primeiro Acesso

Ao abrir o tClavis pela primeira vez, o assistente de segurança solicitará a definição do seu **PIN Mestre**:

<p align="center">
  <img src="https://raw.githubusercontent.com/TTreter/tClavis/main/build/icon.png" width="90" height="90" alt="PIN Mestre" />
</p>

### O que é o PIN Mestre?
O PIN Mestre é um código numérico de **4 a 8 dígitos** que protege suas credenciais de roteador e senhas de clientes contra acessos não autorizados por pessoas que tenham acesso físico ao seu computador.

#### 🛡️ Como a segurança do PIN funciona nos bastidores:
* O tClavis não salva o PIN em texto puro.
* É gerado um **Salt criptográfico aleatório de 16 bytes**.
* A chave é derivada usando a função de alto custo computacional **Scrypt** (32 bytes).
* A validação de digitação é feita através de `crypto.timingSafeEqual`, tornando o aplicativo imune a ataques de temporização (*timing attacks*).

---

## ⏱️ Sessão Autorizada de 5 Minutos

Para equilibrar segurança máxima com agilidade no trabalho do dia a dia:

1. **Estado Bloqueado (Padrão):**
   * As senhas dos roteadores e dos usuários ficam mascaradas (`••••••••`).
   * Não é possível visualizar ou alterar credenciais sensíveis.
2. **Desbloqueio Temporário:**
   * Ao digitar o PIN correto, você ganha uma **Sessão Autorizada de 5 Minutos**.
   * Durante esses 5 minutos, você pode visualizar senhas, cadastrar usuários e alterar roteadores livremente sem precisar digitar o PIN a cada clique.
3. **Bloqueio Automático:**
   * Um temporizador regressivo é exibido na barra superior.
   * Quando os 5 minutos terminam (ou se você clicar no botão **Bloquear**), o tClavis volta silenciosamente ao modo protegido.

---

## ⚙️ Configurações de Sistema Operacional

Acesse a guia **Configurações** no menu lateral para ajustar as preferências de ciclo de vida:

* **Iniciar com o Windows:** Quando ativado, o tClavis será aberto automaticamente ao ligar o computador ou fazer login na sua conta do Windows.
* **Minimizar para a Bandeja (System Tray):** Quando ativado, ao clicar no botão "X" de fechar janela, o tClavis continuará rodando em segundo plano no ícone próximo ao relógio do Windows. Isso garante que a **Fila de Sincronização** continue entregando dados caso algum roteador volte a ficar online enquanto a janela estiver fechada.

---

## 📁 Onde os Dados são Armazenados?

O tClavis armazena o banco de dados SQLite local no diretório padrão do usuário do Windows:

```
C:\Users\<SeuUsuario>\AppData\Roaming\tclavis\tclavis.db
```

As senhas dos roteadores gravadas no banco são criptografadas utilizando a tecnologia nativa **Windows DPAPI** (`safeStorage`), integrada ao chip TPM do seu computador quando disponível.

---

> [!NEXT]
> Agora que o tClavis está pronto, siga para o [**03. Gerenciamento de Roteadores**](03-Gerenciamento-de-Roteadores) para conectar suas caixas MikroTik.
