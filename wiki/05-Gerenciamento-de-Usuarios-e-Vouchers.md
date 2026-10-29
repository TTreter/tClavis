# 05. Gerenciamento de Usuários

Nesta seção você aprenderá a gerenciar contas individuais de hotspot, aplicar limites de uso, importar usuários já existentes em suas caixas MikroTik e entender o status de sincronização no cluster.

---

## 👤 Cadastro de um Novo Usuário

1. Acesse o menu **Usuários** no tClavis.
2. Clique no botão **Novo Usuário**.
3. Preencha os campos:
   * **Nome de Usuário (Login):** Nome ou identificador do cliente.
   * **Senha:** Senha de acesso (ou deixe em branco se o hotspot estiver configurado para autenticação por apenas nome de usuário/voucher).
   * **Grupo Lógico:** Selecione o grupo que define a velocidade e perfis (ex: *Visitantes*, *Colaboradores*).
   * **Servidor Lógico:** Selecione o servidor hotspot permitido (padrão: *Todos / all*).
   * **Limite de Tempo (`limit-uptime`):** Duração acumulada máxima de uso (ex: `1h`, `2h`, `1d`, `7d`). Quando o cliente atingir essa soma de conexão, o MikroTik bloqueia novas conexões.
   * **Limite de Tráfego (`limit-bytes-total`):** Franquia máxima de download + upload em Megabytes ou Gigabytes.
   * **Comentário:** Anotação administrativa (ex: *Quarto 102*, *Visitante João Silva*).
4. Clique em **Salvar**.

---

## ⚡ O que Acontece ao Salvar?

No exato momento em que você clica em Salvar:
1. O tClavis grava o usuário no banco de dados local.
2. O **SyncEngine** dispara comandos paralelos de `/ip hotspot user add` para cada roteador online do seu cluster.
3. Se um dos roteadores estiver desligado, o tClavis marca o status daquele roteador como `pending` e enfileira a criação para entrega assim que ele voltar à rede.

---

## 🔒 Mascaramento Estrito de Senhas

Para proteger a privacidade dos usuários e atender a normas de segurança:
* Todas as senhas na tabela são exibidas como bolinhas (`••••••••`).
* Ao clicar no ícone de "olho" para ver uma senha ou clicar em Editar:
  * Se o tClavis estiver bloqueado, uma janela solicitará o **PIN Mestre**.
  * Ao digitar o PIN correto, uma **Sessão Autorizada de 5 minutos** é aberta, revelando a senha e permitindo alterações.

---

## 🚥 Indicador de Sincronização por Roteador

Na tabela de usuários, cada linha possui pequenos emblemas com o status de replicação em cada caixa MikroTik:

| Indicador | Significado | Ação |
| :--- | :--- | :--- |
| 🟢 **Sincronizado (`synced`)** | O usuário existe no MikroTik e está idêntico ao tClavis. | Nenhuma ação necessária. |
| 🟡 **Pendente (`pending`)** | O roteador está offline ou processando a fila. | O Sync Worker tentará novamente automaticamente. |
| 🔴 **Erro (`error`)** | Ocorreu uma recusa (ex: perfil não encontrado na caixa). | Verifique a mensagem de erro passando o mouse sobre o ícone. |

---

## 📥 Importar Usuários de um MikroTik Existente

Se você já tinha dezenas ou centenas de usuários criados via Winbox antes de instalar o tClavis, você **não precisa recadastrá-los manualmente**:

1. Na tela de **Usuários**, clique em **Importar do Roteador**.
2. Selecione o roteador de origem (onde estão os usuários).
3. O tClavis lerá a tabela `/ip hotspot user` e listará todas as contas encontradas, destacando quais já existem no tClavis e quais são novas.
4. Você pode marcar as seguintes opções:
   * **Criar Grupos Lógicos automaticamente:** O tClavis criará Grupos Lógicos para cada perfil diferente que encontrar nos usuários importados.
   * **Sincronizar para os demais roteadores:** Replica imediatamente esses usuários importados para todas as outras caixas do seu cluster!
5. Clique em **Importar Selecionados**.
