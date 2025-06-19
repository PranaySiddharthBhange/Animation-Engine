// Button.js
import React from 'react';

const Button = ({ title, action, style }) => {
  return (
    <button onClick={action} style={style}>
      {title}
    </button>
  );
};

export default Button;
