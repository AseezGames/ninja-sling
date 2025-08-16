import { useEffect, useRef, useCallback, useState } from 'react';
import styles from '../styles/Game.module.css';

const NinjaSlingGame = () => {
  const canvasRef = useRef(null);
  const gameStateRef = useRef({
    // Ball (Ninja) properties
    ball: {
      x: 400, // Center horizontally
      y: 500, // Start near bottom
      radius: 15,
      velocityX: 0,
      velocityY: 0,
      isLaunched: false,
      bounceCount: 0,
      maxBounces: 1,
      bounciness: 0, // Changed from 0.25 to 0 - no bouncing
      friction: 0.98,
      airResistance: 0.9995,
      color: '#ff6b6b',
      trail: [],
      isOnPlatform: false,
      canSling: true,
      currentPlatform: null
    },

    // Add timing properties
    timing: {
      lastTime: 0,
      deltaTime: 0,
      targetFPS: 60,
      fixedTimeStep: 1000 / 60 // 16.67ms for 60 FPS
    },
    
    // Slingshot mechanics - now relative to ball position
    slingshot: {
      isDragging: false,
      dragX: 0,
      dragY: 0,
      maxPower: 250, // Increased from 150 to 250
      trajectoryPoints: []
    },
    
    // Physics constants
      physics: {
        gravity: 0.8,        // Increased from 0.5 to 0.8 for more realistic falling
        minVelocity: 0.1,
        maxVelocity: 20,
        stopThreshold: 0.5
      },
    
    // Platforms and obstacles
    // Platforms and obstacles - extend initial world to the left
    platforms: [
      { x: 0, y: 580, width: 800, height: 20, type: 'deadly', points: 0, color: '#f44336', hasBeenScored: false, id: 'deadly_bottom' }, // Bottom boundary
      { x: 350, y: 520, width: 100, height: 15, type: 'static', points: 1, color: '#4CAF50', hasBeenScored: false, id: 'start_platform' }, // Starting platform
      { x: 200, y: 450, width: 120, height: 15, type: 'static', points: 1, color: '#4CAF50', hasBeenScored: false, id: 'platform_1' },
      { x: 500, y: 380, width: 100, height: 15, type: 'moving', points: 2, color: '#2196F3', moveSpeed: 1, moveRange: 100, moveDirection: 1, originalY: 380, hasBeenScored: false, id: 'platform_2' },
      { x: 150, y: 320, width: 80, height: 15, type: 'static', points: 1, color: '#4CAF50', hasBeenScored: false, id: 'platform_3' },
      { x: 600, y: 250, width: 60, height: 15, type: 'deadly', points: -1, color: '#f44336', hasBeenScored: false, id: 'platform_4' },
      { x: 300, y: 180, width: 100, height: 15, type: 'moving', points: 2, color: '#2196F3', moveSpeed: 1.5, moveRange: 80, moveDirection: -1, originalY: 180, hasBeenScored: false, id: 'platform_5' },
      { x: 450, y: 120, width: 80, height: 15, type: 'static', points: 1, color: '#4CAF50', hasBeenScored: false, id: 'platform_6' },
      { x: 100, y: 60, width: 100, height: 15, type: 'static', points: 1, color: '#4CAF50', hasBeenScored: false, id: 'platform_7' },
      // Add some initial upper platforms
      { x: 350, y: 0, width: 100, height: 15, type: 'static', points: 1, color: '#4CAF50', hasBeenScored: false, id: 'platform_8' },
      { x: 200, y: -80, width: 80, height: 15, type: 'moving', points: 2, color: '#2196F3', moveSpeed: 0.9, moveRange: 120, moveDirection: 1, originalY: -80, hasBeenScored: false, id: 'platform_9' },
      { x: 500, y: -160, width: 90, height: 15, type: 'static', points: 1, color: '#4CAF50', hasBeenScored: false, id: 'platform_10' }
    ],
    
    // Game state
    score: 0,
    highScore: 0,
    gameState: 'ready', // 'ready', 'aiming', 'launched'
    // Camera properties - modified for vertical movement
    camera: {
      x: 0,
      y: 0, // Now tracks vertical position
      shake: 0,
      topBoundary: 200, // Distance from top edge to start moving camera
      worldMaxY: -Infinity, // Changed from -2000 to allow infinite upward movement
      followSpeed: 0.08
    },
    particles: [],
    floatingTexts: [],

    // New scoring system
    visitedPlatforms: new Set(), // Track which platforms have been scored
    baseScore: 1, // Starting score per platform

    // Audio context for sound effects
    audioContext: null,
    sounds: {}
  });

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState('ready');

  // Initialize audio context
  const initAudio = useCallback(() => {
    if (!gameStateRef.current.audioContext) {
      try {
        gameStateRef.current.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        console.log('Audio not supported');
      }
    }
  }, []);

  // Create sound effect
  const playSound = useCallback((frequency, duration, volume = 0.1) => {
    const audioContext = gameStateRef.current.audioContext;
    if (!audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  }, []);

  // Calculate trajectory prediction from ball's current position
  const calculateTrajectory = useCallback((startX, startY, velocityX, velocityY) => {
    const points = [];
    let x = startX;
    let y = startY;
    let vx = velocityX;
    let vy = velocityY;
    
    for (let i = 0; i < 50; i++) {
      points.push({ x, y });
      
      // Apply physics
      vy += gameStateRef.current.physics.gravity;
      x += vx;
      y += vy;
      
      // Stop if ball goes off screen
      if (y > 600 || x > 1000 || x < -100) break;
    }
    
    return points;
  }, []);

  // Handle mouse/touch input - allow clicking near the ball
  const handlePointerDown = useCallback((e) => {
    const canvas = canvasRef.current;
    const ball = gameStateRef.current.ball;
    
    if (!canvas || !ball.canSling || ball.isLaunched) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    // Scale coordinates to canvas size and convert to world coordinates
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const worldX = (x * scaleX) + gameStateRef.current.camera.x;
    const worldY = (y * scaleY) + gameStateRef.current.camera.y;
    
    // Check if click is within ball radius (increased tolerance for easier grabbing)
    const distanceFromBall = Math.sqrt(
      Math.pow(worldX - ball.x, 2) + Math.pow(worldY - ball.y, 2)
    );
    
    // Allow dragging from a larger area around the ball (ball radius + 40px tolerance)
    if (distanceFromBall <= ball.radius + 40) {
      gameStateRef.current.slingshot.isDragging = true;
      gameStateRef.current.slingshot.dragX = worldX;
      gameStateRef.current.slingshot.dragY = worldY;
      
      setGameState('aiming');
      gameStateRef.current.gameState = 'aiming';
      
      // Add global event listeners when dragging starts
      document.addEventListener('mousemove', handleGlobalPointerMove);
      document.addEventListener('mouseup', handleGlobalPointerUp);
      document.addEventListener('touchmove', handleGlobalPointerMove);
      document.addEventListener('touchend', handleGlobalPointerUp);
      
      initAudio();
    }
  }, [initAudio]);

 const handlePointerStart = useCallback((e) => {
    if (!gameStateRef.current.ball.canSling || gameStateRef.current.gameState !== 'ready') return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    // Scale coordinates to canvas size and convert to world coordinates
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const worldX = (x * scaleX) + gameStateRef.current.camera.x;
    const worldY = (y * scaleY) + gameStateRef.current.camera.y; // Added camera.y offset
    
    gameStateRef.current.slingshot.isDragging = true;
    gameStateRef.current.slingshot.dragX = worldX;
    gameStateRef.current.slingshot.dragY = worldY;
    
    setGameState('aiming');
    gameStateRef.current.gameState = 'aiming';
    
    // Add global event listeners when dragging starts
    document.addEventListener('mousemove', handleGlobalPointerMove);
    document.addEventListener('mouseup', handleGlobalPointerUp);
    document.addEventListener('touchmove', handleGlobalPointerMove);
    document.addEventListener('touchend', handleGlobalPointerUp);
    
    initAudio();
  }, [initAudio]);

  // Global pointer move handler that works outside canvas bounds
const handleGlobalPointerMove = useCallback((e) => {
  if (!gameStateRef.current.slingshot.isDragging) return;

  const canvas = canvasRef.current;
  const rect = canvas.getBoundingClientRect();
  
  // Get pointer coordinates (mouse or touch)
  const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
  const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
  
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  
  // Scale coordinates to canvas size and convert to world coordinates
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const worldX = (x * scaleX) + gameStateRef.current.camera.x;
  const worldY = (y * scaleY) + gameStateRef.current.camera.y;
  
  // Update drag position
  gameStateRef.current.slingshot.dragX = worldX;
  gameStateRef.current.slingshot.dragY = worldY;
  
  // Update trajectory in real-time
  updateTrajectory();
}, []);

  // Global pointer up handler
  const handleGlobalPointerUp = useCallback(() => {
    if (!gameStateRef.current.slingshot.isDragging) return;
    
    // Remove global event listeners
    document.removeEventListener('mousemove', handleGlobalPointerMove);
    document.removeEventListener('mouseup', handleGlobalPointerUp);
    document.removeEventListener('touchmove', handleGlobalPointerMove);
    document.removeEventListener('touchend', handleGlobalPointerUp);
    
    const ball = gameStateRef.current.ball;
    const deltaX = ball.x - gameStateRef.current.slingshot.dragX;
    const deltaY = ball.y - gameStateRef.current.slingshot.dragY;
    
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxPower = gameStateRef.current.slingshot.maxPower;
    const power = Math.min(distance / maxPower, 1); // Match trajectory calculation

    if (power > 0.1) { // Lower threshold for more responsive launching
      // Launch the ball with EXACT same calculation as trajectory
      ball.velocityX = (deltaX / maxPower) * power * 25; // Increased from 20 to 25
      ball.velocityY = (deltaY / maxPower) * power * 25; // Increased from 20 to 25
      ball.isLaunched = true;
      ball.canSling = false;
      ball.bounceCount = 0;
      ball.trail = [];
      ball.isOnPlatform = false;
      
      setGameState('launched');
      gameStateRef.current.gameState = 'launched';
      
      // Play launch sound
      playSound(200 + power * 10, 0.2, 0.15);
    } else {
      // Not enough power, return to ready state
      setGameState('ready');
      gameStateRef.current.gameState = 'ready';
    }
    
    gameStateRef.current.slingshot.isDragging = false;
    gameStateRef.current.slingshot.trajectoryPoints = [];
  }, [playSound]);

  const handlePointerMove = useCallback((e) => {
  // Keep the original canvas-bound handler for compatibility
  handleGlobalPointerMove(e);
}, [handleGlobalPointerMove]);

  const handlePointerUp = useCallback(() => {
    // Keep the original canvas-bound handler for compatibility
    handleGlobalPointerUp();
  }, [handleGlobalPointerUp]);


  // Add floating text
  const addFloatingText = useCallback((x, y, text, color = '#fff') => {
    gameStateRef.current.floatingTexts.push({
      x, y, text, color,
      life: 60,
      velocityY: -2
    });
  }, []);
  
  // Add particles
  const addParticles = useCallback((x, y, color, count = 8) => {
    for (let i = 0; i < count; i++) {
      gameStateRef.current.particles.push({
        x, y,
        velocityX: (Math.random() - 0.5) * 8,
        velocityY: (Math.random() - 0.5) * 8,
        life: 30,
        color,
        size: Math.random() * 4 + 2
      });
    }
  }, []);
  
  // Check collision between ball and platform
  const checkCollision = useCallback((ball, platform) => {
    const closestX = Math.max(platform.x, Math.min(ball.x, platform.x + platform.width));
    const closestY = Math.max(platform.y, Math.min(ball.y, platform.y + platform.height));
    
    const distanceX = ball.x - closestX;
    const distanceY = ball.y - closestY;
    
    return (distanceX * distanceX + distanceY * distanceY) < (ball.radius * ball.radius);
  }, []);

  // Add this function to recalculate trajectory - MOVED HERE BEFORE updatePhysics
  const updateTrajectory = useCallback(() => {
    if (gameStateRef.current.gameState !== 'aiming' || !gameStateRef.current.slingshot.isDragging) return;
    
    const ball = gameStateRef.current.ball;
    const deltaX = ball.x - gameStateRef.current.slingshot.dragX;
    const deltaY = ball.y - gameStateRef.current.slingshot.dragY;
    
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxPower = gameStateRef.current.slingshot.maxPower;
    const power = Math.min(distance / maxPower, 1);
    
    // Calculate trajectory points starting from ball's current position
    const trajectoryPoints = [];
    const velocityX = (deltaX / maxPower) * power * 35; // Increased from 30 to 35
    const velocityY = (deltaY / maxPower) * power * 35; // Increased from 30 to 35
    
    let simX = ball.x;
    let simY = ball.y;
    let simVelX = velocityX;
    let simVelY = velocityY;
    
    for (let i = 0; i < 30; i++) {
      trajectoryPoints.push({ x: simX, y: simY });
      simVelY += 0.5; // gravity
      simVelX *= 0.999; // air resistance
      simVelY *= 0.999;
      simX += simVelX;
      simY += simVelY;
      
      if (simY > 600) break; // Stop if hits ground
    }
    
    gameStateRef.current.slingshot.trajectoryPoints = trajectoryPoints;
  }, []);

const generateUpPlatforms = useCallback(() => {
  const platforms = gameStateRef.current.platforms;
  const topmostY = Math.min(...platforms.map(p => p.y));
  
  // Generate 4-6 new platforms with more variety
  const platformCount = Math.floor(Math.random() * 3) + 4;
  
  for (let i = 0; i < platformCount; i++) {
    // Dynamic spacing that increases with height for more challenge
    const heightFactor = Math.abs(topmostY) / 1000;
    const baseSpacing = 80 + (heightFactor * 20);
    // Add more variable spacing to prevent parallel platforms
    const variableSpacing = Math.random() * (100 + heightFactor * 20); // Increased from 60
    const y = topmostY - baseSpacing - (i * (baseSpacing + variableSpacing));
    
    // More varied horizontal positioning with better distribution
    let x;
    const patterns = ['leftSide', 'rightSide', 'center', 'extreme'];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    
    switch (pattern) {
      case 'leftSide':
        // Left side positioning
        x = 50 + Math.random() * 250;
        break;
      case 'rightSide':
        // Right side positioning
        x = 500 + Math.random() * 250;
        break;
      case 'center':
        // Center positioning
        x = 250 + Math.random() * 300;
        break;
      case 'extreme':
        // Far left or far right
        x = Math.random() > 0.5 ? 50 + Math.random() * 150 : 600 + Math.random() * 150;
        break;
    }
    
    // Ensure platforms don't spawn too close to each other horizontally
    const minHorizontalDistance = 120;
    const nearbyPlatforms = platforms.filter(p => Math.abs(p.y - y) < 50);
    let attempts = 0;
    while (attempts < 10 && nearbyPlatforms.some(p => Math.abs(p.x - x) < minHorizontalDistance)) {
      x = 50 + Math.random() * 700;
      attempts++;
    }
    
    // Dynamic platform sizing based on height
    const minWidth = Math.max(60, 100 - heightFactor * 5); // Platforms get smaller at height
    const width = minWidth + Math.random() * 60;
    const height = 15;
    
    // Dynamic platform type distribution that changes with height
    const rand = Math.random();
    const deadlyChance = Math.min(0.15, 0.05 + heightFactor * 0.02); // More deadly at height
    const movingChance = Math.min(0.25, 0.15 + heightFactor * 0.02); // More moving at height
    
    let type, color, points, moveSpeed, moveRange, moveDirection, originalY;
    
    if (rand < (1 - movingChance - deadlyChance)) {
      // Static platforms
      type = 'static';
      color = '#4CAF50';
      points = 10 + Math.floor(heightFactor * 2); // More points at height
    } else if (rand < (1 - deadlyChance)) {
      // Moving platforms - get faster and more erratic at height
      type = 'moving';
      color = '#2196F3';
      points = 15 + Math.floor(heightFactor * 3);
      moveSpeed = 0.3 + Math.random() * (0.4 + heightFactor * 0.1);
      moveRange = 20 + Math.random() * (30 + heightFactor * 5);
      moveDirection = Math.random() > 0.5 ? 1 : -1;
      originalY = y;
    } else {
      // Deadly platforms
      type = 'deadly';
      color = '#f44336';
      points = -10; // Penalty increases
    }
    
    const newPlatform = {
      x,
      y,
      width,
      height,
      type,
      color,
      id: `platform_${Date.now()}_${Math.random()}`,
      points: Math.max(1, Math.floor((Math.abs(y) / 100) + 1)), // Progressive points based on height
      hasBeenScored: false
    };
    if (type === 'moving') {
      newPlatform.moveSpeed = moveSpeed;
      newPlatform.moveRange = moveRange;
      newPlatform.moveDirection = moveDirection;
      newPlatform.originalY = originalY;
    }
    platforms.push(newPlatform);
  }
  
  // Remove platforms that are too far below to keep memory usage reasonable
  gameStateRef.current.platforms = platforms.filter(platform => 
    platform.y < gameStateRef.current.camera.y + 1000
  );
}, []);

// Add this function after generateUpPlatforms
const regenerateInitialPlatforms = useCallback(() => {
  // Clear existing platforms and regenerate initial setup
  gameStateRef.current.platforms = [
    // Starting platform
    { x: 300, y: 520, width: 200, height: 20, type: 'static', points: 0, color: '#4CAF50' },
    
    // Add some initial upper platforms around starting area
    { x: 350, y: 400, width: 100, height: 15, type: 'static', points: 10, color: '#4CAF50' },
    { x: 200, y: 320, width: 80, height: 15, type: 'moving', points: 15, color: '#2196F3', moveSpeed: 0.3, moveRange: 40, moveDirection: 1, originalY: 320 },
    { x: 500, y: 240, width: 90, height: 15, type: 'static', points: 10, color: '#4CAF50' },
    { x: 150, y: 160, width: 85, height: 15, type: 'static', points: 10, color: '#4CAF50' },
    { x: 450, y: 80, width: 95, height: 15, type: 'moving', points: 15, color: '#2196F3', moveSpeed: 0.25, moveRange: 30, moveDirection: -1, originalY: 80 },
    { x: 300, y: 0, width: 100, height: 15, type: 'static', points: 10, color: '#4CAF50' }
  ];
}, []);

  // Update game physics - modified for vertical progression
  const updatePhysics = useCallback((deltaMultiplier = 1) => {
    const ball = gameStateRef.current.ball;
    const physics = gameStateRef.current.physics;
    
    // Store previous platform positions for ball movement
      const platformPrevPositions = new Map();
      gameStateRef.current.platforms.forEach(platform => {
        if (platform.type === 'moving') {
          platformPrevPositions.set(platform, platform.y); // Track Y position instead of X
        }
      });
    
      // Update moving platforms - continuous A to B to A looping
  gameStateRef.current.platforms.forEach(platform => {
    if (platform.type === 'moving') {
      // Move the platform
      platform.y += platform.moveSpeed * platform.moveDirection * deltaMultiplier;
      
      // Check boundaries and reverse direction for continuous looping
      if (platform.moveDirection > 0 && platform.y >= platform.originalY + platform.moveRange) {
        // Moving down, hit bottom boundary - reverse to go up
        platform.moveDirection = -1;
        platform.y = platform.originalY + platform.moveRange; // Clamp to exact boundary
      } else if (platform.moveDirection < 0 && platform.y <= platform.originalY - platform.moveRange) {
        // Moving up, hit top boundary - reverse to go down
        platform.moveDirection = 1;
        platform.y = platform.originalY - platform.moveRange; // Clamp to exact boundary
      }
      
      // Move ball with platform if it's on this platform
      if (ball.currentPlatform === platform && ball.isOnPlatform && !ball.isLaunched) {
        const prevY = platformPrevPositions.get(platform);
        const deltaY = platform.y - prevY;
        ball.y += deltaY;
      }
    }
  });
    
    // Update particles - always run with delta time
  gameStateRef.current.particles = gameStateRef.current.particles.filter(particle => {
    particle.x += particle.velocityX * deltaMultiplier;
    particle.y += particle.velocityY * deltaMultiplier;
    particle.velocityY += 0.2 * deltaMultiplier;
    particle.life -= deltaMultiplier;
    return particle.life > 0;
  });
    
    // Update floating texts - always run with delta time
  gameStateRef.current.floatingTexts = gameStateRef.current.floatingTexts.filter(text => {
    text.y += text.velocityY * deltaMultiplier;
    text.life -= deltaMultiplier;
    return text.life > 0;
  });
    
    // Update ball trail - always run (add this new section)
      ball.trail = ball.trail.filter((point, index) => {
    // Add a life property to each trail point if it doesn't exist
    if (!point.life) {
      point.life = 15; // Start with 15 frames of life
    }
    point.life -= deltaMultiplier;
    return point.life > 0;
  });
    
    // Update camera to follow ball with upward progression
    const camera = gameStateRef.current.camera;
    
    // Calculate ball's screen position relative to camera
    const ballScreenY = ball.y - camera.y;
    let targetCameraY = camera.y;
    
   // If ball is near top edge of screen, move camera up (no world limit)
  if (ballScreenY < camera.topBoundary) {
    targetCameraY = ball.y - 300; // Show more above
    camera.y += (targetCameraY - camera.y) * camera.followSpeed * deltaMultiplier;
  }
    // If ball moves down and camera needs to catch up
  else if (ballScreenY > 400) { // Bottom boundary
    targetCameraY = ball.y - 400;
    camera.y += (targetCameraY - camera.y) * camera.followSpeed * deltaMultiplier;
  }
    
    // Ensure camera doesn't go beyond world boundaries
  camera.y = Math.min(0, Math.max(camera.y, camera.worldMaxY));
  
  // Update camera shake - always run with delta time
  if (gameStateRef.current.camera.shake > 0) {
    gameStateRef.current.camera.shake *= Math.pow(0.9, deltaMultiplier);
  }
    
    // Update trajectory when aiming (especially important for moving platforms)
    updateTrajectory();
    
    // Ball physics only when launched
    if (!ball.isLaunched) return;
    
    // Clear current platform when ball is launched
    ball.currentPlatform = null;
    
    // Add to trail (modify this section)
  
  ball.trail.push({ x: ball.x, y: ball.y, life: 15 });
  if (ball.trail.length > 15) ball.trail.shift();
    
    // Apply gravity with delta time
  ball.velocityY += physics.gravity * deltaMultiplier;
    
   // Apply air resistance with delta time
  ball.velocityX *= Math.pow(ball.airResistance, deltaMultiplier);
  ball.velocityY *= Math.pow(ball.airResistance, deltaMultiplier);
    
    // Update position with delta time
  ball.x += ball.velocityX * deltaMultiplier;
  ball.y += ball.velocityY * deltaMultiplier;

  // Add left and right boundary collision detection
  const leftBoundary = camera.x + 50; // Left boundary with some padding
  const rightBoundary = camera.x + 750; // Right boundary (canvas width - padding)

  // Check left boundary collision - only if moving towards boundary
  if (ball.x - ball.radius <= leftBoundary && ball.velocityX < 0) {
    ball.x = leftBoundary + ball.radius; // Position ball just inside boundary
    ball.velocityX = -ball.velocityX * 0.7; // Reverse and dampen horizontal velocity
    ball.bounceCount++;
    
    // Add visual and audio feedback
    addParticles(ball.x, ball.y, '#FFD700', 6);
    playSound(280, 0.12, 0.1);
  }

  // Check right boundary collision - only if moving towards boundary
  if (ball.x + ball.radius >= rightBoundary && ball.velocityX > 0) {
    ball.x = rightBoundary - ball.radius; // Position ball just inside boundary
    ball.velocityX = -ball.velocityX * 0.7; // Reverse and dampen horizontal velocity
    ball.bounceCount++;
    
    // Add visual and audio feedback
    addParticles(ball.x, ball.y, '#FFD700', 6);
    playSound(280, 0.12, 0.1);
  }
    
    // Check platform collisions
    ball.isOnPlatform = false;
    gameStateRef.current.platforms.forEach(platform => {
if (checkCollision(ball, platform)) {
      // Calculate collision response
      const centerX = platform.x + platform.width / 2;
      const centerY = platform.y + platform.height / 2;
      
      const deltaX = ball.x - centerX;
      const deltaY = ball.y - centerY;
      
      const impactForce = Math.sqrt(ball.velocityX * ball.velocityX + ball.velocityY * ball.velocityY);
      
      if (platform.type === 'deadly') {
        // Hit deadly obstacle - restart game
        ball.x = 400; // Original starting position
        ball.y = 500; // Original starting position
        ball.velocityX = 0;
        ball.velocityY = 0;
        ball.isLaunched = false;
        ball.canSling = true;
        ball.isOnPlatform = true;
        ball.bounceCount = 0;
        ball.currentPlatform = null;
        
        // IMPORTANT: Reset camera to starting position
        gameStateRef.current.camera.y = 0;
        gameStateRef.current.camera.x = 0;
        
        // IMPORTANT: Regenerate initial platforms
        regenerateInitialPlatforms();
        
        // Reset score to 0 for game restart
        gameStateRef.current.score = 0;
        setScore(0);
        
        addFloatingText(ball.x, ball.y, 'Game Over!', '#ff4444');
        addParticles(ball.x, ball.y, '#ff4444', 12);
        playSound(150, 0.3, 0.2);
        
        setGameState('ready');
        gameStateRef.current.gameState = 'ready';
        return;
      }
        
        // Normal collision
      if (platform.type !== 'deadly') {
        // Determine collision side
        const overlapX = (ball.radius + platform.width / 2) - Math.abs(deltaX);
        const overlapY = (ball.radius + platform.height / 2) - Math.abs(deltaY);
          
          // Only land on platform if:
          // 1. Vertical overlap is smaller (hitting top/bottom)
          // 2. Ball's BOTTOM is above platform's TOP (ball.y + ball.radius < platform.y)
          // 3. Ball is moving downward (velocityY > 0)
            if (overlapY < overlapX && (ball.y + ball.radius) < platform.y && ball.velocityY > 0) {
              // Landing on top of platform - stop the ball here
              ball.y = platform.y - ball.radius;
              ball.velocityX = 0;
              ball.velocityY = 0;
              ball.isLaunched = false;
              ball.canSling = true;
              ball.isOnPlatform = true;
              ball.bounceCount = 0;
              ball.currentPlatform = platform;
            
              // Score the platform if not already scored
              if (!platform.hasBeenScored && platform.type !== 'deadly') {
                platform.hasBeenScored = true;
                const points = Math.max(1, Math.floor((Math.abs(platform.y) / 100) + 1));
                gameStateRef.current.score += points;
                setScore(gameStateRef.current.score);
            
                // Visual feedback
                addFloatingText(ball.x, ball.y, `+${points}`, '#4CAF50');
                addParticles(ball.x, ball.y, platform.color, 6);
                playSound(300, 0.15, 0.1);
              }
            
              setGameState('ready');
              gameStateRef.current.gameState = 'ready';
            } else {
                // Side collision or hitting from below - implement proper bouncing
              if (overlapX < overlapY) {
                // Horizontal collision - reverse horizontal velocity, keep vertical
                ball.velocityX = -ball.velocityX * 0.7; // Reverse and dampen
                ball.x = deltaX > 0 ? platform.x + platform.width + ball.radius : platform.x - ball.radius;
                ball.bounceCount++;
              } else {
                  // Vertical collision - check if hitting from below or above
                  if (ball.y > platform.y) {
                    // Ball is hitting platform from below - preserve horizontal momentum
                    ball.y = platform.y + platform.height + ball.radius;
                    // Keep horizontal velocity, reverse and dampen vertical
                    ball.velocityY = Math.abs(ball.velocityY) * 0.4; // Bounce down
                    ball.bounceCount++;
                  } else {
                    // Ball is hitting platform from above - preserve horizontal momentum
                    ball.y = platform.y - ball.radius;
                    // Keep horizontal velocity, reverse and dampen vertical
                    ball.velocityY = -Math.abs(ball.velocityY) * 0.5; // Bounce up
                    ball.bounceCount++;
                  }
              }

            // Check if velocity is too small to continue bouncing
            const totalVelocity = Math.sqrt(ball.velocityX * ball.velocityX + ball.velocityY * ball.velocityY);
            if (totalVelocity < gameStateRef.current.physics.minVelocity || ball.bounceCount >= ball.maxBounces) {
              // ONLY stop and land if ball is above the platform
              if (ball.y < platform.y) {
                // Stop the ball and land it on the platform
                ball.velocityX = 0;
                ball.velocityY = 0;
                ball.isLaunched = false;
                ball.canSling = true;
                ball.isOnPlatform = true;
                ball.bounceCount = 0;
                ball.currentPlatform = platform;
                ball.y = platform.y - ball.radius;
                setGameState('ready');
                gameStateRef.current.gameState = 'ready';
                // Remove the "Landed!" text - only keep particles and sound
                // addFloatingText(ball.x, ball.y, 'Landed!', '#4CAF50'); // REMOVED
                addParticles(ball.x, ball.y, platform.color, 4);
                playSound(250, 0.1, 0.08);
              }
              // If ball is below platform, don't stop it - let it continue falling
              // Removed the else block that was stopping the ball below platforms
            }
            
            // Score the platform if not already scored
            if (!platform.hasBeenScored && platform.type !== 'deadly') {
              platform.hasBeenScored = true;
              const points = Math.max(1, Math.floor((Math.abs(platform.y) / 100) + 1));
              gameStateRef.current.score += points;
              setScore(gameStateRef.current.score);
              // Visual feedback
              addFloatingText(ball.x, ball.y, `+${points}`, '#4CAF50');
              addParticles(ball.x, ball.y, platform.color, 6);
              playSound(300, 0.15, 0.1);
            }

          }
        }
        
      }
    });
    
    // Check if ball is out of bounds - add right boundary check relative to camera
  if (ball.y > 650 || ball.x < -50 || ball.x > camera.x + 900) {
      // Reset to original starting position
      ball.x = 400; // Original starting position
      ball.y = 500; // Original starting position
      ball.velocityX = 0;
      ball.velocityY = 0;
      ball.isLaunched = false;
      ball.canSling = true;
      ball.isOnPlatform = true;
      
      // IMPORTANT: Reset camera to starting position
      gameStateRef.current.camera.y = 0;
      gameStateRef.current.camera.x = 0;
      
      // IMPORTANT: Regenerate initial platforms
      regenerateInitialPlatforms();
      
      // CHECK AND UPDATE HIGH SCORE BEFORE RESETTING
      if (gameStateRef.current.score > gameStateRef.current.highScore) {
          gameStateRef.current.highScore = gameStateRef.current.score;
          setHighScore(gameStateRef.current.highScore);
          localStorage.setItem('ninjaSlingHighScore', gameStateRef.current.highScore.toString());
          addFloatingText(ball.x, ball.y - 30, 'NEW HIGH SCORE!', '#FFD700');
      }
      
      // Reset score and show game over message

      gameStateRef.current.score = 0;
      setScore(0);
      
      addFloatingText(ball.x, ball.y, 'Game Over!', '#ff4444');
      addParticles(ball.x, ball.y, '#ff4444', 12);
      playSound(150, 0.3, 0.2);
      
      setGameState('ready');
      gameStateRef.current.gameState = 'ready';
    }
    
    // Generate new platforms as camera moves up (changed from right to up)
    const topmostPlatform = Math.min(...gameStateRef.current.platforms.map(p => p.y));
    const cameraTopEdge = camera.y; // Camera's top edge
    
    // If we need more platforms above (when camera moves up)
    if (topmostPlatform > cameraTopEdge - 400) {
      generateUpPlatforms();
    }
  }, [checkCollision, addFloatingText, addParticles, playSound, updateTrajectory, generateUpPlatforms, regenerateInitialPlatforms]);
  
 

  // Generate platforms below - for downward movement
  const generateDownPlatforms = useCallback(() => {
    const platforms = gameStateRef.current.platforms;
    const bottommostY = Math.max(...platforms.map(p => p.y));
    
    // Generate 5-8 new platforms below
    const platformCount = Math.floor(Math.random() * 4) + 5;
    
    for (let i = 0; i < platformCount; i++) {
      const y = bottommostY + 80 + (i * (60 + Math.random() * 80));
      const x = 50 + Math.random() * 700;
      const width = 60 + Math.random() * 80;
      const height = 15;
      
      // Random platform types
      const rand = Math.random();
      let type, color, points, moveSpeed, moveRange, moveDirection, originalY;
      
      if (rand < 0.6) {
        type = 'static';
        color = '#4CAF50';
        points = 10;
      } else if (rand < 0.85) {
        type = 'moving';
        color = '#2196F3';
        points = 15;
        moveSpeed = 0.5 + Math.random() * 1;
        moveRange = 30 + Math.random() * 50;
        moveDirection = Math.random() > 0.5 ? 1 : -1;
        originalY = y;
      } else {
        type = 'deadly';
        color = '#f44336';
        points = -5;
      }
      
      platforms.push({
        x, y, width, height, type, points, color,
        ...(type === 'moving' && { moveSpeed, moveRange, moveDirection, originalY })
      });
    }
    
    // Remove platforms that are too far above to save memory
    gameStateRef.current.platforms = platforms.filter(p => p.y > gameStateRef.current.camera.y - 1000);
  }, []);

  // Render game - modified camera transform for vertical movement
// Render game - enhanced with cool visual effects
// Update the render function with better safety checks
const render = useCallback(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const camera = gameStateRef.current.camera;
  
  // Enhanced safety checks to prevent NaN values
  if (!camera || typeof camera.y !== 'number' || isNaN(camera.y)) {
    return;
  }
  
  const time = Date.now() * 0.001; // Time for animations
  
  // Create dynamic animated gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  
  // Animated colors that shift based on camera height with NaN protection
  const heightFactor = Math.max(0, -camera.y / 1000);
  
  // Add NaN checks for all color calculations
  const r1 = Math.floor(30 + Math.sin(time * 0.5) * 15 + (isNaN(heightFactor) ? 0 : heightFactor * 20));
  const g1 = Math.floor(60 + Math.cos(time * 0.3) * 20 + (isNaN(heightFactor) ? 0 : heightFactor * 30));
  const b1 = Math.floor(114 + Math.sin(time * 0.7) * 30 + (isNaN(heightFactor) ? 0 : heightFactor * 40));
  
  const r2 = Math.floor(42 + Math.cos(time * 0.4) * 20 + (isNaN(heightFactor) ? 0 : heightFactor * 25));
  const g2 = Math.floor(82 + Math.sin(time * 0.6) * 25 + (isNaN(heightFactor) ? 0 : heightFactor * 35));
  const b2 = Math.floor(152 + Math.cos(time * 0.8) * 35 + (isNaN(heightFactor) ? 0 : heightFactor * 45));
  
  // Ensure all color values are valid numbers
  const safeR1 = isNaN(r1) ? 30 : Math.max(0, Math.min(255, r1));
  const safeG1 = isNaN(g1) ? 60 : Math.max(0, Math.min(255, g1));
  const safeB1 = isNaN(b1) ? 114 : Math.max(0, Math.min(255, b1));
  
  const safeR2 = isNaN(r2) ? 42 : Math.max(0, Math.min(255, r2));
  const safeG2 = isNaN(g2) ? 82 : Math.max(0, Math.min(255, g2));
  const safeB2 = isNaN(b2) ? 152 : Math.max(0, Math.min(255, b2));
  
  gradient.addColorStop(0, `rgb(${safeR1}, ${safeG1}, ${safeB1})`);
  gradient.addColorStop(0.6, `rgb(${Math.floor((safeR1+safeR2)/2)}, ${Math.floor((safeG1+safeG2)/2)}, ${Math.floor((safeB1+safeB2)/2)})`);
  gradient.addColorStop(1, `rgb(${safeR2}, ${safeG2}, ${safeB2})`);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add animated stars in the background
  ctx.save();
  for (let i = 0; i < 50; i++) {
    const starX = (i * 137) % canvas.width;
    const starY = (i * 211) % canvas.height;
    const twinkle = Math.sin(time * 2 + i) * 0.5 + 0.5;
    const alpha = 0.3 + twinkle * 0.7;
    
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(starX, starY, 1 + twinkle, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  
  // Add floating clouds with parallax effect
  ctx.save();
  for (let i = 0; i < 8; i++) {
    const cloudX = (i * 200 + time * 10 + camera.x * 0.1) % (canvas.width + 200) - 100;
    const cloudY = 100 + i * 80 + Math.sin(time * 0.5 + i) * 20;
    const alpha = 0.1 + Math.sin(time * 0.3 + i) * 0.05;
    
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    
    // Draw cloud shape
    ctx.beginPath();
    ctx.arc(cloudX, cloudY, 30, 0, Math.PI * 2);
    ctx.arc(cloudX + 25, cloudY, 35, 0, Math.PI * 2);
    ctx.arc(cloudX + 50, cloudY, 30, 0, Math.PI * 2);
    ctx.arc(cloudX + 25, cloudY - 25, 25, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  
  // Apply camera transform
  ctx.save();
  ctx.translate(
    -camera.x + (Math.random() - 0.5) * camera.shake, 
    -camera.y + (Math.random() - 0.5) * camera.shake
  );
  
  // Add floating particles in the world
  for (let i = 0; i < 20; i++) {
    const particleX = (i * 100 + time * 30) % 800;
    const particleY = camera.y - 200 + (i * 50) % 600 + Math.sin(time + i) * 30;
    const alpha = 0.2 + Math.sin(time * 2 + i) * 0.1;
    
    ctx.fillStyle = `rgba(100, 200, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(particleX, particleY, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Enhanced platform rendering with better effects
  gameStateRef.current.platforms.forEach(platform => {
    // Platform shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(platform.x + 3, platform.y + 3, platform.width, platform.height);
    
    // Main platform
    ctx.fillStyle = platform.color;
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    
    // Platform highlights and effects
    if (platform.type === 'moving') {
      // Glowing effect for moving platforms
      ctx.shadowColor = platform.color;
      ctx.shadowBlur = 15;
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
      ctx.shadowBlur = 0;
      
      // Animated energy particles around moving platforms
      for (let i = 0; i < 3; i++) {
        const angle = time * 2 + i * (Math.PI * 2 / 3);
        const radius = 25 + Math.sin(time * 3 + i) * 5;
        const px = platform.x + platform.width/2 + Math.cos(angle) * radius;
        const py = platform.y + platform.height/2 + Math.sin(angle) * radius;
        
        ctx.fillStyle = `rgba(33, 150, 243, ${0.6 + Math.sin(time * 4 + i) * 0.3})`;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (platform.type === 'deadly') {
      // Pulsing red glow for deadly platforms
      const pulse = Math.sin(time * 4) * 0.5 + 0.5;
      ctx.shadowColor = '#ff4444';
      ctx.shadowBlur = 10 + pulse * 10;
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
      ctx.shadowBlur = 0;
      
      // Warning sparks
      for (let i = 0; i < 2; i++) {
        const sparkX = platform.x + Math.random() * platform.width;
        const sparkY = platform.y + Math.random() * platform.height;
        ctx.fillStyle = `rgba(255, 100, 100, ${Math.random()})`;
        ctx.beginPath();
        ctx.arc(sparkX, sparkY, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Subtle highlight for static platforms
      const highlight = ctx.createLinearGradient(platform.x, platform.y, platform.x, platform.y + platform.height);
      highlight.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
      highlight.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
      ctx.fillStyle = highlight;
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height * 0.3);
    }
  });
  
  // Enhanced ball trail with gradient
  const ball = gameStateRef.current.ball;
  ball.trail.forEach((point, index) => {
    const alpha = (point.life || 15) / 15;
    const size = alpha * 8;
    
    // Create gradient for trail
    const trailGradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, size);
    trailGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    trailGradient.addColorStop(1, `rgba(100, 200, 255, 0)`);
    
    ctx.fillStyle = trailGradient;
    ctx.beginPath();
    ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
    ctx.fill();
  });
  
  // Enhanced ball rendering
  const ballGradient = ctx.createRadialGradient(
    ball.x - 5, ball.y - 5, 0,
    ball.x, ball.y, ball.radius
  );
  ballGradient.addColorStop(0, '#ffffff');
  ballGradient.addColorStop(0.7, '#ff6b6b');
  ballGradient.addColorStop(1, '#d63031');
  
  ctx.fillStyle = ballGradient;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Ball glow effect
  ctx.shadowColor = '#ff6b6b';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  
  // Enhanced slingshot rendering
  if (gameStateRef.current.gameState === 'aiming' && gameStateRef.current.slingshot.isDragging) {
    const slingshot = gameStateRef.current.slingshot;
    
    // Slingshot line with glow
    ctx.strokeStyle = '#ffeb3b';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ffeb3b';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(slingshot.dragX, slingshot.dragY);
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Enhanced trajectory with glowing dots
    if (slingshot.trajectoryPoints) {
      slingshot.trajectoryPoints.forEach((point, index) => {
        const alpha = 1 - (index / slingshot.trajectoryPoints.length);
        const size = 3 * alpha;
        
        ctx.fillStyle = `rgba(255, 235, 59, ${alpha * 0.8})`;
        ctx.shadowColor = '#ffeb3b';
        ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;
    }
  }
  
  // Enhanced particles
  gameStateRef.current.particles.forEach(particle => {
    const alpha = particle.life / 30;
    const gradient = ctx.createRadialGradient(
      particle.x, particle.y, 0,
      particle.x, particle.y, particle.size
    );
    gradient.addColorStop(0, particle.color.replace(')', `, ${alpha})`));
    gradient.addColorStop(1, particle.color.replace(')', `, 0)`));
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  });
  
  // Enhanced floating texts with glow
  gameStateRef.current.floatingTexts.forEach(text => {
    const alpha = text.life / 60;
    ctx.fillStyle = text.color.replace(')', `, ${alpha})`) || `rgba(255, 255, 255, ${alpha})`;
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = text.color;
    ctx.shadowBlur = 5;
    ctx.fillText(text.text, text.x, text.y);
    ctx.shadowBlur = 0;
  });
  
  ctx.restore(); // End camera transform
  
  // UI elements with enhanced styling
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(10, 10, 200, 60); // Move to left top corner (x=10)

  const uiGradient = ctx.createLinearGradient(10, 10, 210, 70);
  uiGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
  uiGradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
  ctx.fillStyle = uiGradient;
  ctx.fillRect(10, 10, 200, 60); // Move gradient overlay to match

  // Score text with glow
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'left';
  ctx.shadowColor = '#00ff88';
  ctx.shadowBlur = 3;
  ctx.fillText(`Score: ${gameStateRef.current.score}`, 20, 35); // Move text to match box (x=20)
  ctx.fillText(`High Score: ${gameStateRef.current.highScore}`, 20, 55); // Move text to match box (x=20)
  ctx.shadowBlur = 0;
  ctx.textAlign = 'center'; // Reset alignment

  // Enhanced instructions
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 2;

  if (gameStateRef.current.gameState === 'ready') {
    ctx.fillText('🎯 Click and drag from the ball to sling upward to the next platform! 🚀', canvas.width / 2, canvas.height - 30);
  } else if (gameStateRef.current.gameState === 'aiming') {
    ctx.fillText('💥 Release to launch! 💥', canvas.width / 2, canvas.height - 30);
  }
  ctx.shadowBlur = 0;
}, []);

  // Add this function INSIDE the component, before updatePhysics
  const generateLeftPlatforms = useCallback(() => {
    const platforms = gameStateRef.current.platforms;
    const leftmostX = Math.min(...platforms.map(p => p.x));
    
    // Generate 5-8 new platforms to the left
    const platformCount = Math.floor(Math.random() * 4) + 5;
    
    for (let i = 0; i < platformCount; i++) {
      const x = leftmostX - 150 - (i * (100 + Math.random() * 100));
      const y = 100 + Math.random() * 400;
      const width = 60 + Math.random() * 80;
      const height = 15;
      
      // Random platform types
      const rand = Math.random();
      let type, color, points, moveSpeed, moveRange, moveDirection, originalX;
      
      if (rand < 0.6) {
        // Static platform
        type = 'static';
        color = '#4CAF50';
        points = 10;
      } else if (rand < 0.85) {
        // Moving platform
        type = 'moving';
        color = '#2196F3';
        points = 15;
        moveSpeed = 0.5 + Math.random() * 1; // Reduced from 1 + Math.random() * 2
        moveRange = 50 + Math.random() * 100;
        moveDirection = Math.random() > 0.5 ? 1 : -1;
        originalX = x;
      } else {
        // Deadly platform
        type = 'deadly';
        color = '#f44336';
        points = -5;
      }
      
      platforms.push({
        x, y, width, height, type, points, color,
        ...(type === 'moving' && { moveSpeed, moveRange, moveDirection, originalX })
      });
    }
    
    // Remove platforms that are too far right to save memory
    gameStateRef.current.platforms = platforms.filter(p => p.x > gameStateRef.current.camera.x - 1000);
  }, []);

  const generateRightPlatforms = useCallback(() => {
    const platforms = gameStateRef.current.platforms;
    const rightmostX = Math.max(...platforms.map(p => p.x + p.width));
    
    // Generate 5-8 new platforms to the right
    const platformCount = Math.floor(Math.random() * 4) + 5;
    
    for (let i = 0; i < platformCount; i++) {
      const x = rightmostX + 150 + (i * (100 + Math.random() * 100));
      const y = 100 + Math.random() * 400;
      const width = 60 + Math.random() * 80;
      const height = 15;
      
      // Random platform types
      const rand = Math.random();
      let type, color, points, moveSpeed, moveRange, moveDirection, originalX;
      
      if (rand < 0.6) {
        // Static platform
        type = 'static';
        color = '#4CAF50';
        points = 10;
      } else if (rand < 0.85) {
        // Moving platform
        type = 'moving';
        color = '#2196F3';
        points = 15;
        moveSpeed = 0.5 + Math.random() * 1; // Reduced from 1 + Math.random() * 2
        moveRange = 50 + Math.random() * 100;
        moveDirection = Math.random() > 0.5 ? 1 : -1;
        originalX = x;
      } else {
        // Deadly platform
        type = 'deadly';
        color = '#f44336';
        points = -5;
      }
      
      platforms.push({
        x, y, width, height, type, points, color,
        ...(type === 'moving' && { moveSpeed, moveRange, moveDirection, originalX })
      });
    }
    
    // Remove platforms that are too far left to save memory
    gameStateRef.current.platforms = platforms.filter(p => p.x + p.width > gameStateRef.current.camera.x - 1000);
  }, []);
  
  // Game loop
 // Update the game loop to use delta time
  const gameLoop = useCallback((currentTime = performance.now()) => {
    const timing = gameStateRef.current.timing;
  
    // Calculate delta time with proper initialization
    if (timing.lastTime === 0) {
      timing.lastTime = currentTime;
      timing.deltaTime = timing.fixedTimeStep; // Use fixed step for first frame
    } else {
      const rawDelta = currentTime - timing.lastTime;
      timing.deltaTime = Math.min(rawDelta, 33.33); // Cap at 30 FPS minimum
      timing.lastTime = currentTime;
    }
  
    // Normalize delta time to 60 FPS baseline with NaN protection  
    const deltaMultiplier = isNaN(timing.deltaTime) ? 1 : timing.deltaTime / timing.fixedTimeStep;
  
    updatePhysics(deltaMultiplier);
    render();
    requestAnimationFrame(gameLoop);
  }, [updatePhysics, render]);
  
  // Initialize game
 useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  
  // Initialize timing system properly
  gameStateRef.current.timing = {
    lastTime: 0,
    deltaTime: 16.67, // Start with 60 FPS baseline
    targetFPS: 60,
    fixedTimeStep: 1000 / 60
  };
  
  // Load high score
  const savedHighScore = localStorage.getItem('ninjaSlingHighScore');
  if (savedHighScore) {
    gameStateRef.current.highScore = parseInt(savedHighScore);
    setHighScore(gameStateRef.current.highScore);
  }
  
  // Set initial state
  gameStateRef.current.ball.isOnPlatform = true;
  gameStateRef.current.ball.canSling = true;
  
  // Set up event listeners
  canvas.addEventListener('mousedown', handlePointerDown);
  canvas.addEventListener('mousemove', handlePointerMove);
  canvas.addEventListener('mouseup', handlePointerUp);
  canvas.addEventListener('touchstart', handlePointerDown);
  canvas.addEventListener('touchmove', handlePointerMove);
  canvas.addEventListener('touchend', handlePointerUp);
  
  // Start game loop with proper timing
  requestAnimationFrame(gameLoop);
    
    // Start game loop
    gameLoop();
    
    return () => {
      canvas.removeEventListener('mousedown', handlePointerDown);
      canvas.removeEventListener('mousemove', handlePointerMove);
      canvas.removeEventListener('mouseup', handlePointerUp);
      canvas.removeEventListener('touchstart', handlePointerDown);
      canvas.removeEventListener('touchmove', handlePointerMove);
      canvas.removeEventListener('touchend', handlePointerUp);
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp, gameLoop]);

  useEffect(() => {
    document.addEventListener('pointermove', handleGlobalPointerMove);
    document.addEventListener('pointerup', handleGlobalPointerUp);
    document.addEventListener('touchmove', handleGlobalPointerMove);
    document.addEventListener('touchend', handleGlobalPointerUp);
    
    initAudio();
  }, [initAudio, handleGlobalPointerMove, handleGlobalPointerUp]);
  
  // Reset game function
  const resetGame = useCallback(() => {
    const ball = gameStateRef.current.ball;
    ball.x = 100;
    ball.y = 300;
    ball.velocityX = 0;
    ball.velocityY = 0;
    ball.isLaunched = false;
    ball.canSling = true;
    ball.isOnPlatform = true;
    ball.trail = [];
    
    gameStateRef.current.score = 0;
    setScore(0);
    setGameState('ready');
    gameStateRef.current.gameState = 'ready';
  }, []);
  
  return (
  <div style={{ 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center' 
  }}>
    {/* Game Canvas */}
    <canvas 
      ref={canvasRef} 
      width={800} 
      height={600}
      className={styles.gameCanvas}
      style={{ 
        border: '2px solid #333', 
        borderRadius: '10px',
        cursor: gameState === 'ready' ? 'crosshair' : gameState === 'aiming' ? 'crosshair' : 'default',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
      }}
    />
    
    {/* Reset Button */}
    <div style={{ marginTop: '10px', textAlign: 'center' }}>
      <button 
        onClick={resetGame}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#ff6b6b',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(255,107,107,0.3)',
          transition: 'transform 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
      >
        Reset Game
      </button>
    </div>
  </div>
);
};

export default NinjaSlingGame;