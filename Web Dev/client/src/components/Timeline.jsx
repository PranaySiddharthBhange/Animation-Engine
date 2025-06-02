

const Timeline = ({ parts, currentIndex, onSelectPart }) => {
  const totalDuration = parts.reduce((sum, part) => sum + part.duration, 0);

  return (
    <div className="mt-2">
      <div className="flex items-center mb-1 justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>Timeline</span>
        <span>{formatDuration(totalDuration)}</span>
      </div>

      <div className="relative h-10 flex rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800">
        {parts.map((part, index) => {
          const width = `${(part.duration / totalDuration) * 100}%`;

          return (
            <button
              key={part.id}
              onClick={() => onSelectPart(index)}
              className={`
                h-full relative group transition-all
                ${index === currentIndex 
                  ? 'bg-indigo-500 z-10' 
                  : 'bg-indigo-200 dark:bg-indigo-800/50 hover:bg-indigo-300 dark:hover:bg-indigo-700/50'}
                ${index === 0 ? 'rounded-l-md' : ''}
                ${index === parts.length - 1 ? 'rounded-r-md' : ''}
              `}
              style={{ width }}
            >
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 dark:bg-white/10">
                <span className="text-xs font-medium text-white dark:text-gray-200">
                  {part.name}
                </span>
              </div>

              {index === currentIndex && (
                <div className="absolute top-0 right-0 h-full w-1 bg-white animate-pulse"></div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
        <span>0:00</span>
        {parts.map((_, index) => {
          if (index === 0 || index === parts.length - 1) return null;

          const timeBeforeMarker = parts
            .slice(0, index + 1)
            .reduce((sum, part) => sum + part.duration, 0);

          return (
            <span key={index} className="text-center">
              {formatDuration(timeBeforeMarker)}
            </span>
          );
        })}
        <span>{formatDuration(totalDuration)}</span>
      </div>
    </div>
  );
};

// Helper function
const formatDuration = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default Timeline;
