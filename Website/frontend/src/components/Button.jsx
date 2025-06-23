import React from 'react';

const Button = ({ title, action, style, disabled }) => {
    return (
        <button 
            onClick={action} 
            style={style}
            disabled={disabled}
        >
            {title}
        </button>
    );
};

export default Button;