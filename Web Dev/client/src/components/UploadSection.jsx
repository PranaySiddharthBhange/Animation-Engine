

import { useRef } from 'react';
import { Upload, Sparkles } from 'lucide-react';



const UploadSection = ({ 
  onUpload, 
  onGenerate, 
  hasUploaded,
  isGenerating
}) => {
  const fileInputRef = useRef(null);

  const handleButtonClick = () => {
    if (!hasUploaded) {
      fileInputRef.current?.click();
    } else {
      onGenerate();
    }
  };


  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] bg-gradient-to-b from-indigo-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-lg p-8 shadow-sm">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold mb-2 text-indigo-600 dark:text-indigo-400">Animation Generator</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Upload your files and we'll generate beautiful animations for you.
        </p>
        
        <div className="mb-8 flex justify-center">

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => onUpload(e.target.files)}
            className="hidden"
          />
          
          <button
            onClick={handleButtonClick}
            disabled={isGenerating}
            className={`
              flex items-center justify-center space-x-2
              px-6 py-3 rounded-lg font-medium transition-all duration-200
              ${hasUploaded
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                : 'bg-white hover:bg-gray-50 text-indigo-600 border-2 border-indigo-200 hover:border-indigo-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-indigo-300 dark:border-indigo-700'}
              ${isGenerating ? 'opacity-70 cursor-not-allowed' : ''}
              shadow-md hover:shadow-lg
            `}
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Generating...</span>
              </>
            ) : (
              <>
                {hasUploaded ? (
                  <>
                    <Sparkles size={20} />
                    <span>Generate Animation</span>
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    <span>Upload Files</span>
                  </>
                )}
              </>
            )}
          </button>
        </div>
        
        {hasUploaded && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg transition-all animate-fadeIn">
            <p className="font-medium">Files uploaded successfully!</p>
            <p className="text-sm">Click "Generate Animation" to proceed.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadSection;


