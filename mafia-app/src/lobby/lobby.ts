import { nanoid } from 'nanoid';

type Player = { name: string };
type Event  = { type: 'player_join'; id: string; name: string };


export class LobbyDO {
  private players: Record<string, Player> = {};
  private sockets = new Set<WebSocket>();
 

  constructor(private state: DurableObjectState, private env: Env) {
    
    this.state = state;
  }

  private respond = (d: unknown, s = 200) =>
    new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });

  private broadcast(ev: Event) {
    for (const ws of [...this.sockets]) {
      try { ws.send(JSON.stringify(ev)); } catch { this.sockets.delete(ws); }
    }
  }

  async fetch(req: Request) {
    const url = new URL(req.url);

    /* WebSocket upgrade */
    if (url.pathname === '/connect' && req.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
      server.accept();
      server.addEventListener('close', () => this.sockets.delete(server));
      server.addEventListener('error', () => this.sockets.delete(server));
      server.send(JSON.stringify({ type: 'sync', players: this.players }));
      this.sockets.add(server);
      return new Response(null, { status: 101, webSocket: client });
    }

    /* Initialise lobby (host) */
    if (url.pathname === '/init' && req.method === 'POST') {
      const { host } = await req.json();
      const id = nanoid(8);
      this.players[id] = { name: host };
      return this.respond({ playerId: id });
    }

    /* Join lobby */
    if (url.pathname === '/join' && req.method === 'POST') {
      const { name } = await req.json();
      const id = nanoid(8);
      this.players[id] = { name };
      this.broadcast({ type: 'player_join', id, name });
      return this.respond({ playerId: id, players: this.players });
    }

    
    return new Response('Bad request', { status: 400 });
  }
  
}