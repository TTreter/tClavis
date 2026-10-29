# 08. Auditoria de Paridade & Auto-Repair

Em um ambiente dinâmico com múltiplos roteadores e técnicos trabalhando na rede, discrepâncias inevitavelmente acontecem. O motor de **Auditoria de Paridade (Diff Checker)** do tClavis é o fiscal que garante a integridade absoluta do seu cluster.

---

## 🔍 Como Surgem as Discrepâncias?

Mesmo com um sistema de sincronização em tempo real, divergências podem surgir devido a fatores externos:
* Um técnico abriu o **Winbox** diretamente e cadastrou ou deletou um usuário de teste direto na caixa.
* Um roteador foi reiniciado com queda abrupta de energia ou substituído após queima de equipamento.
* Uma falha de hardware causou perda temporária da tabela de hotspot.

---

## 🔬 Os 4 Tipos de Discrepância Detectados

A auditoria do tClavis varre cada roteador cadastrado e compara campo a campo contra a base mestre:

| Tipo | O que significa | Causa comum |
| :--- | :--- | :--- |
| 🔴 **`missing_in_router`** | O usuário existe no tClavis, mas não foi encontrado naquele MikroTik. | O roteador foi resetado ou alguém apagou o usuário no Winbox. |
| 🟠 **`orphan_in_router`** | O usuário existe no MikroTik, mas não está cadastrado no tClavis. | O usuário foi cadastrado diretamente na caixa sem passar pelo tClavis. |
| 🟡 **`profile_mismatch`** | O perfil aplicado no MikroTik não bate com o perfil do Grupo Lógico configurado. | Alguém alterou o Profile no Winbox manualmente. |
| 🔵 **`disabled_mismatch`** | O status ativo/desativado está invertido entre o tClavis e o MikroTik. | Um usuário foi desativado em um lugar e esquecido no outro. |

---

## 🚀 Como Executar a Auditoria

1. Acesse a tela de **Auditoria de Paridade** no tClavis.
2. Clique no botão **Executar Auditoria de Paridade**.
3. O tClavis fará a leitura de todos os roteadores online e apresentará um relatório analítico:
   * **Total de Usuários Verificados;**
   * **Total de Discrepâncias Identificadas;**
   * **Tabela Detalhada com:**
     * Nome do Usuário;
     * Roteador afetado;
     * Valor Esperado vs. Valor Atual;
     * Ação Sugerida.

---

## 🛠️ Auto-Repair (Reparo com 1 Clique)

Depois de revisar as discrepâncias encontradas, você não precisa consertar cada usuário manualmente:

1. Clique no botão **Reparar Discrepâncias (Auto-Repair)**.
2. O tClavis executará as ações corretivas de forma cirúrgica:
   * **Para usuários ausentes (`missing_in_router`):** Recria o usuário no MikroTik com o perfil correto e a senha cadastrada.
   * **Para contas órfãs (`orphan_in_router`):** Oferece a opção de importar a conta para o tClavis ou removê-la do MikroTik.
   * **Para perfis incompatíveis (`profile_mismatch`):** Atualiza o `/ip hotspot user set profile=...` na caixa para o perfil oficial do grupo.
   * **Para estados invertidos (`disabled_mismatch`):** Alinha o estado `disabled=yes/no` com a base mestre.
3. Ao finalizar, o cluster volta ao estado de **100% de paridade**!
