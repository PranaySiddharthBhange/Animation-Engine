import { useRef, useEffect } from 'react';
import { Clock, Check } from 'lucide-react';

const SequenceSelector = ({
  sequences,
  currentSequence,
  onSelect,
  onClose
}) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 z-10 overflow-hidden"
    >
      <div className="p-2 max-h-60 overflow-y-auto">
        {sequences.length === 0 ? (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            No sequences available
          </div>
        ) : (
          sequences.map((sequence) => (
            <button
              key={sequence.id}
              onClick={() => onSelect(sequence)}
              className={`
                w-full flex items-start p-2 rounded-md text-left text-sm
                ${sequence.id === currentSequence.id
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
              `}
            >
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white flex items-center">
                  {sequence.name}
                  {sequence.id === currentSequence.id && (
                    <Check size={16} className="ml-1 text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <Clock size={12} className="mr-1" />
                  {formatDate(sequence.createdAt)}
                </div>
              </div>
              <div className="flex-shrink-0 ml-2 w-10 h-10 rounded overflow-hidden bg-gray-100 dark:bg-gray-700">
                {sequence.parts[0] && (
                  <img
                    src={sequence.parts[0].thumbnail}
                    alt={sequence.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default SequenceSelector;
