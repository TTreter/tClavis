# 06. Gerador em Lote & Impressão

O **Gerador de Vouchers** do tClavis é ideal para eventos, hotéis, pousadas, escolas e restaurantes que precisam criar dezenas ou centenas de acessos temporários e imprimi-los com rapidez e elegância.

---

## ⚡ Como Gerar Vouchers em Lote

1. Acesse o menu **Vouchers** no tClavis.
2. Na aba **Gerador em Lote**, preencha os parâmetros:
   * **Quantidade:** Número de vouchers a criar (ex: 50, 100, 200).
   * **Prefixo do Usuário (Opcional):** Ex: `WIFI-`, `HOSP-` ou deixe em branco para códigos puramente aleatórios.
   * **Tamanho do Código:** Quantidade de caracteres (ex: 6 ou 8 caracteres).
   * **Tipo de Caracteres:**
     * Apenas Números (ideal para teclados numéricos simples);
     * Alfanumérico (letras e números com remoção de caracteres ambíguos como `0/O` e `1/l/I`).
   * **Tipo de Senha:**
     * Senha aleatória segura;
     * Senha idêntica ao usuário (facilita para o cliente em captive portals que exigem apenas um campo);
     * Sem senha (login direto com usuário).
   * **Grupo Lógico:** Grupo com a velocidade desejada (ex: *Visitantes 24h*).
   * **Limite de Tempo (`limit-uptime`):** Ex: `2h`, `8h`, `1d`.
3. Clique em **Gerar Vouchers**.
4. O tClavis criará os vouchers no banco local e os enviará imediatamente para todos os MikroTiks do cluster!

---

## 🖨️ Modelos de Impressão Disponíveis

O tClavis oferece layouts prontos e ajustados para os padrões mais populares do mercado:

### 1. Impressora Térmica Não Fiscal (58mm e 80mm)
* **Formato cupom contínuo:** Ideal para impressoras térmicas USB/Rede (Epson TM-T20, Elgin i9, Bematech MP-4200, Positivo, etc.).
* **Estrutura do cupom:**
  * Nome do Estabelecimento e Rede Wi-Fi (SSID);
  * Usuário e Senha com fonte de alto contraste;
  * Validade do voucher (tempo ou tráfego);
  * **QR Code** impresso no rodapé;
  * Linha de corte automática ou picote.

### 2. Folha A4 em Grade (Cartões de Visita)
* **Formato cartela:** Organiza os vouchers em uma grade perfeita de 10 a 24 cupons por página A4.
* **Marcadores visuais de recorte:** Linhas pontilhadas discretas facilitando o corte com guilhotina ou tesoura.
* Excelente para deixar uma gaveta com dezenas de vouchers já impressos prontos para entrega na recepção.

---

## 📱 Autenticação Rápida via QR Code

Cada voucher gerado pelo tClavis pode estampar um **QR Code**:

1. Ao apontar a câmera do smartphone para o QR Code do cupom:
   * O cliente é redirecionado automaticamente para a página de login do Hotspot do MikroTik com o login e senha já preenchidos no formulário!
2. O cliente só precisa tocar no botão "Conectar" na tela do celular.
3. Isso reduz drasticamente chamados de suporte decorrentes de digitação errada de senhas por parte de hóspedes e visitantes.
