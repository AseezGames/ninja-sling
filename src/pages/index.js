import { useEffect, useRef, useState } from 'react';
import GameCanvas from '../../components/GameCanvas';

import { submitScore, fetchLeaderboard, generatePlayerId, getPlayerHighScore } from "../utils/leaderboard";

export default function Home() {
  const [showNamePopup, setShowNamePopup] = useState(true);
  const [playerName, setPlayerName] = useState('');
  const [currentPlayer, setCurrentPlayer] = useState('');
  const [currentPlayerId, setCurrentPlayerId] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [showGameOverPopup, setShowGameOverPopup] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [playerHighScore, setPlayerHighScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Load leaderboard and saved player data on component mount
  useEffect(() => {
    // Load leaderboard from Firebase
    loadLeaderboard();
    
    // Load saved player data (name + unique ID) from localStorage
    const savedPlayerData = localStorage.getItem('ninjaSlingPlayerData');
    if (savedPlayerData) {
      const playerData = JSON.parse(savedPlayerData);
      setPlayerName(playerData.name);
      setCurrentPlayer(playerData.name);
      setCurrentPlayerId(playerData.id);
      setIsReturningUser(true);
      
      // Load player's high score
      loadPlayerHighScore(playerData.id);
    }
  }, []);

  // Load leaderboard from Firebase
  const loadLeaderboard = async () => {
    try {
      const data = await fetchLeaderboard();
      setLeaderboard(data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  // Load player's high score
  const loadPlayerHighScore = async (playerId) => {
    try {
      const highScore = await getPlayerHighScore(playerId);
      setPlayerHighScore(highScore);
    } catch (error) {
      console.error('Error loading player high score:', error);
    }
  };

  // Handle starting the game
  const handleStartGame = () => {
    if (playerName.trim()) {
      const trimmedName = playerName.trim();
      let playerId = currentPlayerId;
      
      // Generate new player ID if this is a new player
      if (!playerId) {
        playerId = generatePlayerId();
        setCurrentPlayerId(playerId);
      }
      
      setCurrentPlayer(trimmedName);
      
      // Save player data (name + unique ID) to localStorage only
      const playerData = {
        name: trimmedName,
        id: playerId
      };
      localStorage.setItem('ninjaSlingPlayerData', JSON.stringify(playerData));
      
      setShowNamePopup(false);
      setShowLeaderboard(false);
      setGameStarted(true);
    }
  };

  // Handle game over and show popup
  const handleGameOver = async (score) => {
    setIsLoading(true);
    
    if (currentPlayer && currentPlayerId && score > 0) {
      try {
        // Submit score to Firebase
        const result = await submitScore(currentPlayer, currentPlayerId, score);
        
        // Update player's high score if it's a new high score
        if (result.isHighScore) {
          setPlayerHighScore(score);
        }
      } catch (error) {
        console.error('Error submitting score:', error);
      }
    }
    
    setFinalScore(score);
    setGameStarted(false);
    setShowGameOverPopup(true);
    
    // Reload leaderboard to show updated scores
    await loadLeaderboard();
    setIsLoading(false);
  };

  // Handle changing name (creates new player identity)
  const handleChangeName = () => {
    setIsReturningUser(false);
    setPlayerName('');
    setCurrentPlayer('');
    setCurrentPlayerId('');
    setPlayerHighScore(0);
    localStorage.removeItem('ninjaSlingPlayerData');
  };

  // Handle retry - restart game with same player
  const handleRetry = () => {
    setShowGameOverPopup(false);
    setGameStarted(true);
  };

  // Handle main menu - return to name input
  const handleMainMenu = () => {
    setShowGameOverPopup(false);
    setShowNamePopup(true);
    setCurrentPlayer('');
    setFinalScore(0);
    
    // Check if user has saved player data
    const savedPlayerData = localStorage.getItem('ninjaSlingPlayerData');
    if (savedPlayerData) {
      const playerData = JSON.parse(savedPlayerData);
      setPlayerName(playerData.name);
      setCurrentPlayerId(playerData.id);
      setIsReturningUser(true);
      loadPlayerHighScore(playerData.id);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif',
      color: 'white',
      padding: '20px'
    }}>
      <h1>🥷 Ninja Sling</h1>
      
      {/* Developer Credits */}
      <div style={{
        fontSize: '12px',
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        marginBottom: '15px',
        lineHeight: '1.3'
      }}>
        <div style={{ fontSize: '11px', marginBottom: '3px' }}>
          🎮 <span style={{ color: '#FFD700' }}>Aashish Ghimire (Aseez Games)</span>
        </div>
        <div style={{ fontSize: '10px', opacity: 0.7 }}>
          Special thanks: Nischal B. • Kiran D. • Sujan A. • Anish P. • Krishna C. • Pradip C. • Aryan S. • Sakar K.
        </div>
      </div>

      {/* Player Name Popup Modal */}
      {showNamePopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#1a1a2e',
            padding: '30px',
            borderRadius: '15px',
            border: '2px solid #FFD700',
            textAlign: 'center',
            minWidth: '300px',
            boxShadow: '0 0 30px rgba(255, 215, 0, 0.3)'
          }}>
            {isReturningUser ? (
              // Returning user - show welcome back message with play/leaderboard buttons
              <>
                <h2 style={{ color: '#FFD700', marginBottom: '10px' }}>🥷 Welcome Back!</h2>
                <p style={{ color: 'white', marginBottom: '20px', fontSize: '18px' }}>
                  <span style={{ color: '#FFD700' }}>{playerName}</span>
                </p>
                {playerHighScore > 0 && (
                  <p style={{ color: '#4CAF50', marginBottom: '20px', fontSize: '14px' }}>
                    Your High Score: {playerHighScore}
                  </p>
                )}
                
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '15px' }}>
                  <button
                    onClick={handleStartGame}
                    style={{
                      padding: '12px 24px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    🎮 PLAY GAME
                  </button>
                  
                  <button
                    onClick={() => setShowLeaderboard(!showLeaderboard)}
                    style={{
                      padding: '12px 24px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      borderRadius: '8px',
                      border: '2px solid #FFD700',
                      backgroundColor: 'transparent',
                      color: '#FFD700',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    🏆 LEADERBOARD
                  </button>
                </div>
                
                <button
                  onClick={handleChangeName}
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid #666',
                    backgroundColor: 'transparent',
                    color: '#999',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  Change Name
                </button>
              </>
            ) : (
              // New user - show name input
              <>
                <h2 style={{ color: '#FFD700', marginBottom: '20px' }}>🥷 Enter Your Name</h2>
                
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your ninja name..."
                  maxLength={20}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '16px',
                    borderRadius: '8px',
                    border: '2px solid #FFD700',
                    backgroundColor: '#0f0f23',
                    color: 'white',
                    textAlign: 'center',
                    marginBottom: '20px',
                    outline: 'none'
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleStartGame()}
                  autoFocus
                />
                
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button
                    onClick={handleStartGame}
                    disabled={!playerName.trim()}
                    style={{
                      padding: '12px 24px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: playerName.trim() ? '#4CAF50' : '#666',
                      color: 'white',
                      cursor: playerName.trim() ? 'pointer' : 'not-allowed',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    🎮 PLAY GAME
                  </button>
                  
                  <button
                    onClick={() => setShowLeaderboard(!showLeaderboard)}
                    style={{
                      padding: '12px 24px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      borderRadius: '8px',
                      border: '2px solid #FFD700',
                      backgroundColor: 'transparent',
                      color: '#FFD700',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    🏆 LEADERBOARD
                  </button>
                </div>
              </>
            )}

            {/* Leaderboard Display */}
            {showLeaderboard && (
              <div style={{
                marginTop: '20px',
                padding: '15px',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '10px',
                border: '1px solid #333'
              }}>
                <h4 style={{ color: '#FFD700', textAlign: 'center', marginBottom: '15px' }}>🏆 TOP PLAYERS</h4>
                {isLoading ? (
                  <p style={{ textAlign: 'center', color: 'white' }}>Loading...</p>
                ) : leaderboard.length > 0 ? (
                  <div>
                    {leaderboard.map((entry, index) => (
                      <div key={entry.id || index} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        marginBottom: '5px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '5px',
                        fontSize: '14px'
                      }}>
                        <span style={{ color: '#FFD700', fontWeight: 'bold', minWidth: '30px' }}>#{index + 1}</span>
                        <span style={{ flex: 1, textAlign: 'left', margin: '0 10px', color: 'white' }}>{entry.playerName || entry.name}</span>
                        <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>{entry.score}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>No scores yet. Be the first!</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Game Canvas */}
      {gameStarted && (
        <GameCanvas 
          playerName={currentPlayer}
          onGameOver={handleGameOver}
        />
      )}

      {/* Game Over Popup */}
      {showGameOverPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#1a1a2e',
            padding: '30px',
            borderRadius: '15px',
            border: '2px solid #FFD700',
            textAlign: 'center',
            minWidth: '300px',
            boxShadow: '0 0 30px rgba(255, 215, 0, 0.3)'
          }}>
            <h3 style={{ color: '#FFD700', marginBottom: '15px' }}>Game Over!</h3>
            <p style={{ color: 'white', marginBottom: '10px' }}>Player: {currentPlayer}</p>
            <p style={{ color: '#FFD700', marginBottom: '20px', fontSize: '18px' }}>Score: {finalScore}</p>
            {playerHighScore > 0 && finalScore < playerHighScore && (
              <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '15px', fontSize: '14px' }}>Your High Score: {playerHighScore}</p>
            )}
            {finalScore >= playerHighScore && finalScore > 0 && (
              <p style={{ color: '#4CAF50', marginBottom: '15px', fontSize: '14px' }}>🎉 New High Score!</p>
            )}
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button
                onClick={handleRetry}
                style={{
                  padding: '12px 25px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                🔄 RETRY
              </button>
              <button
                onClick={handleMainMenu}
                style={{
                  padding: '12px 25px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#9C27B0',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                🏠 MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}