import { createClient, type Client } from '@libsql/client/web';
import { Hono } from 'hono';

type Bindings = {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  FIREBASE_PROJECT_ID: string;
  ADMIN_EMAIL: string;
  REQUIRE_ADMIN?: string;
};

type SignedInUser = {
  email: string;
};

type DocumentTypeInput = {
  id?: string;
  name?: string;
  fields?: unknown;
  themes?: unknown;
  html?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

const CREATE_DOCUMENT_TYPES = `
  CREATE TABLE IF NOT EXISTS document_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    fields TEXT NOT NULL,
    themes TEXT NOT NULL,
    html TEXT NOT NULL
  )
`;

function database(env: Bindings): Client {
  return createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });
}

async function readyDatabase(env: Bindings): Promise<Client> {
  const client = database(env);
  await client.execute(CREATE_DOCUMENT_TYPES);
  return client;
}

function jsonText(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

async function signedInUser(c: { env: Bindings; req: { header: (name: string) => string | undefined } }): Promise<SignedInUser | null> {
  const header = c.req.header('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
  const projectId = c.env.FIREBASE_PROJECT_ID?.trim();
  if (!token || !projectId) return null;

  const response = await fetch('https://oauth2.googleapis.com/tokeninfo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: token }),
  });
  if (!response.ok) return null;

  const payload = await response.json() as { aud?: string; iss?: string; email?: string };
  if (payload.aud !== projectId) return null;
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
  if (!payload.email) return null;
  return { email: payload.email };
}

function isAdmin(env: Bindings, email: string): boolean {
  const admin = env.ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(admin) && email.toLowerCase() === admin;
}

function adminRequired(env: Bindings): boolean {
  return env.REQUIRE_ADMIN !== 'false';
}

function toDocument(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    fields: parseJson(row.fields),
    themes: parseJson(row.themes),
    html: row.html,
  };
}

app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    engine: 'invoice-tool',
    storage: 'firebase',
  });
});

app.post('/api/document-types', async (c) => {
  if (adminRequired(c.env)) {
    const user = await signedInUser(c);
    if (!user || !isAdmin(c.env, user.email)) {
      return c.json({ error: 'Admin login required' }, 401);
    }
  }

  let body: DocumentTypeInput;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Expected JSON' }, 400);
  }

  if (!body.id || !body.name || body.fields == null || body.themes == null || typeof body.html !== 'string') {
    return c.json({ error: 'id, name, fields, themes, and html are required' }, 400);
  }

  const client = await readyDatabase(c.env);
  await client.execute({
    sql: `INSERT INTO document_types (id, name, fields, themes, html)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            fields = excluded.fields,
            themes = excluded.themes,
            html = excluded.html`,
    args: [body.id, body.name, jsonText(body.fields), jsonText(body.themes), body.html],
  });

  const saved = await client.execute({
    sql: 'SELECT id, name, fields, themes, html FROM document_types WHERE id = ?',
    args: [body.id],
  });
  const row = saved.rows[0];
  if (!row) return c.json({ error: 'Save failed' }, 500);
  return c.json(toDocument(row as unknown as Record<string, unknown>), 201);
});

app.get('/api/document-types/:id', async (c) => {
  const user = await signedInUser(c);
  if (!user) return c.json({ error: 'Login required' }, 401);

  const client = await readyDatabase(c.env);
  const result = await client.execute({
    sql: 'SELECT id, name, fields, themes, html FROM document_types WHERE id = ?',
    args: [c.req.param('id')],
  });
  const row = result.rows[0];
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(toDocument(row as unknown as Record<string, unknown>));
});

app.get('/api/document-types', async (c) => {
  const user = await signedInUser(c);
  if (!user) return c.json({ error: 'Login required' }, 401);

  const client = await readyDatabase(c.env);
  const result = await client.execute(
    'SELECT id, name, fields, themes, html FROM document_types ORDER BY name',
  );
  return c.json(result.rows.map((row) => toDocument(row as unknown as Record<string, unknown>)));
});

app.all('/api/*', (c) => c.text('Not found', 404));

export default app;
