# Mafia Game Lobby

A real-time lobby system for Mafia/Werewolf games built with SvelteKit and Cloudflare Workers.

## Features

- 🎭 Create and join game lobbies with unique codes
- 👥 Real-time player synchronization via WebSockets
- 📱 Responsive design for mobile and desktop
- 🚀 Built on Cloudflare Workers for global performance
- 🔒 Secure Durable Objects for lobby state management

## Tech Stack

- **Frontend**: SvelteKit 5, TypeScript
- **Backend**: Cloudflare Workers, Durable Objects
- **Real-time**: WebSockets
- **Styling**: CSS with modern design system

## Setup

### Prerequisites

- Node.js 18+ and pnpm
- Cloudflare account with Workers enabled

### Installation

1. Clone the repository and install dependencies:
```bash
cd mafia-app
pnpm install
```

2. Set up environment variables:
Create a `.env` file in the `mafia-app` directory:
```env
# For local development
VITE_API_BASE=http://localhost:8787

# For production (replace with your worker domain)
# VITE_API_BASE=https://your-worker.your-subdomain.workers.dev
```

3. Deploy the Cloudflare Worker:
```bash
# Login to Cloudflare (if not already logged in)
pnpm wrangler login

# Deploy the worker
pnpm wrangler deploy
```

4. Start the development server:
```bash
# Start the SvelteKit dev server
pnpm dev

# In another terminal, start the worker dev server
pnpm dev:worker
```

## Usage

### Creating a Lobby

1. Open the application in your browser
2. Enter your name in the "Create New Lobby" section
3. Click "Create Lobby"
4. Share the generated 6-digit code with other players

### Joining a Lobby

1. Enter the 6-digit lobby code
2. Enter your player name
3. Click "Join Lobby"
4. You'll see all connected players in real-time

### Real-time Features

- Players automatically appear when they join
- Players are removed when they leave
- Lobby code can be copied to clipboard
- WebSocket connection status is managed automatically

## API Endpoints

### Worker Endpoints

- `POST /api/lobby/create` - Create a new lobby
- `POST /api/lobby/join` - Join an existing lobby
- `GET /api/lobby/{code}/status` - Get lobby status
- `WS /api/lobby/{code}/connect` - WebSocket connection

### Durable Object Endpoints

- `POST /init` - Initialize lobby with host
- `POST /join` - Add player to lobby
- `POST /leave` - Remove player from lobby
- `GET /status` - Get lobby state
- `WS /connect` - WebSocket upgrade

## Development

### Project Structure

```
src/
├── lobby/
│   └── lobby.ts          # Durable Object for lobby management
├── routes/
│   ├── +layout.svelte    # App layout
│   └── +page.svelte      # Main lobby interface
├── worker.ts             # Cloudflare Worker entry point
└── app.d.ts              # TypeScript declarations
```

### Available Scripts

- `pnpm dev` - Start SvelteKit development server
- `pnpm dev:worker` - Start Cloudflare Worker development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm check` - Type check the project
- `pnpm lint` - Lint the codebase

### Deployment

1. Build the application:
```bash
pnpm build
```

2. Deploy to Cloudflare:
```bash
pnpm wrangler deploy
```

3. Update your environment variables with the production worker URL

## Troubleshooting

### Common Issues

1. **WebSocket connection fails**
   - Ensure the worker is running (`pnpm dev:worker`)
   - Check that `VITE_API_BASE` is set correctly
   - Verify the worker domain in production

2. **Lobby creation fails**
   - Check browser console for error messages
   - Verify the worker is deployed and accessible
   - Ensure all required fields are filled

3. **Players not appearing**
   - Check WebSocket connection status
   - Verify the lobby code is correct
   - Check browser console for connection errors

### Debug Mode

Enable debug logging by setting the environment variable:
```env
DEBUG=true
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
