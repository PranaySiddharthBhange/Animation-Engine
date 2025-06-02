

import React, { useState } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, RefreshCw, Download, ChevronDown
} from 'lucide-react';
import SequenceSelector from './SequenceSelector';
import Timeline from './Timeline';

/**
 * @param {{
 *  sequence: { name: string, parts: { id: string, name: string, thumbnail: string, duration: number }[] },
 *  allSequences: any[],
 *  onRegenerate: () => void,
 *  onSelectSequence: (seq: any) => void,
 *  isGenerating: boolean
 * }} props
 */
const AnimationViewer = ({
  sequence,
  allSequences,
  onRegenerate,
  onSelectSequence,
  isGenerating
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [showSequenceSelector, setShowSequenceSelector] = useState(false);
  const [playMode, setPlayMode] = useState('continuous');

  const currentPart = sequence.parts[currentPartIndex];

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const nextPart = () => {
    if (currentPartIndex < sequence.parts.length - 1) {
      setCurrentPartIndex(currentPartIndex + 1);
    }
  };

  const prevPart = () => {
    if (currentPartIndex > 0) {
      setCurrentPartIndex(currentPartIndex - 1);
    }
  };

  const selectPart = (index) => {
    setCurrentPartIndex(index);
  };

  const handleExport = () => {
    alert('Exporting animation sequence...');
    // Actual export logic goes here
  };

  return (
    <div className="flex flex-col space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Animation Viewer
          </h1>
          <div className="relative mt-2">
            <button
              onClick={() => setShowSequenceSelector(!showSequenceSelector)}
              className="flex items-center text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm font-medium"
            >
              {sequence.name} <ChevronDown size={16} className="ml-1" />
            </button>
            {showSequenceSelector && (
              <SequenceSelector
                sequences={allSequences}
                currentSequence={sequence}
                onSelect={(seq) => {
                  onSelectSequence(seq);
                  setShowSequenceSelector(false);
                  setCurrentPartIndex(0);
                }}
                onClose={() => setShowSequenceSelector(false)}
              />
            )}
          </div>
        </div>

        <div className="flex space-x-3 mt-4 md:mt-0">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Mode:</span>
            <select
              value={playMode}
              onChange={(e) => setPlayMode(e.target.value)}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-sm px-2 py-1"
            >
              <option value="continuous">Continuous</option>
              <option value="step">Step-by-Step</option>
            </select>
          </div>

          <button
            onClick={onRegenerate}
            disabled={isGenerating}
            className={`
              flex items-center px-3 py-1.5 rounded-md text-sm font-medium
              bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 
              border border-indigo-200 dark:border-indigo-800
              hover:bg-indigo-50 dark:hover:bg-indigo-900/30
              ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <RefreshCw size={16} className={`mr-1.5 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Regenerating...' : 'Regenerate'}
          </button>

          <button
            onClick={handleExport}
            className="flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Download size={16} className="mr-1.5" />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video shadow-lg">
            {currentPart && (
              <img
                src={currentPart.thumbnail}
                alt={`Animation part ${currentPartIndex + 1}`}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`text-white text-lg font-medium ${isPlaying ? 'hidden' : 'flex items-center space-x-2 bg-black/50 px-4 py-2 rounded-full'}`}>
                <Play size={20} />
                <span>Preview</span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Timeline
              parts={sequence.parts}
              currentIndex={currentPartIndex}
              onSelectPart={selectPart}
            />

            <div className="mt-6 flex items-center justify-center space-x-4">
              <button
                onClick={prevPart}
                disabled={currentPartIndex === 0}
                className={`p-2 rounded-full ${currentPartIndex === 0 ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              >
                <SkipBack size={24} />
              </button>

              <button
                onClick={togglePlay}
                className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-md hover:shadow-lg transition-all"
              >
                {isPlaying ? <Pause size={28} /> : <Play size={28} />}
              </button>

              <button
                onClick={nextPart}
                disabled={currentPartIndex === sequence.parts.length - 1}
                className={`p-2 rounded-full ${currentPartIndex === sequence.parts.length - 1 ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              >
                <SkipForward size={24} />
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 h-full">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">Animation Segments</h3>
            <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto">
              {sequence.parts.map((part, index) => (
                <button
                  key={part.id}
                  onClick={() => selectPart(index)}
                  className={`
                    block w-full text-left p-2 rounded-md transition-all
                    ${currentPartIndex === index
                      ? 'bg-indigo-100 dark:bg-indigo-900/40 border-l-4 border-indigo-600'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-l-4 border-transparent'
                    }
                  `}
                >
                  <div className="flex items-center">
                    <div className="w-16 h-16 flex-shrink-0 bg-gray-200 dark:bg-gray-700 overflow-hidden rounded">
                      <img
                        src={part.thumbnail}
                        alt={part.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{part.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{part.duration}s</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimationViewer;
