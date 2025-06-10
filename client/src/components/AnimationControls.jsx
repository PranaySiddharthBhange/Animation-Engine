import React, { useState } from 'react';

const AnimationControls = ({ commands }) => {
  const [duration, setDuration] = useState(1000);
  const [easing, setEasing] = useState('easeInOut');

  const handlePlay = () => {
    // This would integrate with the Viewer's animation system
    console.log('Playing animation with commands:', commands);
    // Actual implementation would use the Viewer API to animate fragments
  };

  const handleStop = () => {
    console.log('Animation stopped');
  };

  const handleReset = () => {
    console.log('Model reset');
  };

  return (
    <div className="animation-controls">
      <div className="control-group">
        <label>Duration (ms)</label>
        <input 
          type="number" 
          value={duration} 
          onChange={(e) => setDuration(e.target.value)}
          min="100"
        />
      </div>
      
      <div className="control-group">
        <label>Easing</label>
        <select value={easing} onChange={(e) => setEasing(e.target.value)}>
          <option value="easeInOut">Ease In/Out</option>
          <option value="easeIn">Ease In</option>
          <option value="easeOut">Ease Out</option>
          <option value="linear">Linear</option>
          <option value="bounce">Bounce</option>
        </select>
      </div>
      
      <div className="button-group">
        <button onClick={handlePlay}>Play</button>
        <button onClick={handleStop}>Stop</button>
        <button onClick={handleReset}>Reset</button>
      </div>
      
      <button className="export-btn">Export Video</button>
    </div>
  );
};

export default AnimationControls;