import React, { useState } from 'react';
import { Game } from './components/Game';

function App() {
  const [serverUrl, setServerUrl] = useState('ws://localhost:8090');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showGame, setShowGame] = useState(false);

  const handleConnect = () => {
    if (serverUrl.trim()) {
      setIsConnecting(true);
      setShowGame(true);
    }
  };

  const handleDisconnect = () => {
    setShowGame(false);
    setIsConnecting(false);
  };

  if (showGame) {
    return <Game serverUrl={serverUrl} />;
  }

  return (
    <div className="app">
      <div className="welcome-container">
        <div className="welcome-card">
          <h1>🏐 Welcome to gball!</h1>
          <p>
            A fast-paced, physics-based online soccer game inspired by Haxball.
            Join the <strong>Red Team</strong> and compete against <strong>AI players</strong> on the Blue Team!
            Control your player with arrow keys and kick the ball with space bar!
          </p>
          
          <div className="connection-form">
            <label htmlFor="server-url">Server URL:</label>
            <input
              id="server-url"
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="ws://localhost:8090"
              className="url-input"
            />
            <button 
              onClick={handleConnect}
              disabled={!serverUrl.trim() || isConnecting}
              className="connect-button"
            >
              {isConnecting ? '🔄 Connecting...' : '🎮 Join Game'}
            </button>
          </div>

          <div className="game-info">
            <h3>How to Play:</h3>
            <ul>
              <li>🎯 <strong>Objective:</strong> Score goals by getting the ball into the opponent's goal</li>
              <li>🎮 <strong>Controls:</strong> Arrow keys or WASD to move, Space bar to kick</li>
              <li>⚽ <strong>Teams:</strong> You join the Red Team (humans vs AI)</li>
              <li>🤖 <strong>AI Opponents:</strong> Blue team AI players will automatically match your team size</li>
              <li>⏰ <strong>Match:</strong> 3 minutes or first to 3 goals wins</li>
              <li>👥 <strong>Players:</strong> Balanced teams (humans + AI)</li>
            </ul>
          </div>

          <div className="features">
            <h3>Features:</h3>
            <div className="feature-grid">
              <div className="feature">
                <span className="feature-icon">⚡</span>
                <span>Real-time Physics</span>
              </div>
              <div className="feature">
                <span className="feature-icon">🤖</span>
                <span>AI Opponents</span>
              </div>
              <div className="feature">
                <span className="feature-icon">🏟️</span>
                <span>Classic Stadium</span>
              </div>
              <div className="feature">
                <span className="feature-icon">🎮</span>
                <span>Simple Controls</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .app {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Arial', sans-serif;
          padding: 2rem;
        }

        .welcome-container {
          max-width: 600px;
          width: 100%;
        }

        .welcome-card {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 16px;
          padding: 3rem;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(10px);
          color: #333;
        }

        .welcome-card h1 {
          text-align: center;
          color: #4a5568;
          margin-bottom: 1rem;
          font-size: 2.5rem;
        }

        .welcome-card p {
          text-align: center;
          color: #666;
          margin-bottom: 2rem;
          font-size: 1.1rem;
          line-height: 1.6;
        }

        .connection-form {
          margin-bottom: 2rem;
        }

        .connection-form label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: bold;
          color: #4a5568;
        }

        .url-input {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 1rem;
          margin-bottom: 1rem;
          transition: border-color 0.3s;
        }

        .url-input:focus {
          outline: none;
          border-color: #667eea;
        }

        .connect-button {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1.1rem;
          font-weight: bold;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .connect-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
        }

        .connect-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .game-info, .features {
          margin-bottom: 2rem;
        }

        .game-info h3, .features h3 {
          color: #4a5568;
          margin-bottom: 1rem;
          text-align: center;
        }

        .game-info ul {
          list-style: none;
          padding: 0;
        }

        .game-info li {
          padding: 0.5rem 0;
          border-bottom: 1px solid #e2e8f0;
        }

        .game-info li:last-child {
          border-bottom: none;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .feature {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          background: rgba(102, 126, 234, 0.1);
          border-radius: 8px;
        }

        .feature-icon {
          font-size: 1.5rem;
        }

        @media (max-width: 768px) {
          .welcome-card {
            padding: 2rem;
          }

          .welcome-card h1 {
            font-size: 2rem;
          }

          .feature-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default App;