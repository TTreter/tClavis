# 03. Gerenciamento de Roteadores

Neste guia você aprenderá como configurar seus roteadores **MikroTik RouterOS** e cadastrá-los no tClavis via **Descoberta Automática (MNDP)** ou inserção manual via **API RouterOS**.

---

## 🛠️ Requisitos no MikroTik (RouterOS v6 e v7)

Antes de cadastrar uma caixa MikroTik no tClavis, certifique-se de que o serviço de API esteja ativo e com um usuário configurado.

### 1. Ativar o Serviço de API
Abra o **Winbox** ou terminal SSH do seu MikroTik e verifique se o serviço `api` (ou `api-ssl`) está habilitado:

```routeros
# Verificar serviços ativos
/ip service print

# Habilitar API padrão (porta 8728)
/ip service enable api

# (Opcional) Se for utilizar conexão com criptografia SSL (porta 8729)
/ip service enable api-ssl
```

### 2. Criar um Usuário Específico para o tClavis (Recomendado)
Por boas práticas de segurança, evite utilizar a conta padrão `admin`. Crie um grupo e um usuário dedicado:

```routeros
# 1. Criar um grupo com as políticas mínimas necessárias
/user group add name="grp-tclavis" policy="api,read,write,test,!ftp,!reboot,!policy,!sensitive"

# 2. Criar o usuário vinculado ao grupo
/user add name="tclavis-user" group="grp-tclavis" password="SuaSenhaSeguraAqui123" comment="Integracao tClavis"
```

> [!NOTE]
> As políticas `api`, `read`, `write` e `test` permitem que o tClavis leia usuários, crie vouchers, gerencie IP bindings e execute ping/testes de sistema sem autorizar comandos destrutivos (como reiniciar ou formatar o equipamento).

### 3. Verificar o Firewall do MikroTik
Se você possui regras estritas em `/ip firewall filter`, certifique-se de liberar a porta `8728` (TCP) para a máquina onde o tClavis está rodando:

```routeros
/ip firewall filter add chain=input protocol=tcp dst-port=8728 action=accept comment="Permitir API tClavis"
```

---

## 📡 Método 1: Descoberta Automática via MNDP

O tClavis conta com suporte integrado ao protocolo **MNDP** (*MikroTik Neighbor Discovery Protocol*), que escuta anúncios UDP na porta `5678` na rede local.

1. Acesse o menu **Roteadores** no tClavis.
2. Clique no botão **Escanear Rede (MNDP)**.
3. Em segundos, todos os MikroTiks vizinhos encontrados na sua rede serão listados com:
   * **Identidade do Roteador (Identity / Nome)**
   * **Endereço IP**
   * **Endereço MAC**
   * **Versão do RouterOS**
   * **Modelo da Placa (Board)**
4. Basta clicar em **Adicionar** ao lado do roteador descoberto; o IP e o nome serão pré-preenchidos automaticamente no formulário!

---

## ✍️ Método 2: Cadastro Manual

Se o roteador estiver em outra sub-rede ou atrás de um túnel VPN (onde o broadcast MNDP não alcança), cadastre-o manualmente:

1. Clique em **Adicionar Roteador**.
2. Preencha os campos:
   * **Nome de Identificação:** Ex: `MikroTik - Sede`, `Hotspot - Bloco B`.
   * **Endereço IP / Host:** Ex: `192.168.88.1` ou `roteador.meudominio.com`.
   * **Porta:** Padrão `8728` (ou `8729` caso utilize SSL).
   * **Usar Conexão Segura (SSL/TLS):** Marque se ativou `api-ssl` com certificado válido no MikroTik.
   * **Usuário:** Usuário com permissão de API criado no passo anterior.
   * **Senha:** Senha de acesso.
3. Clique em **Testar Conexão**.
4. O tClavis fará um handshake imediato com a caixa e mostrará:
   * ✅ **Latência de Resposta (em milissegundos)**
   * ✅ **Versão do RouterOS** (ex: `7.14.3` ou `6.49.10`)
   * ✅ **Carga de CPU (%)**
   * ✅ **Tempo de Atividade (Uptime)**
5. Clique em **Salvar Roteador**.

---

## 🔄 Cache Automático de Perfis e Servidores

Ao salvar ou testar um roteador, o tClavis consulta e atualiza silenciosamente em seu banco local a lista de:
* **User Profiles** cadastrados em `/ip hotspot user profile`
* **Hotspot Servers** cadastrados em `/ip hotspot`

Essa leitura automática é o que abastece a tela de [**04. Mapeamento Lógico (De-Para)**](04-Mapeamento-Logico-De-Para).
