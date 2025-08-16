import { useEffect } from 'react';

const TouchControls = ({ onMove, onJump }) => {
  return (
    <div className="touch-controls">
      <div className="movement-pad">
        <button 
          onTouchStart={() => onMove('left')}
          onTouchEnd={() => onMove('stop')}
        >
          ←
        </button>
        <button 
          onTouchStart={() => onMove('right')}
          onTouchEnd={() => onMove('stop')}
        >
          →
        </button>
      </div>
      <button 
        className="jump-button"
        onTouchStart={onJump}
      >
        JUMP
      </button>
    </div>
  );
};

export default TouchControls;