# 09. Dispositivos Autorizados (IP & MAC Binding)

Em ambientes com Hotspot ativado, dispositivos como Smart TVs, câmeras IP, impressoras de rede, relógios de ponto, caixas registradoras e videogames enfrentam um grande problema: **eles não possuem navegador web** para digitar login e senha na tela de Captive Portal.

A funcionalidade de **Dispositivos Autorizados (IP & MAC Binding)** do tClavis resolve essa questão centralizando a liberação de bypass em todo o cluster.

---

## 📺 O que é um IP-Binding no MikroTik?

O recurso `/ip hotspot ip-binding` do RouterOS permite instruir o roteador a tratar um endereço MAC ou IP de forma especial antes mesmo de direcioná-lo para a tela de autenticação do hotspot.

### Os 3 Modos de Binding:

| Tipo | Comportamento | Quando Utilizar |
| :--- | :--- | :--- |
| 🟢 **`bypassed`** | Libera o tráfego de internet **direto**, ignorando a tela de login do Hotspot. | **Smart TVs, câmeras Wi-Fi, impressoras, relógios de ponto, Apple TV, Chromecast.** |
| 🔴 **`blocked`** | Bloqueia qualquer tráfego do dispositivo de forma definitiva. | Dispositivos invasores, aparelhos suspeitos ou equipamentos banidos da rede. |
| ⚪ **`regular`** | Mantém a exigência de login pelo portal, mas fixa o IP ou restringe a interface. | Estações de trabalho que precisam de IP estático mas devem autenticar normalmente. |

---

## ➕ Como Cadastrar um Dispositivo no tClavis

1. Acesse o menu **Dispositivos (Bindings)** no tClavis.
2. Clique em **Adicionar Dispositivo**.
3. Preencha os campos:
   * **Endereço MAC:** Endereço físico do aparelho (ex: `AA:BB:CC:DD:EE:FF` ou `aa-bb-cc-dd-ee-ff` — o tClavis formata automaticamente).
   * **Endereço IP (Opcional):** IP fixo desejado (se vazio, o dispositivo pega IP pelo DHCP).
   * **Tipo de Ação:** Selecione `Bypassed` (mais comum), `Blocked` ou `Regular`.
   * **Servidor Hotspot:** `all` ou selecione uma instância específica.
   * **Descrição / Comentário:** Identificação humana (ex: *Smart TV Suíte Presidencial*, *Câmera Entrada Portaria*).
4. Clique em **Salvar Dispositivo**.

---

## 🔄 Replicação Automática no Cluster

Ao salvar um binding no tClavis:
1. O dispositivo é gravado no banco local.
2. O tClavis injeta a regra `/ip hotspot ip-binding add` em **todas as caixas MikroTik** cadastradas.
3. Se você tiver múltiplos blocos ou antenas conectadas a roteadores diferentes, a Smart TV ou impressora poderá se mover entre os prédios e continuará navegando sem nenhuma intervenção manual!

---

## ✏️ Gerenciamento Rápido (Ativar / Desativar)

Na tabela de dispositivos autorizados do tClavis, você tem controles rápidos:
* **Chave Ativar/Desativar:** Suspende o bypass temporariamente em todas as caixas com 1 clique (ótimo para testar ou bloquear temporariamente um equipamento).
* **Excluir:** Remove fisicamente a regra de bypass de todos os MikroTiks do cluster.
