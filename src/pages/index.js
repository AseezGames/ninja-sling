import { useEffect, useRef, useState } from 'react';
import GameCanvas from '../../components/GameCanvas';
import styles from '../../styles/Game.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <h1>Ninja Sling</h1>
      <GameCanvas />
      <div className={styles.controls}>
        <p>Click and drag from the ball to aim</p>
        <p>Release to launch your ninja to the next platform!</p>
        <p>Avoid red platforms - they're deadly!</p>
      </div>
    </div>
  );
}
