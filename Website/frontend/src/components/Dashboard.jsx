import React, { useState, useEffect } from 'react';
import Button from './Button';
import animateModel from '../utils/animateModel';

const Dashboard = ({ viewer }) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const [animationStatus, setAnimationStatus] = useState('idle');
    const [sequenceCount, setSequenceCount] = useState(0);

    // Get stored sequence count on mount
    useEffect(() => {
        const sequences = sessionStorage.getItem('animationSequences');
        if (sequences) {
            setSequenceCount(JSON.parse(sequences).length);
        }
    }, []);

    const handleAnimate = async () => {
        if (isAnimating) return;
        
        setIsAnimating(true);
        
        if (viewer && viewer.model) {
            try {
                // First disassemble
                setAnimationStatus('disassembling');
                const disassemblySuccess = await animateModel(viewer, 'disassembly');
                
                if (disassemblySuccess) {
                    // Update sequence count
                    setSequenceCount(prev => prev + 1);
                    
                    // Then reassemble
                    setAnimationStatus('reassembling');
                    await animateModel(viewer, 'assembly');
                    
                    console.log('Full animation sequence completed!');
                }
            } catch (error) {
                console.error('Animation error:', error);
            } finally {
                setIsAnimating(false);
                setAnimationStatus('idle');
            }
        } else {
            setIsAnimating(false);
        }
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
                <div style={{ marginTop: '10px', color: '#333' }}>
                    Sequences stored: {sequenceCount}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;