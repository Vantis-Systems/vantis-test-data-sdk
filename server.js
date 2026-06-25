// Live acceptance app for @vantis/data (VAN-597). Zero-config: import { data },
// no createClient, no URL, no key — DATA_API_URL/DATA_API_TOKEN are injected by
// the declared --uses edge (VAN-852). Proves the runtime round-trip against a
// live per-block PostgREST.
import http from 'node:http';
import { data } from '@vantis/data';

const PORT = process.env.PORT || 8080;

async function roundtrip() {
  const email = `alice+${Date.now()}@example.com`;

  // 1. typed insert (chain .select() to get the row back)
  const ins = await data.from('users').insert({ email, name: 'Alice' }).select();
  if (ins.error) return { step: 'insert user', error: ins.error };
  const user = ins.data[0];

  // 2. insert a post with an FK to the user
  const insP = await data.from('posts').insert({ user_id: user.id, title: 'Hello' }).select();
  if (insP.error) return { step: 'insert post', error: insP.error };

  // 3. filtered read
  const read = await data.from('users').eq('email', email);
  if (read.error) return { step: 'read user', error: read.error };

  // 4. FK embed — posts with their referenced user
  const emb = await data.from('posts').eq('user_id', user.id).embed('users');
  if (emb.error) return { step: 'embed', error: emb.error };

  return { ok: true, insertedUser: user, filteredRead: read.data, embedded: emb.data };
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const url = (req.url || '/').split('?')[0];
    if (url === '/health') {
      const r = await data.from('users').limit(1);
      res.end(JSON.stringify({
        status: r.error ? 'error' : 'ok',
        error: r.error,
        env: { hasUrl: !!process.env.DATA_API_URL, hasToken: !!process.env.DATA_API_TOKEN },
      }));
    } else if (url === '/roundtrip') {
      const out = await roundtrip();
      res.statusCode = out.ok ? 200 : 500;
      res.end(JSON.stringify(out));
    } else {
      res.end(JSON.stringify({ status: 'ok', endpoints: ['/health', '/roundtrip'] }));
    }
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({ crash: String((e && e.message) || e) }));
  }
});
server.listen(PORT, () => console.log(`vantis-data-sdk test app listening on ${PORT}`));
