import { useEffect, useRef, useState } from 'react';
import GameCanvas from '../../components/GameCanvas';
import styles from '../../styles/Game.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <h1>Ninja Sling</h1>
      
      {/* Simple Developer Credits - Right below title */}
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
          Special thanks: Nischal B. • Kiran D. • Sujan A. • Anish P. • Krishna C. • Pradip C. • Anish B. • Sakar K.
        </div>
      </div>
      
      <GameCanvas />
    </div>
  );
}
