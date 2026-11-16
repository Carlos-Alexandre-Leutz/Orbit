# ADR-007: Cadastro do lojista na plataforma, conta de cliente global e loja personalizável

- **Status:** Accepted
- **Date:** 2026-11-16

## Context

O [ADR-005](ADR-005-stores-and-storefronts.md) criou as lojas, mas o produto ainda não parece uma plataforma de lojas virtuais: a loja só tem nome e descrição, a vitrine é uma grade de texto, a página inicial é uma lista de lojas e o cadastro é um formulário só, com uma caixinha "I want to sell". Quem cria a conta não sabe se ela é de cliente ou de lojista.

O dono descreveu o modelo que quer: o lojista é cliente da **plataforma** (ele se cadastra, configura a loja e recebe um link para vender; no futuro um site de vendas do Orbit aponta para o cadastro). O comprador está **dentro da loja** do lojista e cria a conta ali, na hora de comprar. Essa conta é **global**: quem compra em duas lojas vê os pedidos das duas num lugar só, como num marketplace, mas com lojas separadas.

Restrições: o pagamento real fica para depois (entra o Stripe, [ADR-004](ADR-004-payments-behind-a-port.md)), então por ora ele é simulado; o primeiro deploy é uma VPS pequena; os dados de uma loja nunca podem chegar ao lojista de outra.

## Decision

- **O lojista se cadastra em `/sell`**, uma página própria da plataforma. A caixinha "I want to sell" some. O `/register` global deixa de oferecer cadastro de cliente.
- **O cliente se cadastra e entra dentro da loja** (por exemplo `/<slug>/login`), e volta para a loja onde estava. A tela diz que a conta vale em todas as lojas.
- **Um e-mail tem um único papel.** Quem quer ser lojista e cliente usa dois e-mails. A decisão pode mudar depois; não há dado que impeça.
- **A conta de cliente é global**, como o [ADR-005](ADR-005-stores-and-storefronts.md) já adotou. Uma página `/account` lista os pedidos do cliente em todas as lojas, agrupados por loja.
- **Uma ligação cliente × loja** registra em quais lojas o cliente entrou ou comprou. O lojista só enxerga os clientes da própria loja e, deles, só o que vem dos pedidos daquela loja (nome, e-mail, endereço de entrega). Nunca vê onde mais o cliente comprou. Isso é garantido na API e coberto por testes de isolamento, como no PBI-59.
- **O consentimento de marketing é por loja.** Um aviso da loja A só pode ir a quem aceitou na loja A. O cliente pode apagar a conta.
- **A loja ganha aparência própria:** logo, capa, cor principal, slogan e contato, editados num painel de configurações. A vitrine e as telas de login da loja usam essa aparência. Temas prontos e editor de páginas ficam de fora.
- **As imagens passam por uma porta `ImageStorage`**, com um adaptador de disco local primeiro. No QA do Render grátis o disco some a cada deploy, então as fotos de lá se perdem; é um limite conhecido, não um defeito.
- **O pagamento é simulado** por uma tela de aprovar ou recusar, sobre o provedor falso que já existe. O Stripe real entra no mesmo lugar depois.
- Os links `sell` e `account` entram na lista de links reservados.

O que existe hoje: nada disto está construído. Os PBIs 65, 70, 61, 66, 67, 68 e 69, nessa ordem, implementam esta decisão, antes do PBI-11 e do trabalho dos agentes.

## Alternatives considered

- **Contas de cliente separadas por loja.** Mais simples de isolar, mas a pessoa se cadastra de novo em cada loja e o assistente não a reconhece entre lojas. O dono quer a conta global como diferencial.
- **Um e-mail com dois papéis (cliente e lojista).** Mais flexível, mas exige trocar de papel no menu e complica as guardas. Fica para depois, se alguém pedir.
- **Cadastro de cliente também no `/register` global.** Volta a confundir quem é quem. O cliente sempre chega por uma loja.
- **Guardar as imagens só como URL.** Zero infraestrutura, mas o lojista teria de hospedar as fotos em outro lugar, o que não parece uma loja pronta. A porta permite começar no disco e trocar por armazenamento de objetos.
- **Temas prontos e editor de páginas.** Parecem com a Shopify, mas são um projeto à parte.

## Consequences

- O cliente reconhece a plataforma em todas as lojas, e o Orbit guarda uma base de clientes própria, útil para o chat e os agentes.
- O isolamento ganha um segundo eixo (o lojista não vê o que o cliente fez nas outras lojas), então os testes dele fazem parte do PBI-70, não são extras.
- A LGPD passa a pesar: consentimento por loja, apagar a conta e não cruzar dados entre lojas. Um e-mail de loja nunca usa dados de outra.
- O cliente vê "Orbit" no e-mail e na tela de login de uma loja que não conhece a plataforma; o rodapé e uma frase devem explicar isso.
- As fotos do QA no Render grátis não persistem entre deploys.
