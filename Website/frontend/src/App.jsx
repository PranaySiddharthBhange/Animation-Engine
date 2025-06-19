// App.js
import React from 'react';
import Button from './components/Button';
import handleClick2 from './utils/handleClick2';
import handleClick1 from './utils/handleClick1';


const App = () => {
 

  return (
    <div style={{ display: 'flex', gap: '10px' }}>
      <Button
        title="Button 1"
        action={handleClick1}
        style={{ backgroundColor: 'red', color: 'white', padding: '10px' }}
      />
      <Button
        title="Button 2"
        action={handleClick2}
        style={{ backgroundColor: 'green', color: 'white', padding: '10px' }}
      />
    
    </div>
  );
};

export default App;
