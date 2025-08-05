import { nanoid } from 'nanoid';
export interface Env { LOBBY: DurableObjectNamespace; }


const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    /* Create lobby */
    if (url.pathname === '/api/lobby/create' && request.method === 'POST') {
      const { hostName } = await request.json();
      const code = nanoid(6).toUpperCase();
      const obj  = env.LOBBY.get(env.LOBBY.idFromName(code));
      await obj.fetch('https://dummy/init', {
  method: 'POST',
  body: JSON.stringify({ host: hostName })
});
      return json({ code });
    }

    /* Join lobby */
    if (url.pathname === '/api/lobby/join' && request.method === 'POST') {
      const { code, name } = await request.json();
      const obj = env.LOBBY.get(env.LOBBY.idFromName(code));
      return obj.fetch('https://dummy/join', {
  method: 'POST',
  body: JSON.stringify({ name })
});
    }

    /* WS proxy */
    if (url.pathname.startsWith('/api/lobby/') && url.pathname.endsWith('/connect')) {
  const [, , , code] = url.pathname.split('/');              // ['', 'api','lobby','ABC123','connect']
  const obj = env.LOBBY.get(env.LOBBY.idFromName(code));

  // Build a new URL with the same origin (dummy) but path '/connect'
  const targetUrl = new URL(request.url);
  targetUrl.pathname = '/connect';

  // Create a brand-new Request that preserves method, headers, body, and upgrade
  const proxied = new Request(targetUrl.toString(), request);

  return obj.fetch(proxied);
}
    
    return new Response('Not found', { status: 404 });
  }
};
export { LobbyDO } from './lobby/lobby'; 
export interface Env { LOBBY: DurableObjectNamespace; }