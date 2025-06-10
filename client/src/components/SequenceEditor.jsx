import React, { useState } from 'react';

const SequenceEditor = ({ commands, onSave }) => {
  const [editableCommands, setEditableCommands] = useState([...commands]);
  const [newSequenceName, setNewSequenceName] = useState('');

  const handleCommandChange = (index, field, value) => {
    const updatedCommands = [...editableCommands];
    
    if (field === 'action') {
      updatedCommands[index] = { ...updatedCommands[index], action: value, params: {} };
    } else if (field.startsWith('params.')) {
      const paramField = field.split('.')[1];
      updatedCommands[index].params[paramField] = value;
    } else {
      updatedCommands[index][field] = value;
    }
    
    setEditableCommands(updatedCommands);
  };

  const handleSave = () => {
    onSave(editableCommands);
  };

  const addCommand = () => {
    setEditableCommands([
      ...editableCommands,
      { fragmentId: '', action: 'translate', params: {} }
    ]);
  };

  const removeCommand = (index) => {
    const updatedCommands = [...editableCommands];
    updatedCommands.splice(index, 1);
    setEditableCommands(updatedCommands);
  };

  return (
    <div className="sequence-editor">
      <h3>Animation Sequence</h3>
      
      <div className="commands-list">
        {editableCommands.map((cmd, index) => (
          <div key={index} className="command-item">
            <div className="command-header">
              <span>Command #{index + 1}</span>
              <button onClick={() => removeCommand(index)}>Remove</button>
            </div>
            
            <div className="command-fields">
              <div>
                <label>Fragment ID</label>
                <input 
                  type="number" 
                  value={cmd.fragmentId} 
                  onChange={(e) => handleCommandChange(index, 'fragmentId', e.target.value)}
                />
              </div>
              
              <div>
                <label>Action</label>
                <select 
                  value={cmd.action} 
                  onChange={(e) => handleCommandChange(index, 'action', e.target.value)}
                >
                  <option value="translate">Translate</option>
                  <option value="rotate">Rotate</option>
                  <option value="scale">Scale</option>
                </select>
              </div>
              
              {cmd.action === 'translate' && (
                <>
                  <div>
                    <label>X</label>
                    <input 
                      type="number"
                      value={cmd.params.x || 0} 
                      onChange={(e) => handleCommandChange(index, 'params.x', parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <label>Y</label>
                    <input 
                      type="number"
                      value={cmd.params.y || 0} 
                      onChange={(e) => handleCommandChange(index, 'params.y', parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <label>Z</label>
                    <input 
                      type="number"
                      value={cmd.params.z || 0} 
                      onChange={(e) => handleCommandChange(index, 'params.z', parseFloat(e.target.value))}
                    />
                  </div>
                </>
              )}
              
              {cmd.action === 'rotate' && (
                <>
                  <div>
                    <label>Axis</label>
                    <select 
                      value={cmd.params.axis || 'z'} 
                      onChange={(e) => handleCommandChange(index, 'params.axis', e.target.value)}
                    >
                      <option value="x">X</option>
                      <option value="y">Y</option>
                      <option value="z">Z</option>
                    </select>
                  </div>
                  <div>
                    <label>Angle</label>
                    <input 
                      type="number"
                      value={cmd.params.angle || 0} 
                      onChange={(e) => handleCommandChange(index, 'params.angle', parseFloat(e.target.value))}
                    />
                  </div>
                </>
              )}
              
              {cmd.action === 'scale' && (
                <div>
                  <label>Factor</label>
                  <input 
                    type="number"
                    step="0.1"
                    value={cmd.params.factor || 1} 
                    onChange={(e) => handleCommandChange(index, 'params.factor', parseFloat(e.target.value))}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="editor-controls">
        <button onClick={addCommand}>Add Command</button>
        <button onClick={handleSave}>Save Sequence</button>
      </div>
    </div>
  );
};

export default SequenceEditor;