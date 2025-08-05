import Fastify from 'fastify';
import fastifyIO from 'fastify-socket.io';
import { nanoid } from 'nanoid';

type Role = 'mafia' | 'doctor' | 'police' | 'villager';
type Player = { id: string; name: string };
type Lobby = {
  code: string;
  players: Player[];
  locked: boolean;
  roles: Record<string, Role>;
  mafiaCount?: number; // Optional custom mafia count
};

const lobbies = new Map<string, Lobby>();
const app = Fastify({ logger: true });

// Add CORS headers manually
app.addHook('onRequest', async (request, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    reply.send();
  }
});

await app.register(fastifyIO, { cors: { origin: '*' } });

// Get the Socket.IO instance with type assertion
const io = (app as any).io;

function assignRoles(players: string[], customMafiaCount?: number): Record<string, Role> {
  const N = players.length;
  const power = 2;               // 1 doctor + 1 police
  
  // Auto-assign mafia count if not provided or if 0
  let mafia: number;
  if (customMafiaCount && customMafiaCount > 0) {
    mafia = customMafiaCount;
  } else {
    // Auto-calculation: aim for roughly 1/3 of non-power roles
    mafia = Math.max(1, Math.round((N - power) / 3));
  }

  console.log('🎭 Role Assignment Debug:');
  console.log('  Players:', N);
  console.log('  Custom Mafia Count:', customMafiaCount);
  console.log('  Auto-calculated Mafia:', mafia);
  console.log('  Player IDs:', players);

  // shuffle
  players.sort(() => 0.5 - Math.random());

  const roles: Record<string, Role> = {};
  players.forEach(id => (roles[id] = 'villager'));
  players.slice(0, mafia).forEach(id => (roles[id] = 'mafia'));
  if (players[mafia])     roles[players[mafia]]     = 'doctor';
  if (players[mafia + 1]) roles[players[mafia + 1]] = 'police';
  
  console.log('  Final Roles:', roles);
  return roles;
}

/* REST ­­­­­­­­­­­­­­­­­­­­­­­­­­­­­––––––––––––––––––––––––––––––––––– */
app.post('/api/lobby/create', async (req, r) => {
  const { mafiaCount } = req.body as any || {};
  const code = nanoid(6).toUpperCase();
  lobbies.set(code, { code, players: [], locked: false, roles: {}, mafiaCount });
  r.send({ code });
});

app.post('/api/lobby/join', async (req, r) => {
  const { code, name } = req.body as any;
  const lobby = lobbies.get(code);
  if (!lobby || lobby.locked) return r.code(400).send({ error: 'locked' });

  const id = nanoid(8);
  lobby.players.push({ id, name });
  
  // Send the complete lobby state back to the joining player
  r.send({ 
    playerId: id, 
    players: lobby.players,
    lobbyCode: code
  });
  
  // Emit to all players in the room (including the one who just joined when their socket connects)
  io.to(code).emit('player_join', { id, name });
});

app.post('/api/lobby/start', async (req, r) => {
  const { code } = req.body as any;
  const lobby = lobbies.get(code);
  if (!lobby || lobby.locked) return r.code(400).send({ error: 'locked' });

  console.log('🚀 Starting game for lobby:', code);
  console.log('  Lobby mafiaCount:', lobby.mafiaCount);
  console.log('  Players count:', lobby.players.length);

  lobby.locked = true;
  const playerIds = lobby.players.map(p => p.id);
  lobby.roles = assignRoles(playerIds, lobby.mafiaCount);

  io.to(code).emit('game_start', { roles: lobby.roles });
  r.send({ roles: lobby.roles });
});

app.post('/api/lobby/mafia-count', async (req, r) => {
  const { code, mafiaCount } = req.body as any;
  const lobby = lobbies.get(code);
  if (!lobby) return r.code(404).send({ error: 'Lobby not found' });
  if (lobby.locked) return r.code(400).send({ error: 'Game already started' });
  
  // Validate mafia count
  if (mafiaCount < 1) {
    return r.code(400).send({ error: 'Mafia count must be at least 1' });
  }
  
  // Calculate villagers: total - mafia - doctor - police
  const villagerCount = lobby.players.length - mafiaCount - 2;
  
  if (mafiaCount >= villagerCount) {
    return r.code(400).send({ 
      error: `Mafia (${mafiaCount}) cannot equal or exceed villagers (${villagerCount}). Mafia must remain minority!` 
    });
  }
  
  const maxMafia = Math.floor((lobby.players.length - 2) / 2);
  if (mafiaCount > maxMafia) {
    return r.code(400).send({ 
      error: `Too many mafia! Maximum ${maxMafia} for ${lobby.players.length} players to keep mafia as minority` 
    });
  }
  
  lobby.mafiaCount = mafiaCount;
  r.send({ mafiaCount, maxMafia });
});

/* WebSocket ­­­­­­­­­­­­­­­­­­­­­­­­­­­––––––––––––––––––––––––––––––– */
io.on('connection', s => {
  s.on('join_room', (code: string) => {
    s.join(code);
    
    // Send current lobby state to the newly connected socket
    const lobby = lobbies.get(code);
    if (lobby) {
      s.emit('lobby_state', {
        players: lobby.players,
        locked: lobby.locked
      });
    }
  });
});

app.listen({ port: 3000 });
console.log('⚡  Fastify + Socket.IO on http://localhost:3000');