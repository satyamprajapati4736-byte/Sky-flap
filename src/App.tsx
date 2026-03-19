/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { Game, GameState, sounds } from './game';
import { Volume2, VolumeX } from 'lucide-react';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    // Set internal resolution
    canvas.width = 400;
    canvas.height = 700;

    const game = new Game(canvas);
    gameRef.current = game;
    setHighScore(game.highScore);

    let animationFrameId: number;

    const loop = () => {
      game.update();
      game.draw();
      
      // Sync React state for UI
      // Use functional updates or just call setters (React bails out if value is same)
      setGameState(game.state);
      setScore(game.score);
      setLevel(game.level);
      setHighScore(game.highScore);

      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        game.jump();
      }
    };

    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      game.jump();
    };

    window.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('touchstart', handleTouch);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('touchstart', handleTouch);
    };
  }, []); // Run once on mount

  const handleStart = () => {
    if (gameRef.current) {
      gameRef.current.start();
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    sounds.muted = newMuted;
  };

  return (
    <div id="game-container">
      <canvas ref={canvasRef} />
      
      <button 
        onClick={toggleMute}
        className="absolute top-4 right-4 z-20 p-2 bg-black/30 backdrop-blur-sm rounded-full text-white hover:bg-black/50 transition-colors pointer-events-auto"
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
      </button>

      <div className="ui-overlay">
        {gameState === GameState.PLAYING && (
          <>
            <div className="score-display">{score}</div>
            <div className="absolute top-20 left-1/2 -translate-x-1/2 text-white/70 font-bold text-sm uppercase tracking-widest">
              Level {level}
            </div>
          </>
        )}

        {gameState === GameState.START && (
          <div className="screen">
            <h1>Sky Flap</h1>
            <p>Tap or Space to Jump</p>
            <button className="btn-primary" onClick={handleStart}>
              Start Game
            </button>
            <div className="high-score">High Score: {highScore}</div>
          </div>
        )}

        {gameState === GameState.GAME_OVER && (
          <div className="screen">
            <h1>Game Over</h1>
            <p>Score: {score}</p>
            <button className="btn-primary" onClick={handleStart}>
              Try Again
            </button>
            <div className="high-score">High Score: {highScore}</div>
          </div>
        )}
      </div>
    </div>
  );
}
