import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Viewer from '../components/Viewer';
import AnimationControls from '../components/AnimationControls';
import SequenceEditor from '../components/SequenceEditor';
import { generateAnimation } from '../services/api';
import '../styles/ViewerPage.css';

const ViewerPage = () => {
  const navigate = useNavigate();
  const [sequences, setSequences] = useState([]);
  const [selectedSequence, setSelectedSequence] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const sessionId = localStorage.getItem('sessionId');

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }

    // Check for existing sequences
    const savedSequences = JSON.parse(sessionStorage.getItem('animationSequences') || '[]');

    if (savedSequences.length > 0) {
      setSequences(savedSequences);
      setSelectedSequence(savedSequences[0]);
    } else {
      fetchAnimationSequence();
    }
  }, [navigate, sessionId]);

  const fetchAnimationSequence = async () => {
    setIsLoading(true);
    try {
      const response = await generateAnimation(sessionId);
      const newSequence = {
        id: Date.now(),
        name: `Sequence ${sequences.length + 1}`,
        commands: response.data
      };
      
      const updatedSequences = [...sequences, newSequence];
      setSequences(updatedSequences);
      setSelectedSequence(newSequence);
      sessionStorage.setItem('animationSequences', JSON.stringify(updatedSequences));
    } catch (error) {
      console.error('Failed to generate animation:', error);
    }
    setIsLoading(false);
  };

  const handleNewSequence = () => {
    fetchAnimationSequence();
  };

  const handleSaveSequence = (updatedCommands) => {
    const updatedSequence = {
      ...selectedSequence,
      commands: updatedCommands
    };
    
    const updatedSequences = sequences.map(seq => 
      seq.id === selectedSequence.id ? updatedSequence : seq
    );
    
    setSequences(updatedSequences);
    setSelectedSequence(updatedSequence);
    sessionStorage.setItem('animationSequences', JSON.stringify(updatedSequences));
  };

  return (
    <div className="viewer-page">
      <div className="viewer-container">
        <Viewer />
      </div>
      
      <div className="controls-container">
        <div className="sequence-selector">
          <select 
            value={selectedSequence?.id || ''} 
            onChange={(e) => setSelectedSequence(sequences.find(s => s.id === parseInt(e.target.value)))}
          >
            {sequences.map(seq => (
              <option key={seq.id} value={seq.id}>{seq.name}</option>
            ))}
          </select>
          
          <button onClick={handleNewSequence} disabled={isLoading}>
            {isLoading ? 'Generating...' : 'New Sequence'}
          </button>
        </div>
        
        {selectedSequence && (
          <>
            <SequenceEditor 
              commands={selectedSequence.commands} 
              onSave={handleSaveSequence} 
            />
            <AnimationControls commands={selectedSequence.commands} />
          </>
        )}
      </div>
    </div>
  );
};

export default ViewerPage;