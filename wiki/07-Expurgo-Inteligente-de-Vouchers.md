# 07. Expurgo Inteligente de Vouchers

Com o passar dos meses, estabelecimentos que geram centenas de vouchers acumulam milhares de registros obsoletos na tabela `/ip hotspot user` dos seus MikroTiks.

O **Expurgo Inteligente** do tClavis é a ferramenta de manutenção preventiva projetada para manter suas RouterBoards limpas, rápidas e estáveis.

---

## ⚠️ O Perigo do Acúmulo de Vouchers Antigos

Muitos administradores desconhecem que caixas MikroTik de entrada ou intermediárias (como hEX, hAP ac/ax, RB750, RB3011, RB4011) possuem memória RAM e armazenamento Flash limitados:

* **Degradação de Desempenho:** Ter 5.000 ou 10.000 usuários cadastrados em `/ip hotspot user` obriga o RouterOS a realizar buscas mais lentas a cada tentativa de autenticação.
* **Sobrecarga de ARP e Hosts:** Vouchers antigos poluem logs de auditoria e tabelas de cache.
* **Esgotamento de Memória Flash:** Equipamentos com 16 MB de Flash podem travar se a base de dados do hotspot crescer descontroladamente.

---

## 🧹 Critérios de Expurgo do tClavis

O tClavis oferece dois filtros inteligentes de limpeza:

```mermaid
flowchart TD
    V[Voucher na Base de Dados] --> C1{Uptime acumulado?}
    C1 -- "uptime == 0s (Nunca usado)" --> C2{Criado há mais de X dias?<br/>(7, 15, 30, 60 ou 90 dias)}
    C2 -- Sim --> E1[Candidato a Expurgo: Voucher Obsoleto]
    C2 -- Não --> K1[Mantém Voucher]
    
    C1 -- "uptime > 0s (Já foi usado)" --> C3{Uptime atingiu limit-uptime?<br/>(Tempo Esgotado)}
    C3 -- Sim --> E2[Candidato a Expurgo: Voucher Esgotado]
    C3 -- Não --> K2[Mantém Voucher: Em Uso]
```

### 1. Vouchers Nunca Utilizados (`uptime = 0s`)
* Detecta cupons que foram impressos ou gerados para um evento ou temporada passada, mas o cliente nunca chegou a conectar.
* Filtros temporais selecionáveis: **7, 15, 30, 60 ou 90 dias**.

### 2. Vouchers com Tempo Total Esgotado (`uptime >= limit-uptime`)
* Identifica vouchers que já cumpriram integralmente a sua franquia de tempo (ex: um voucher de 2 horas que já acumulou 2 horas de uptime).
* Como o cliente não poderá mais navegar mesmo se tentar autenticar, o voucher torna-se lixo digital na memória do roteador.

---

## 🛡️ Prévia Segura & Exclusão em Lote

O tClavis nunca exclui nada de forma arbitrária ou às cegas:

1. Acesse o menu **Vouchers** e clique na aba **Expurgo Inteligente**.
2. Escolha o critério desejado (ex: *Nunca utilizados há mais de 30 dias* ou *Tempo esgotado*).
3. Clique em **Analisar Vouchers**.
4. Uma tabela clara exibirá todos os registros encontrados com:
   * Nome de usuário;
   * Grupo Lógico;
   * Data de criação;
   * Tempo acumulado de uso;
   * Motivo da classificação para expurgo.
5. Você pode revisar os itens e desmarcar individualmente qualquer voucher que deseje preservar.
6. Clique no botão **Confirmar Expurgo Selecionado**.
7. O tClavis solicitará a confirmação e enviará o comando de exclusão física para **todos os MikroTiks do cluster** de uma só vez, atualizando também o banco local.
