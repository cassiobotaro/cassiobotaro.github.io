+++
title = "Como detectei um leak de memória em Node.js com heap snapshots"
date = "2026-04-01"
description = "Um passo a passo didático para reproduzir, investigar e corrigir um leak de memória em Node.js usando Sequelize, Chrome DevTools e autocannon."
slug = "detectando-memory-leak-nodejs"
tags = ["nodejs", "javascript", "performance", "debug", "sequelize"]
categories = ["javascript"]
+++

![Leak](/images/leak.png)

Recentemente precisei investigar um crescimento estranho de memória num projeto real — o comportamento não aparecia em desenvolvimento, mas explodiu sob carga. Montei um exemplo mínimo que reproduz o cenário. Mais importante do que decorar a correção é entender o processo: se você souber repetir esse fluxo, vai conseguir investigar problemas parecidos com muito mais segurança.

## O sintoma

O endpoint buscava dados com Sequelize, enriquecia cada item com informação externa e serializava tudo na resposta. O problema só apareceu ao executar repetidamente sob carga.

## O projeto de exemplo

Como o projeto real não está disponível para quem lê o blog, abaixo está um projeto mínimo que você pode montar localmente para reproduzir um cenário muito próximo do que aconteceu de verdade.

### Estrutura de pastas

```txt
exemplo-leak/
├── controllers/
│   └── messageController.js
├── models/
│   └── Message.js
├── db.js
├── index.js
├── package.json
└── seed.js
```

### `package.json`

```json
{
  "name": "exemplo-leak",
  "version": "1.0.0",
  "description": "Exemplo simplificado de leak de memória em Node.js",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "seed": "node seed.js"
  },
  "dependencies": {
    "express": "^5.2.1",
    "mysql2": "^3.20.0",
    "sequelize": "^6.37.8"
  }
}
```

Depois de criar esse arquivo, instale as dependências com `npm install`.

### `db.js`

Configura a conexão com o banco usando as credenciais criadas no Docker:

```js
import { Sequelize } from 'sequelize';

const sequelize = new Sequelize('exemploLeakDb', 'admin', 'admin', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false,
});

export default sequelize;
```

### `models/Message.js`

```js
import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  content: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'sent', 'read'),
    defaultValue: 'pending',
  },
});

export default Message;
```

O campo `content` parece simples por enquanto — ele vai ser o pivô do problema no controller.

### `controllers/messageController.js`

Este é o coração do problema:

```js
import Message from '../models/Message.js';

async function fetchExternalNotifications() {
  return Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    text: `Notificação #${i + 1}: evento registrado no sistema externo`,
    timestamp: new Date(Date.now() - i * 60000).toISOString(),
  }));
}

export async function listMessages(req, res) {
  const messages = await Message.findAll();

  const externalData = await fetchExternalNotifications();

  messages.forEach((message) => {
    message.content = externalData;
  });

  res.json(messages);
}
```

O ponto principal aqui é: `Message.findAll()` devolve instâncias do Sequelize, não objetos JavaScript puros. Isso faz diferença quando começamos a anexar estruturas grandes nessas instâncias.

### `index.js`

Servidor Express que expõe o endpoint e aguarda a sincronização do banco antes de iniciar:

```js
import express from 'express';
import sequelize from './db.js';
import { listMessages } from './controllers/messageController.js';

const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/messages', listMessages);

sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
});
```

### `seed.js`

Popula o banco com 20 mensagens de teste para ter dados suficientes ao gerar carga:

```js
import Message from './models/Message.js';
import sequelize from './db.js';

const STATUSES = ['pending', 'sent', 'read'];

const messages = Array.from({ length: 20 }, (_, i) => ({
  content: `Mensagem de exemplo #${i + 1}`,
  status: STATUSES[i % STATUSES.length],
}));

await sequelize.sync();
await Message.destroy({ where: {}, truncate: true });
await Message.bulkCreate(messages);

console.log(`${messages.length} mensagens inseridas com sucesso.`);
await sequelize.close();
```

## Preparando o ambiente

Esse exemplo usa MySQL. Se você quiser subir tudo rapidamente com Docker:

```bash
docker run --name exemplo-leak-mysql \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=exemploLeakDb \
  -e MYSQL_USER=admin \
  -e MYSQL_PASSWORD=admin \
  -p 3306:3306 \
  -d mysql:8
```

Depois acompanhe a inicialização:

```bash
docker logs -f exemplo-leak-mysql
```

Quando o banco estiver pronto, popule os dados:

```bash
npm run seed
```

## Como reproduzir o problema

Para investigar leak de memória, primeiro crio um caminho reproduzível:

1. subir a aplicação com inspeção habilitada;
2. tirar um snapshot baseline;
3. aplicar carga;
4. tirar novos snapshots;
5. comparar o heap antes e depois.

## Onde entra a coleta de lixo nessa história

Em linguagens com gerenciamento automático de memória, o garbage collector libera objetos que não podem mais ser alcançados pelo programa. O problema começa quando referências continuam existindo — se um array ainda está pendurado em uma instância acessível, o GC não pode removê-lo.

O botão `Collect garbage` do DevTools força uma nova coleta e reduz o ruído de objetos temporários, deixando mais visível o que realmente continua retido. Se mesmo após a coleta certos objetos seguem crescendo entre snapshots, o indício é que alguma cadeia de referências está mantendo esses objetos vivos.

### Subindo o servidor e abrindo o DevTools

```bash
node --inspect index.js
```

**Chrome:** Acesse `chrome://inspect`, localize o processo Node em `Remote Target`, clique em `inspect` e abra a aba `Memory`.

**Firefox:** Acesse `about:debugging` → `Setup`, adicione `localhost:9229` em `Network Locations` e confirme. De volta à tela principal, conecte-se ao host, localize o processo Node, clique em `Inspect` e abra a aba `Memory`.

Antes de gerar qualquer carga, clique em `Heap snapshot` → `Take snapshot` (opcionalmente clique em `Collect garbage` antes). Esse primeiro snapshot será sua referência.

## Gerando carga com `autocannon`

Em outro terminal:

```bash
npx autocannon -c 20 -d 30 http://localhost:3000/messages
```

- `-c 20`: vinte conexões simultâneas;
- `-d 30`: carga por trinta segundos.

A cada requisição, instâncias do Sequelize recebem um array grande — exatamente o que queremos observar no heap.

## Tirando novos snapshots

Depois da primeira rodada de carga:

1. volte para o DevTools;
2. clique em `Collect garbage`;
3. tire um segundo `Heap snapshot`.

Depois repita a carga e tire um terceiro snapshot.

O ideal é comparar:

- snapshot 1: baseline;
- snapshot 2: depois da primeira carga;
- snapshot 3: depois da segunda carga.

Se a memória cresce e não volta para um patamar parecido mesmo depois do GC, você já tem um sinal forte de retenção.

## O que observar na comparação

**No Chrome:** Ao selecionar um snapshot, troque a visualização para `Comparison`. Eu costumo olhar primeiro para:

- `Array`;
- `Object`;
- instâncias ligadas ao ORM;
- aumento de `Retained Size`.

Os números mais interessantes normalmente são estes:

- `# New`: objetos criados desde o snapshot anterior;
- `Shallow Size`: memória do próprio objeto, sem contar o que ele referencia;
- `Retained Size`: tudo que seria liberado se esse objeto fosse coletado.

**No Firefox:** não há visualização `Comparison` direta. Tire os snapshots, selecione o mais recente e use `Dominators` (memória dominada por objeto) ou `Aggregate` (contagem por tipo) para comparar `Bytes` e `Count` entre os estados.

Se essas estruturas seguem crescendo a cada rodada de carga, a investigação fica bem encaminhada.

## Seguindo o grafo de retenção

Essa parte é a mais importante.

**No Chrome:** Ao clicar em uma entrada suspeita no snapshot, o DevTools mostra os `Retainers`, isto é, quem está segurando aquele objeto na memória.

**No Firefox:** Na visualização `Dominators`, clique em uma entrada para expandir a árvore e ver quais objetos estão sendo retidos por ela. O conceito é equivalente ao dos `Retainers` do Chrome — você está seguindo o caminho de referências que impede o GC de liberar o objeto.

No meu caso, o caminho esperado era parecido com isto:

```txt
Array
  -> content
  -> Message (instância Sequelize)
  -> messages
```

Essa cadeia é muito valiosa, porque ela responde uma pergunta essencial:

> Quem está mantendo esse objeto vivo?

E a resposta era exatamente o que eu precisava: o array grande estava preso dentro da propriedade `content`, que por sua vez estava ligada a instâncias do Sequelize retornadas pelo endpoint.

## Entendendo por que esse código pesa tanto

O problema era a combinação de dois fatores:

1. `Message.findAll()` devolve instâncias ricas do Sequelize;
2. cada instância passa a carregar uma estrutura grande que não fazia parte do dado original.

Ou seja, eu não estava anexando dados grandes em objetos simples. Eu estava anexando dados grandes em objetos mais pesados, com estrutura interna do ORM, metadados e outros caminhos de referência.

Em cenários de carga, essa diferença aparece no heap.

## A correção

No exemplo simplificado, a melhora veio usando `raw: true`:

```js
const messages = await Message.findAll({ raw: true });
```

Com isso, o Sequelize retorna objetos JavaScript simples em vez de instâncias ricas do modelo. Sem as referências internas do ORM, o GC consegue liberá-los assim que saem do escopo da requisição.

## Como validar que a correção funcionou

Depois da alteração, repita o mesmo processo (reiniciar com `--inspect`, tirar baseline, rodar autocannon, comparar snapshots). O crescimento deve deixar de ser acumulativo, com menos objetos retidos ligados a `Message` e redução de `Retained Size` após o GC. Alguma variação é normal em sistemas reais — o importante é que o heap não continue crescendo indefinidamente.

## O que eu levo dessa investigação

Esse caso me relembrou algumas coisas importantes:

1. leak de memória raramente aparece como um objeto solto — o problema costuma estar em como os dados são montados e transportados;
2. atribuir dados em objetos de ORM tem efeito colateral: o dado fica preso enquanto o objeto existir, e objetos de ORM vivem mais do que você imagina;
3. heap snapshot é muito mais útil quando você compara estados sob carga;
4. seguir os `Retainers` é o caminho mais rápido para sair da suspeita e chegar na causa.

Trabalha com Node.js, ORMs e respostas grandes em JSON? Desconfie de mutações em objetos complexos retornados por bibliotecas.

Então é isso, pessoal!

Até a próxima!

{}'s
