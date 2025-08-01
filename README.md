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

### Server Deployment (Koyeb)

The server is configured for automatic deployment to Koyeb on every push to the main branch.

#### Initial Setup:

1. Create a Koyeb account at https://www.koyeb.com/
2. Get your API token from the Koyeb dashboard
3. In your GitHub repository settings, add a secret named `KOYEB_API_TOKEN` with your Koyeb API token
4. Create an app on Koyeb named `gball-server`
5. Push to the main branch to trigger automatic deployment

The server uses a multi-stage Dockerfile optimized for Bun runtime and will be automatically built and deployed via GitHub Actions.

### Frontend Deployment (GitHub Pages)

The frontend is automatically built and deployed to GitHub Pages using GitHub Actions.

#### Initial Setup:

1. Go to your repository Settings → Pages
2. Under "Build and deployment", set Source to "Deploy from a branch"
3. Select branch: `main` and folder: `/client/dist`
4. Click Save

The frontend will be available at: `https://<username>.github.io/<repository-name>/`

**Important:** If your repository name is not your username.github.io, you need to update the base path in `client/vite.config.ts`:
```javascript
export default defineConfig({
  base: '/<repository-name>/',
  // ... rest of config
});
```

#### How it Works:

- GitHub Actions automatically triggers on every push to the main branch that affects the client code
- The workflow:
  - Builds the frontend to `client/dist/`
  - Commits and pushes the built files back to the repository
  - GitHub Pages serves the files from `client/dist/`
- No local build step required - just push your source code!

#### Manual Build:

If you need to build locally for testing:
```bash
cd client
npm install
npm run build
```

#### GitHub Action Configuration:

The frontend deployment is handled by `.github/workflows/deploy-frontend.yml`. The workflow:
- Triggers on pushes to main that modify files in `client/`
- Uses Node.js 20 for building
- Automatically commits built files with `[skip ci]` to avoid infinite loops

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
