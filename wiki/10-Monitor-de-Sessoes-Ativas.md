# 10. Monitor de Sessões Ativas

O **Monitor de Sessões Ativas** do tClavis agrega em uma visão unificada todas as conexões em tempo real que estão navegando através da tabela `/ip hotspot active` de todas as suas RouterBoards.

---

## 📊 Visão Geral do Painel de Sessões

Em vez de abrir três ou quatro janelas do Winbox simultaneamente para saber quantos clientes estão conectados em cada prédio ou antena, o tClavis consolida tudo em uma única tela:

<p align="center">
  <img src="https://raw.githubusercontent.com/TTreter/tClavis/main/build/social-preview.png" width="700" alt="Painel Geral" />
</p>

### Informações Exibidas em Tempo Real:
* **Usuário:** Nome de login ou código do voucher autenticado.
* **Roteador:** Em qual caixa MikroTik a conexão está ocorrendo (ex: *MikroTik Piscina*, *MikroTik Sede*).
* **Endereço IP:** IP concedido ao dispositivo do cliente na rede local.
* **Endereço MAC:** Endereço físico da placa de rede Wi-Fi do cliente.
* **Tempo Conectado (Uptime):** Duração contínua da sessão atual (ex: `00:45:12`).
* **Tráfego de Download (Bytes Out):** Volume de dados recebido pelo cliente formatado dinamicamente em KB, MB ou GB.
* **Tráfego de Upload (Bytes In):** Volume de dados transmitido pelo cliente para a internet.
* **Servidor Hotspot:** Nome da instância do serviço onde o cliente logou.

---

## 🔌 Desconectar Usuário Remotamente (Kick Session)

Caso precise encerrar imediatamente a conexão de um cliente (por exemplo, se o cliente violou termos de uso, se a conexão travou no celular dele ou se você deseja forçá-lo a reautenticar):

1. Localize o usuário na tabela de Sessões Ativas.
2. Clique no botão de ação **Desconectar (Kick)** na linha correspondente.
3. O tClavis enviará o comando `/ip hotspot active remove` para a caixa MikroTik exata onde o cliente está conectado.
4. O cliente é imediatamente desconectado e o Captive Portal volta a ser exibido no dispositivo dele na próxima requisição HTTP.
