# Pedal Stack – SCB

Protótipo do **SCB – Sistema de Controle de Bicicletário** da empresa VáDeBicicleta, feito pelo grupo **Pedal Stack** para a disciplina de Análise Orientada a Objetos da Universidade Veiga de Almeida (2026).

Com o SCB, o ciclista se cadastra pelo app, retira uma bicicleta em qualquer totem digitando o número da tranca, usa até 2 horas na taxa básica e devolve em qualquer tranca livre. A proposta do grupo, **Pagamento sem Surpresa**, garante que o ciclista sempre saiba o que vai pagar, quando e por quê.

🔗 **App:** https://dudaaxgon.github.io/Pedal-Stack/
📱 **Versão para apresentação (app dentro de um celular):** https://dudaaxgon.github.io/Pedal-Stack/apresentacao.html
📋 **Quadro Kanban (Trello):** https://trello.com/invite/b/6ae791bae49afe0031884882/ATTI1afcd5c08fabef793186bb6e2ddac74d09223E53/scb-pedal-stack

> Este é um protótipo front-end. As operações (cadastro, cobrança, tranca, e-mail) são simuladas no navegador e os dados ficam salvos no `localStorage`. A arquitetura do sistema completo está descrita no documento de Solução Tecnológica.

## Funcionalidades

### Sprint 1 – Primeiro acesso
- **US 01 – Cadastrar ciclista:** brasileiro (CPF) ou estrangeiro (passaporte), foto do documento e cartão validado na hora.
- **US 02 – Fazer login:** bloqueio temporário após 3 tentativas incorretas.
- **US 03 – Alterar dados e cartão.**

### Sprint 2 – A viagem
- **US 04 – Alugar bicicleta:** escolha do totem e da tranca, cobrança única da taxa básica e estorno automático se a tranca não liberar.
- **US 05 – Devolver bicicleta:** devolução em qualquer tranca livre, com confirmação na hora e cálculo da taxa extra.

### Sprint 3 – Depois da viagem
- **US 06 – Aviso antes das 2 horas:** notificação quando o aluguel completa 1h45.
- **US 07 – Cobrar taxas extras pendentes:** a taxa recusada na devolução fica pendente, bloqueia novos aluguéis e pode ser paga pelo extrato.
- **US 08 – E-mail da operação:** caixa de e-mails simulada com a confirmação de cada aluguel e devolução.
- **US 09 – Extrato de cobranças:** cobranças com status paga, pendente ou estornada.

### Regras de cobrança
| Item | Valor |
|---|---|
| Taxa básica (até 2 horas) | R$ 10,00 |
| Taxa extra | R$ 5,00 a cada 30 minutos |

## Modo demonstração

Para apresentar sem esperar 2 horas, as caixas amarelas **Modo demonstração** permitem:

- entrar com uma **conta de demonstração** (Ana Souza);
- **simular falha da tranca**, que dispara o estorno automático;
- **avançar o tempo** da viagem (+15 min, 1h45, 2h30);
- **simular cartão recusado** na taxa extra ou no pagamento da pendência;
- **limpar** aluguéis, cobranças e e-mails (na tela de perfil).

## Como rodar localmente

Não precisa instalar nada nem fazer build: é HTML, CSS e JavaScript puros.

```bash
git clone https://github.com/Dudaaxgon/Pedal-Stack.git
cd Pedal-Stack
python3 -m http.server 8000
```

Depois acesse `http://localhost:8000`.

Use um servidor local em vez de abrir o `index.html` direto, porque alguns navegadores bloqueiam o `localStorage` dentro do iframe da página de apresentação quando o arquivo é aberto como `file://`.

## Estrutura

```
├── index.html          # app
├── apresentacao.html   # app dentro de uma moldura de celular
├── css/styles.css      # estilos e identidade visual
