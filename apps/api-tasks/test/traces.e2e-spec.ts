import { MongoClient } from 'mongodb';
import { MongoTraceStore } from '../src/correlation/trace-store';

const url = process.env.MONGO_URL;

/** Needs a MongoDB; the CI starts one. Without `MONGO_URL` the suite is skipped, and says so. */
(url ? describe : describe.skip)('MongoTraceStore (e2e)', () => {
  const store = new MongoTraceStore(url ?? 'mongodb://unused', 7);
  const tag = `test-${Date.now()}`;

  afterAll(async () => {
    const client = new MongoClient(url as string);
    await client
      .db()
      .collection('execution_traces')
      .deleteMany({ correlationId: { $regex: `^${tag}` } });
    await client.close();
    await store.onModuleDestroy();
  });

  it('saves a trace that can be found by its correlation ID, with a TTL index', async () => {
    await store.save({
      correlationId: `${tag}-a`,
      method: 'GET',
      route: '/products',
      status: 200,
      durationMs: 3,
      startedAt: new Date(),
      steps: [{ name: 'tool.search', at: new Date(), data: { q: 'shoe' } }],
    });
    const client = new MongoClient(url as string);
    const collection = client.db().collection('execution_traces');
    const found = await collection.findOne({ correlationId: `${tag}-a` });
    const indexes = await collection.indexes();
    await client.close();
    expect(found).toMatchObject({ route: '/products', status: 200 });
    expect(indexes.some((i) => i.expireAfterSeconds === 7 * 86400)).toBe(true);
  });

  it('never throws when MongoDB is down', async () => {
    const down = new MongoTraceStore('mongodb://127.0.0.1:1/x');
    await expect(
      down.save({
        correlationId: 'req-12345678',
        method: 'GET',
        route: '/',
        status: 200,
        durationMs: 1,
        startedAt: new Date(),
        steps: [],
      }),
    ).resolves.toBeUndefined();
    await down.onModuleDestroy();
  });
});
