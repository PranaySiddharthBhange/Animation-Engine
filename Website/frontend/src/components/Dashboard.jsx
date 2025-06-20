import React, { useState } from 'react';
import Button from './Button';
import animateModel from '../utils/animateModel';

const Dashboard = ({ viewer }) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const [currentMode, setCurrentMode] = useState('disassembly');

    const handleAnimate = async (mode) => {
        if (isAnimating) return;
        
        setIsAnimating(true);
        setCurrentMode(mode);
        
        if (viewer && viewer.model) {
            const success = await animateModel(viewer, mode);
            if (success) {
                console.log(`${mode === 'disassembly' ? 'Disassembly' : 'Reassembly'} completed!`);
            }
        }
        
        setIsAnimating(false);
    };

    return (
        <div className="dashboard">
            <h2>Model Controls</h2>
            <div className="button-group">
                <Button 
                    title={isAnimating && currentMode === 'disassembly' ? "Animating..." : "Disassemble"} 
                    action={() => handleAnimate('disassembly')}
                    disabled={isAnimating}
                    style={{ 
                        padding: '10px 20px', 
                        backgroundColor: isAnimating && currentMode === 'disassembly' ? '#2E7D32' : '#4CAF50', 
                        color: 'white',
                        zIndex: 1000 
                    }}
                />
                <Button 
                    title={isAnimating && currentMode === 'assembly' ? "Animating..." : "Reassemble"} 
                    action={() => handleAnimate('assembly')}
                    disabled={isAnimating}
                    style={{ 
                        padding: '10px 20px', 
                        backgroundColor: isAnimating && currentMode === 'assembly' ? '#1565C0' : '#2196F3', 
                        color: 'white',
                        zIndex: 1000,
                        marginTop: '10px'
                    }}
                />
            </div>
        </div>
    );
};

export default Dashboard;