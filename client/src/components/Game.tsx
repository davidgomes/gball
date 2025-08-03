import React, { useEffect, useRef, useState } from 'react';
import { GameClient } from '../game/client';
import { GameRenderer } from '../game/renderer';
import { SoundManager } from '../game/soundManager';
import type { GameState, Player, Stadium, SoundEvent } from '../types/game';

interface GameProps {
  serverUrl: string;
}

export const Game: React.FC<GameProps> = ({ serverUrl }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameClientRef = useRef<GameClient | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const soundManagerRef = useRef<SoundManager | null>(null);
  
  const [isConnected, setIsConnected] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize renderer
    try {
      rendererRef.current = new GameRenderer(canvasRef.current);
    } catch (error) {
      console.error('Failed to initialize renderer:', error);
      setConnectionError('Failed to initialize game renderer');
      return;
    }

    // Initialize sound manager
    try {
      soundManagerRef.current = new SoundManager();
    } catch (error) {
      console.error('Failed to initialize sound manager:', error);
      // Don't fail completely if sound doesn't work
    }

    // Initialize game client
    gameClientRef.current = new GameClient();
    
    // Set up event handlers
    gameClientRef.current.onConnection((player: Player, gameState: GameState, stadium: Stadium) => {
      setCurrentPlayer(player);
      setGameState(gameState);
      setIsConnected(true);
      setConnectionError(null);
      
      if (rendererRef.current) {
        rendererRef.current.setStadium(stadium);
      }
      
      // Focus the canvas for keyboard input
      if (canvasRef.current) {
        canvasRef.current.focus();
      }
      
      console.log('🎮 Game connected! You joined the red team (humans vs AI)');
    });

    gameClientRef.current.onGameState((newGameState: GameState) => {
      setGameState(newGameState);
    });

    gameClientRef.current.onDisconnection(() => {
      setIsConnected(false);
      setCurrentPlayer(null);
      setGameState(null);
      setConnectionError('Disconnected from server');
    });

    gameClientRef.current.onSoundEvents((event: SoundEvent) => {
      handleSoundEvent(event);
    });

    // Connect to server
    try {
      gameClientRef.current.connect(serverUrl);
    } catch (error) {
      console.error('Failed to connect to server:', error);
      setConnectionError('Failed to connect to server');
    }

    // Cleanup on unmount
    return () => {
      if (gameClientRef.current) {
        gameClientRef.current.disconnect();
      }
    };
  }, [serverUrl]);

  // Render game state
  useEffect(() => {
    if (gameState && rendererRef.current) {
      rendererRef.current.render(gameState);
    }
  }, [gameState]);

  const handleSoundEvent = (event: SoundEvent) => {
    if (!soundManagerRef.current) return;
    
    switch (event.type) {
      case 'goalScored':
        console.log(`🎉 Goal scored by ${event.team} team!`);
        soundManagerRef.current.playSound('goalScored', 0.8);
        if (rendererRef.current) {
          rendererRef.current.triggerGoalCelebration();
        }
        break;
      
      case 'wallHit':
        soundManagerRef.current.playSound('wallHit', 0.6);
        break;
      
      case 'ballKick':
        soundManagerRef.current.playSound('ballKick', 0.4);
        break;
    }
  };

  const handleReconnect = () => {
    if (gameClientRef.current) {
      setConnectionError(null);
      gameClientRef.current.connect(serverUrl);
    }
  };

  return (
    <div className="game-container">
      <div className="game-header">
        <h1>🏐 gball</h1>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
          {currentPlayer && (
            <span className="player-info">
              Playing as <span className={`team-${currentPlayer.team}`}>Red Team</span> (vs AI)
            </span>
          )}
        </div>
      </div>

      {connectionError && (
        <div className="error-message">
          <p>❌ {connectionError}</p>
          <button onClick={handleReconnect} className="reconnect-button">
            🔄 Reconnect
          </button>
        </div>
      )}

      <div className="game-canvas-container">
        <canvas
          ref={canvasRef}
          className="game-canvas"
          width={800}
          height={600}
          tabIndex={0}
          onFocus={() => console.log('🎮 Game canvas focused')}
        />
      </div>

      {isConnected && gameState && (
        <div className="game-info">
          <div className="players-list">
            <h3>Players ({gameState.players.size} total):</h3>
            <div className="teams">
              <div className="team red-team">
                <h4>🔴 Red Team (Humans)</h4>
                <ul>
                  {Array.from(gameState.players.values())
                    .filter(p => p.team === 'red')
                    .map(p => (
                      <li key={p.playerId} className={p.playerId === currentPlayer?.playerId ? 'current-player' : ''}>
                        {p.playerId === currentPlayer?.playerId ? '👤 You' : `👤 Human ${p.playerId.slice(-4)}`}
                      </li>
                    ))}
                </ul>
              </div>
              <div className="team blue-team">
                <h4>🔵 Blue Team (AI)</h4>
                <ul>
                  {Array.from(gameState.players.values())
                    .filter(p => p.team === 'blue')
                    .map((p, index) => (
                      <li key={p.playerId}>
                        🤖 AI {p.aiRole || 'Bot'} #{index + 1}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .game-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          font-family: 'Arial', sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .game-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
        }

        .game-header h1 {
          margin: 0;
          font-size: 2rem;
          font-weight: bold;
        }

        .connection-status {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.5rem;
        }

        .status-indicator {
          font-weight: bold;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.1);
        }

        .status-indicator.connected {
          background: rgba(76, 175, 80, 0.3);
        }

        .status-indicator.disconnected {
          background: rgba(244, 67, 54, 0.3);
        }

        .player-info {
          font-size: 0.9rem;
        }

        .team-red {
          color: #ff6b6b;
          font-weight: bold;
        }

        .team-blue {
          color: #4dabf7;
          font-weight: bold;
        }

        .error-message {
          background: rgba(244, 67, 54, 0.9);
          padding: 1rem;
          margin: 1rem 2rem;
          border-radius: 8px;
          text-align: center;
        }

        .reconnect-button {
          background: white;
          color: #d32f2f;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          margin-top: 0.5rem;
        }

        .reconnect-button:hover {
          background: #f5f5f5;
        }

        .game-canvas-container {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 1rem;
        }

        .game-canvas {
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-radius: 8px;
          background: #2e7d32;
          max-width: 100%;
          max-height: 100%;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          outline: none;
        }

        .game-canvas:focus {
          border-color: rgba(102, 126, 234, 0.8);
        }

        .game-info {
          padding: 1rem 2rem;
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
        }

        .players-list h3 {
          margin: 0 0 1rem 0;
          text-align: center;
        }

        .teams {
          display: flex;
          justify-content: space-around;
          gap: 2rem;
        }

        .team {
          flex: 1;
          text-align: center;
        }

        .team h4 {
          margin: 0 0 0.5rem 0;
        }

        .team ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .team li {
          padding: 0.25rem 0;
          font-size: 0.9rem;
        }

        .current-player {
          font-weight: bold;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          padding: 0.25rem 0.5rem;
        }

        @media (max-width: 768px) {
          .game-header {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }

          .teams {
            flex-direction: column;
            gap: 1rem;
          }
        }
      `}</style>
    </div>
  );
};