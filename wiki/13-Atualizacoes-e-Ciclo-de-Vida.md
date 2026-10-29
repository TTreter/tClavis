# 13. Atualizações Automáticas & Ciclo de Vida

O **tClavis** possui um sistema inteligente de atualização integrado diretamente com a API pública de lançamentos do **GitHub Releases**.

---

## 🚀 Como Funciona a Verificação de Atualizações

O aplicativo monitora novas versões lançadas no repositório oficial (`TTreter/tClavis`):

1. **Checagem Automática na Inicialização:**
   * Ao abrir o aplicativo, o tClavis consulta silenciosamente a API do GitHub em busca da tag de lançamento mais recente.
2. **Comparação Semântica de Versões:**
   * O sistema compara a versão instalada contra a versão remota (ex: `1.0.0` vs. `1.1.0`).
3. **Notificação Visual:**
   * Se houver uma versão mais nova disponível, um alerta amigável surge na barra superior com o botão **Atualização Disponível**.

---

## 📥 Download e Instalação em 1 Clique

Ao clicar no botão de atualização:
* Uma janela modal apresenta as **Novidades da Versão (Changelog)** formatadas em Markdown com as melhorias e correções incluídas.
* Ao clicar em **Baixar e Instalar**:
  * O tClavis faz o download do novo instalador em segundo plano diretamente para a pasta temporária do Windows.
  * O usuário acompanha em tempo real:
    * **Barra de progresso em porcentagem (0% a 100%);**
    * **Velocidade de transferência (MB/s ou KB/s);**
    * **Tamanho total baixado.**
  * Ao concluir o download, o tClavis executa o novo instalador e reinicia a aplicação automaticamente, preservando todos os seus roteadores, usuários e configurações intactos no banco de dados local.

---

## 💻 Inicialização Automática com o Windows

Para ambientes de recepção ou servidores de apoio onde o tClavis deve estar sempre ativo:

1. Acesse o menu **Configurações**.
2. Marque a opção **Iniciar com o Windows**.
3. O tClavis registra uma entrada no inicializador do Windows (`electron.app.setLoginItemSettings`).
4. Ao ligar a máquina, o tClavis inicia minimizado na bandeja do sistema, pronto para manter a fila de sincronização ativa 24 horas por dia.
