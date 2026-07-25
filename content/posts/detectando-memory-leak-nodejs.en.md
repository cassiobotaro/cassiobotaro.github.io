+++
title = "How I detected a memory leak in Node.js with heap snapshots"
date = "2026-04-01"
description = "A hands-on walkthrough to reproduce, investigate and fix a memory leak in Node.js using Sequelize, Chrome DevTools and autocannon."
slug = "detecting-a-memory-leak-in-nodejs"
tags = ["nodejs", "javascript", "performance", "debug", "sequelize"]
categories = ["javascript"]
+++

![Leak](/images/leak.png)

I recently had to investigate a strange memory growth in a real project. The behavior did not show up in development, but it blew up under load. I put together a minimal example that reproduces the scenario. More important than memorizing the fix is understanding the process: if you know how to repeat this flow, you will be able to investigate similar problems with much more confidence.

## The symptom

The endpoint fetched data with Sequelize, enriched each item with external information and serialized everything into the response. The problem only showed up when running it repeatedly under load.

## The example project

Since the real project is not available to blog readers, below is a minimal project you can put together locally to reproduce a scenario very close to what actually happened.

### Folder structure

```txt
leak-example/
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
  "name": "leak-example",
  "version": "1.0.0",
  "description": "Simplified example of a memory leak in Node.js",
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

After creating that file, install the dependencies with `npm install`.

### `db.js`

Sets up the database connection using the credentials created in Docker:

```js
import { Sequelize } from 'sequelize';

const sequelize = new Sequelize('leakExampleDb', 'admin', 'admin', {
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

The `content` field looks simple for now, but it will be the pivot of the problem in the controller.

### `controllers/messageController.js`

This is the heart of the problem:

```js
import Message from '../models/Message.js';

async function fetchExternalNotifications() {
  return Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    text: `Notification #${i + 1}: event recorded in the external system`,
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

The main point here is: `Message.findAll()` returns Sequelize instances, not plain JavaScript objects. That makes a difference once we start attaching large structures to those instances.

### `index.js`

An Express server that exposes the endpoint and waits for the database sync before starting:

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
    console.log(`Server running at http://localhost:${PORT}`);
  });
});
```

### `seed.js`

Populates the database with 20 test messages so there is enough data when generating load:

```js
import Message from './models/Message.js';
import sequelize from './db.js';

const STATUSES = ['pending', 'sent', 'read'];

const messages = Array.from({ length: 20 }, (_, i) => ({
  content: `Example message #${i + 1}`,
  status: STATUSES[i % STATUSES.length],
}));

await sequelize.sync();
await Message.destroy({ where: {}, truncate: true });
await Message.bulkCreate(messages);

console.log(`${messages.length} messages inserted successfully.`);
await sequelize.close();
```

## Preparing the environment

This example uses MySQL. If you want to spin everything up quickly with Docker:

```bash
docker run --name leak-example-mysql \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=leakExampleDb \
  -e MYSQL_USER=admin \
  -e MYSQL_PASSWORD=admin \
  -p 3306:3306 \
  -d mysql:8
```

Then follow the startup:

```bash
docker logs -f leak-example-mysql
```

Once the database is ready, populate the data:

```bash
npm run seed
```

## How to reproduce the problem

To investigate a memory leak, I first create a reproducible path:

1. start the application with inspection enabled;
2. take a baseline snapshot;
3. apply load;
4. take new snapshots;
5. compare the heap before and after.

## Where garbage collection fits into this story

In languages with automatic memory management, the garbage collector frees objects that can no longer be reached by the program. The problem starts when references stick around: if an array is still hanging off a reachable instance, the GC cannot remove it.

The `Collect garbage` button in DevTools forces a new collection and reduces the noise from temporary objects, making it clearer what is really still retained. If certain objects keep growing between snapshots even after collection, that is a sign that some chain of references is keeping those objects alive.

### Starting the server and opening DevTools

```bash
node --inspect index.js
```

**Chrome:** go to `chrome://inspect`, find the Node process under `Remote Target`, click `inspect` and open the `Memory` tab.

**Firefox:** go to `about:debugging` → `Setup`, add `localhost:9229` under `Network Locations` and confirm. Back on the main screen, connect to the host, find the Node process, click `Inspect` and open the `Memory` tab.

Before generating any load, click `Heap snapshot` → `Take snapshot` (optionally click `Collect garbage` first). That first snapshot will be your reference.

## Generating load with `autocannon`

In another terminal:

```bash
npx autocannon -c 20 -d 30 http://localhost:3000/messages
```

- `-c 20`: twenty simultaneous connections;
- `-d 30`: load for thirty seconds.

On every request, Sequelize instances receive a large array, which is exactly what we want to observe in the heap.

## Taking new snapshots

After the first round of load:

1. go back to DevTools;
2. click `Collect garbage`;
3. take a second `Heap snapshot`.

Then repeat the load and take a third snapshot.

Ideally you compare:

- snapshot 1: baseline;
- snapshot 2: after the first load;
- snapshot 3: after the second load.

If memory grows and does not come back to a similar level even after the GC, you already have a strong sign of retention.

## What to look at in the comparison

**In Chrome:** after selecting a snapshot, switch the view to `Comparison`. I usually look first at:

- `Array`;
- `Object`;
- instances tied to the ORM;
- an increase in `Retained Size`.

The most interesting numbers are usually these:

- `# New`: objects created since the previous snapshot;
- `Shallow Size`: the memory of the object itself, not counting what it references;
- `Retained Size`: everything that would be freed if that object were collected.

**In Firefox:** there is no direct `Comparison` view. Take the snapshots, select the most recent one and use `Dominators` (memory dominated per object) or `Aggregate` (count by type) to compare `Bytes` and `Count` across the states.

If those structures keep growing with each round of load, the investigation is well on track.

## Following the retention graph

This part is the most important one.

**In Chrome:** when you click a suspicious entry in the snapshot, DevTools shows the `Retainers`, that is, who is holding that object in memory.

**In Firefox:** in the `Dominators` view, click an entry to expand the tree and see which objects are being retained by it. The concept matches Chrome's `Retainers`, you are following the chain of references that stops the GC from freeing the object.

In my case, the expected path looked something like this:

```txt
Array
  -> content
  -> Message (Sequelize instance)
  -> messages
```

That chain is extremely valuable, because it answers an essential question:

> Who is keeping this object alive?

And the answer was exactly what I needed: the large array was stuck inside the `content` property, which in turn was attached to the Sequelize instances returned by the endpoint.

## Understanding why this code weighs so much

The problem was the combination of two factors:

1. `Message.findAll()` returns rich Sequelize instances;
2. each instance ends up carrying a large structure that was not part of the original data.

In other words, I was not attaching large data to plain objects. I was attaching large data to heavier objects, with the ORM's internal structure, metadata and other reference paths.

Under load, that difference shows up in the heap.

## The fix

In the simplified example, the improvement came from using `raw: true`:

```js
const messages = await Message.findAll({ raw: true });
```

With that, Sequelize returns plain JavaScript objects instead of rich model instances. Without the ORM's internal references, the GC can free them as soon as they leave the scope of the request.

## How to validate that the fix worked

After the change, repeat the same process (restart with `--inspect`, take a baseline, run autocannon, compare snapshots). The growth should stop being cumulative, with fewer retained objects tied to `Message` and a reduction in `Retained Size` after the GC. Some variation is normal in real systems, what matters is that the heap does not keep growing indefinitely.

## What I take away from this investigation

This case reminded me of a few important things:

1. a memory leak rarely shows up as a loose object, the problem is usually in how the data is assembled and carried around;
2. assigning data onto ORM objects has a side effect: the data gets stuck for as long as the object exists, and ORM objects live longer than you think;
3. a heap snapshot is much more useful when you compare states under load;
4. following the `Retainers` is the fastest way to go from suspicion to root cause.

Do you work with Node.js, ORMs and large JSON responses? Be suspicious of mutations on complex objects returned by libraries.

That's it, folks!

See you next time!

{}'s
