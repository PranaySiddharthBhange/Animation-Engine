import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  Plus, 
  Trash2, 
  ChevronUp, 
  Save,
  Copy,
  Edit3
} from 'lucide-react';

const SequenceManager = ({ onSequenceChange, onGenerateSequence }) => {
  const [sequences, setSequences] = useState([]);
  const [selectedSequenceIndex, setSelectedSequenceIndex] = useState(0);
  const [editingSequence, setEditingSequence] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [newSequenceName, setNewSequenceName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);

  // Load sequences from sessionStorage on component mount
  useEffect(() => {
    const storedSequences = JSON.parse(sessionStorage.getItem('sequences')) || [];
    setSequences(storedSequences);
    if (storedSequences.length > 0) {
      setEditingSequence([...storedSequences[0]]);
    }
  }, []);

  // Update editing sequence when selected sequence changes
  useEffect(() => {
    if (sequences.length > 0 && sequences[selectedSequenceIndex]) {
      setEditingSequence([...sequences[selectedSequenceIndex]]);
      onSequenceChange(sequences[selectedSequenceIndex]);
    }
  }, [selectedSequenceIndex, sequences, onSequenceChange]);

  const handleSequenceSelect = (index) => {
    setSelectedSequenceIndex(index);
    setIsEditing(false);
  };

  const startEditing = () => {
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (sequences.length > 0) {
      setEditingSequence([...sequences[selectedSequenceIndex]]);
    }
    setIsEditing(false);
  };

  const saveAsNewSequence = () => {
    if (editingSequence.length === 0) return;
    
    setShowNameInput(true);
    setNewSequenceName(`Sequence ${sequences.length + 1}`);
  };

  const confirmSaveSequence = () => {
    if (!newSequenceName.trim()) return;

    const updatedSequences = [...sequences, [...editingSequence]];
    setSequences(updatedSequences);
    sessionStorage.setItem('sequences', JSON.stringify(updatedSequences));
    
    setSelectedSequenceIndex(updatedSequences.length - 1);
    setIsEditing(false);
    setShowNameInput(false);
    setNewSequenceName('');
  };

  const addFragment = () => {
    const newFragment = {
      fragmentId: 1,
      action: 'translate',
      params: { x: 0, y: 0, z: 0 }
    };
    setEditingSequence([...editingSequence, newFragment]);
  };

  const deleteFragment = (index) => {
    const updated = editingSequence.filter((_, i) => i !== index);
    setEditingSequence(updated);
  };

  const moveFragmentUp = (index) => {
    if (index === 0) return;
    const updated = [...editingSequence];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setEditingSequence(updated);
  };

  const moveFragmentDown = (index) => {
    if (index === editingSequence.length - 1) return;
    const updated = [...editingSequence];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setEditingSequence(updated);
  };

  const updateFragment = (index, field, value) => {
    const updated = [...editingSequence];
    if (field === 'fragmentId') {
      updated[index].fragmentId = parseInt(value) || 1;
    } else if (field === 'action') {
      updated[index].action = value;
      // Reset params based on action
      if (value === 'translate') {
        updated[index].params = { x: 0, y: 0, z: 0 };
      } else if (value === 'rotate') {
        updated[index].params = { axis: 'x', angle: 0 };
      }
    } else if (field.startsWith('params.')) {
      const paramKey = field.split('.')[1];
      if (updated[index].action === 'translate') {
        updated[index].params[paramKey] = parseFloat(value) || 0;
      } else if (updated[index].action === 'rotate') {
        if (paramKey === 'axis') {
          updated[index].params.axis = value;
        } else if (paramKey === 'angle') {
          updated[index].params.angle = parseFloat(value) || 0;
        }
      }
    }
    setEditingSequence(updated);
  };

  const generateNewSequence = async () => {
    try {
      await onGenerateSequence();
      // Reload sequences after generation
      const updatedSequences = JSON.parse(sessionStorage.getItem('sequences')) || [];
      setSequences(updatedSequences);
      if (updatedSequences.length > 0) {
        setSelectedSequenceIndex(updatedSequences.length - 1);
      }
    } catch (error) {
      console.error('Failed to generate sequence:', error);
    }
  };

  if (sequences.length === 0) {
    return (
      <div className="w-80 bg-gray-800 text-white p-4 overflow-y-auto">
        <div className="text-center py-8">
          <h3 className="text-lg font-semibold mb-4">No Sequences Found</h3>
          <p className="text-gray-400 mb-4">Generate your first animation sequence to get started.</p>
          <button
            onClick={generateNewSequence}
            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            Generate Sequence
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gray-800 text-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold mb-3">Sequence Manager</h3>
        
        {/* Sequence Selector */}
        <div className="relative mb-3">
          <select
            value={selectedSequenceIndex}
            onChange={(e) => handleSequenceSelect(parseInt(e.target.value))}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white appearance-none cursor-pointer"
            disabled={isEditing}
          >
            {sequences.map((_, index) => (
              <option key={index} value={index}>
                Sequence {index + 1}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={startEditing}
                className="flex-1 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-1"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={generateNewSequence}
                className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg text-sm flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                New
              </button>
            </>
          ) : (
            <>
              <button
                onClick={saveAsNewSequence}
                className="flex-1 bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-1"
              >
                <Save className="w-4 h-4" />
                Save As
              </button>
              <button
                onClick={cancelEditing}
                className="bg-gray-600 hover:bg-gray-700 px-3 py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Name Input Modal */}
      {showNameInput && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
          <div className="bg-gray-800 p-4 rounded-lg w-64">
            <h4 className="font-semibold mb-3">Save Sequence As</h4>
            <input
              type="text"
              value={newSequenceName}
              onChange={(e) => setNewSequenceName(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 mb-3"
              placeholder="Sequence name"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={confirmSaveSequence}
                className="flex-1 bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-sm"
              >
                Save
              </button>
              <button
                onClick={() => setShowNameInput(false)}
                className="bg-gray-600 hover:bg-gray-700 px-3 py-2 rounded text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sequence Editor */}
      <div className="flex-1 overflow-y-auto p-4">
        {isEditing && (
          <button
            onClick={addFragment}
            className="w-full bg-gray-700 hover:bg-gray-600 border-2 border-dashed border-gray-600 rounded-lg py-3 mb-4 flex items-center justify-center gap-2 text-gray-300"
          >
            <Plus className="w-4 h-4" />
            Add Fragment
          </button>
        )}

        <div className="space-y-3">
          {editingSequence.map((fragment, index) => (
            <div key={index} className="bg-gray-700 rounded-lg p-3">
              {/* Fragment Header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-300">
                  Fragment {index + 1}
                </span>
                {isEditing && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveFragmentUp(index)}
                      disabled={index === 0}
                      className="p-1 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveFragmentDown(index)}
                      disabled={index === editingSequence.length - 1}
                      className="p-1 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteFragment(index)}
                      className="p-1 hover:bg-red-600 rounded text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Fragment ID */}
              <div className="mb-2">
                <label className="block text-xs text-gray-400 mb-1">Fragment ID</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={fragment.fragmentId}
                    onChange={(e) => updateFragment(index, 'fragmentId', e.target.value)}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm"
                    min="1"
                  />
                ) : (
                  <div className="text-sm bg-gray-600 px-2 py-1 rounded">{fragment.fragmentId}</div>
                )}
              </div>

              {/* Action */}
              <div className="mb-2">
                <label className="block text-xs text-gray-400 mb-1">Action</label>
                {isEditing ? (
                  <select
                    value={fragment.action}
                    onChange={(e) => updateFragment(index, 'action', e.target.value)}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm"
                  >
                    <option value="translate">Translate</option>
                    <option value="rotate">Rotate</option>
                  </select>
                ) : (
                  <div className="text-sm bg-gray-600 px-2 py-1 rounded capitalize">{fragment.action}</div>
                )}
              </div>

              {/* Parameters */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Parameters</label>
                {fragment.action === 'translate' ? (
                  <div className="grid grid-cols-3 gap-2">
                    {['x', 'y', 'z'].map((axis) => (
                      <div key={axis}>
                        <label className="block text-xs text-gray-500 mb-1">{axis.toUpperCase()}</label>
                        {isEditing ? (
                          <input
                            type="number"
                            value={fragment.params[axis]}
                            onChange={(e) => updateFragment(index, `params.${axis}`, e.target.value)}
                            className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-xs"
                            step="0.1"
                          />
                        ) : (
                          <div className="text-xs bg-gray-600 px-2 py-1 rounded">{fragment.params[axis]}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Axis</label>
                      {isEditing ? (
                        <select
                          value={fragment.params.axis}
                          onChange={(e) => updateFragment(index, 'params.axis', e.target.value)}
                          className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-xs"
                        >
                          <option value="x">X</option>
                          <option value="y">Y</option>
                          <option value="z">Z</option>
                        </select>
                      ) : (
                        <div className="text-xs bg-gray-600 px-2 py-1 rounded">{fragment.params.axis}</div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Angle</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={fragment.params.angle}
                          onChange={(e) => updateFragment(index, 'params.angle', e.target.value)}
                          className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-xs"
                          step="1"
                        />
                      ) : (
                        <div className="text-xs bg-gray-600 px-2 py-1 rounded">{fragment.params.angle}°</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SequenceManager;