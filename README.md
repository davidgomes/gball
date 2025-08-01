# gball

**gball** is a fast-paced, physics-based online soccer game inspired by Haxball. Players control circular avatars, using keyboard arrows to move and the space bar to kick a ball into the opposing team’s goal. gball is designed for quick matches, simple controls, and a fun, competitive multiplayer experience.

## Key Features

- **Classic Gameplay:** Control your player via arrow keys, kick with space bar.
- **Advanced AI Opponents:** Smart AI players with role-based behavior (Defender, Midfielder, Attacker).
- **Horizontal Field:** Large 3x-sized field optimized for humans vs AI gameplay.
- **Intelligent AI:** AI features boundary awareness, pressure detection, and tactical positioning.
- **Balanced Teams:** AI automatically matches human player count for fair gameplay.
- **Real-time Physics:** Enhanced ball control and collision detection.

## Controls

| Key         | Action              |
|-------------|---------------------|
| Arrow Keys  | Move your player    |
| Space Bar   | Kick/Shoot the ball |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) runtime (for the server)
- [Node.js](https://nodejs.org/) & npm (for the client)
- Modern browser with WebSocket support

### Installation

Clone this repository:

```bash
git clone https://github.com/yourusername/gball.git
cd gball
```

Install dependencies:

```bash
npm install
```

This will install dependencies for both server and client.

### Running

**Development mode (both server and client):**

```bash
npm run dev
```

This starts:
- Game server on `ws://localhost:8090` (Bun + TypeScript + WebSocket)
- Web client on `http://localhost:3000` (Vite + React)

**Production build:**

```bash
npm run build
npm start
```

Open your browser at [http://localhost:3000](http://localhost:3000) to play.

### Architecture

- **Server**: Bun runtime with TypeScript, WebSocket-based real-time multiplayer
- **Client**: React + TypeScript frontend with HTML5 Canvas game rendering
- **Physics**: Custom physics engine with collision detection and ball mechanics
- **Networking**: Real-time game state synchronization at 60 FPS

## Game Rules

- **Humans vs AI:** All human players join the Red Team, AI players automatically fill the Blue Team.
- **Auto-Balancing:** AI players spawn/despawn to match the number of human players.
- **Aggressive AI:** AI players are pure attackers - Midfielders (⚽) and Attackers (⚔) who never play defense.
- **Smart Swarming:** AI features coordinated ball pursuit, human interception, and relentless pressure.
- **Controls:** Arrow keys or WASD to move, Space bar to kick/shoot the ball.
- **Victory:** Score by getting the ball into the opposing goal (3 minutes or first to 3 goals).

## Technical Details

- **Physics Engine:** Custom 2D physics with elastic collisions, friction, and realistic ball movement
- **AI System:** Aggressive AI with swarming behavior, human interception, and relentless attacking
- **Rendering:** HTML5 Canvas with high-DPI support, role-specific AI visual indicators
- **Server:** Bun runtime with TypeScript, 60 FPS game loop, WebSocket communication
- **Client:** React + TypeScript with Vite build system, real-time input handling
- **Stadium:** Large horizontal field (3x classic Haxball size) optimized for AI gameplay
- **Networking:** Real-time multiplayer via WebSockets with 60 FPS synchronization

## Customization

While gball ships with the classic Haxball-style field and ball, you can customize:

- **Fields:** Create or edit stadium layouts.
- **Ball:** Adjust physics or appearance in config files/stadium editor.
- **Mods:** Add new features using plugins (planned).

## Deployment

The application is packaged as a single Docker container that serves both the frontend and backend.

### Dockerfile Overview

The unified Dockerfile:
- Builds the React frontend using Vite
- Builds the Bun server
- Serves the frontend static files from the same server that handles WebSocket connections
- Everything runs on a single port (default: 8080)

### Local Docker Build & Run

```bash
# Build the Docker image
docker build -t gball .

# Run the container
docker run -p 8080:8080 gball
```

The application will be available at:
- Frontend: http://localhost:8080
- WebSocket: ws://localhost:8080/ws

### Deployment to Koyeb (or any Docker host)

1. Push your code to GitHub
2. Configure your deployment platform to build from the Dockerfile
3. Set environment variables:
   - `PORT`: The port to run on (default: 8080)
   - `NODE_ENV`: Set to `production`

The server automatically:
- Serves the React frontend at the root path
- Handles WebSocket connections at `/ws`
- Falls back to index.html for client-side routing

## Contributing

We welcome contributions! Submit pull requests, bug reports, or ideas via issues.

Steps:

1. Fork the repository
2. Create a branch for your feature or fix
3. Submit a pull request describing your changes

## License

gball is open source under the MIT License.

## Credits

- Inspired by Haxball.  
- Created by [YourName].
- See [CONTRIBUTORS.md] for all contributors.

**Let’s play gball! Dribble, pass, and score—build your own online soccer community today!**# gball
# gball
