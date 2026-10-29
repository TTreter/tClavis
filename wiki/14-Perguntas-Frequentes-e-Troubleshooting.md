# 14. Perguntas Frequentes & Troubleshooting

Encontre respostas rápidas para dúvidas comuns e soluções práticas para os erros mais frequentes durante a operação do tClavis.

---

## ❓ Perguntas Frequentes (FAQ)

### 1. O tClavis precisa de internet para funcionar?
**Não.** O tClavis opera 100% em rede local (LAN). Ele só se comunica via TCP/IP com os endereços IP dos seus roteadores MikroTik. A internet só é consultada caso você clique para verificar atualizações no GitHub.

### 2. Se o computador onde o tClavis está fechar ou for desligado, os clientes perdem a conexão Wi-Fi?
**Não.** Essa é a maior vantagem do tClavis em relação a servidores RADIUS externos: o tClavis grava fisicamente os usuários na tabela local do próprio MikroTik (`/ip hotspot user`). Se o computador for desligado, as RouterBoards continuam autenticando clientes perfeitamente.

### 3. Posso misturar roteadores com RouterOS v6 e v7 no mesmo cluster?
**Sim.** O motor de comunicação do tClavis detecta a versão da caixa automaticamente e adapta os comandos do protocolo para funcionar perfeitamente em ambas as versões.

### 4. Preciso de licença paga para usar o tClavis?
**Não.** O tClavis é um projeto de código aberto distribuído sob a licença **MIT**, livre para uso pessoal ou comercial sem limites de quantidade de roteadores ou usuários.

---

## 🔧 Solução de Problemas (Troubleshooting)

### 🔴 Erro: "Connection timed out" ou "Connection refused" ao testar roteador

#### 1. Verifique se o serviço de API está ativo no MikroTik:
Abra o terminal do MikroTik no Winbox e digite:
```routeros
/ip service print
```
Se a linha `api` estiver com um `X` (desativada), ative-a com:
```routeros
/ip service enable api
```

#### 2. Verifique o Firewall do MikroTik:
Se houver uma regra de drop no `input` bloqueando a porta `8728`:
```routeros
/ip firewall filter add chain=input protocol=tcp dst-port=8728 action=accept comment="API tClavis" place-before=0
```

#### 3. Teste de conectividade simples via Windows:
Abra o PowerShell no Windows e teste se a porta está aberta:
```powershell
Test-NetConnection -ComputerName 192.168.88.1 -Port 8728
```
Se o resultado for `TcpTestSucceeded : True`, a comunicação de rede está perfeita.

---

### 🔴 Erro: "cannot log in: invalid user name or password"

* Verifique se o usuário e senha foram digitados corretamente no formulário do tClavis.
* No MikroTik, confirme se o usuário existe em `/user print` e pertence a um grupo com políticas `api,read,write,test`.
* Se o usuário foi criado com restrição de IP (`allowed-address`), certifique-se de que o IP do seu computador está dentro da faixa permitida.

---

### 🔑 Esqueci meu PIN Mestre! Como redefinir?

Como o PIN é criptografado com Scrypt e Salt criptográfico de mão única, não há como "descriptografá-lo". Para redefini-lo:

1. Feche o tClavis (inclusive no ícone da bandeja do relógio).
2. Pressione as teclas `Win + R` no Windows, digite `%APPDATA%\tclavis` e pressione Enter.
3. Você verá o arquivo do banco de dados `tclavis.db`.
4. Faça uma cópia de segurança do arquivo `tclavis.db` por precaução.
5. Se você tiver o utilitário `sqlite3` ou um programa como o *DB Browser for SQLite*, abra o arquivo e execute:
   ```sql
   DELETE FROM system_settings WHERE key IN ('master_pin_hash', 'master_pin_salt');
   ```
6. Ao reabrir o tClavis, o assistente de primeiro acesso solicitará a criação de um novo PIN, mantendo intactos todos os seus roteadores e usuários!

---

### 📋 Como consultar os Logs do Sistema?

No rodapé ou no menu de Configurações, o tClavis disponibiliza o **Log de Eventos do Sistema**, registrando timestamps, categorias (`user`, `router`, `sync`, `security`) e detalhes técnicos de eventuais erros para facilitar o diagnóstico de suporte.
