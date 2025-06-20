import React, { useState } from 'react';
import Button from './Button';
import animateModel from '../utils/animateModel';

const Dashboard = ({ viewer }) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const [animationStatus, setAnimationStatus] = useState('idle'); // idle, disassembling, reassembling

    const handleAnimate = async () => {
        if (isAnimating) return;
        
        setIsAnimating(true);
        
        if (viewer && viewer.model) {
            // First disassemble
            setAnimationStatus('disassembling');
            const disassemblySuccess = await animateModel(viewer, 'disassembly');
            
            if (disassemblySuccess) {
                // Then reassemble
                setAnimationStatus('reassembling');
                const reassemblySuccess = await animateModel(viewer, 'assembly');
                
                if (reassemblySuccess) {
                    console.log('Full animation sequence completed!');
                }
            }
        }
        
        setIsAnimating(false);
        setAnimationStatus('idle');
    };

    const getButtonText = () => {
        if (isAnimating) {
            if (animationStatus === 'disassembling') return 'Disassembling...';
            if (animationStatus === 'reassembling') return 'Reassembling...';
            return 'Animating...';
        }
        return 'Generate Animation';
    };

    return (
        <div className="dashboard">
            <h2>Model Controls</h2>
            <div className="button-group">
                <Button 
                    title={getButtonText()} 
                    action={handleAnimate}
                    disabled={isAnimating}
                    style={{ 
                        padding: '10px 20px', 
                        backgroundColor: isAnimating ? '#2E7D32' : '#4CAF50', 
                        color: 'white',
                        zIndex: 1000 
                    }}
                />
            </div>
        </div>
    );
};

export default Dashboard;