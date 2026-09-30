import { Hono } from 'hono';

const app = new Hono();

app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    engine: 'invoice-tool',
    storage: 'firebase',
  });
});

app.all('/api/*', (c) => c.text('Not found', 404));

export default app;
