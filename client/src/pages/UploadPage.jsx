import { useState } from "react";
import { API_BASE_URL } from "../utils/storageManager";
import { FileArchive, Upload, AlertCircle } from "lucide-react";
import { storageManager } from "../utils/storageManager";
const UploadPage = ({ onProcessingStart }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target?.files?.[0];
    if (!selectedFile) return;

    const isZip = selectedFile.type === 'application/zip' ||
      selectedFile.name.toLowerCase().endsWith('.zip');

    if (isZip) {
      setFile(selectedFile);
      setError('');
    } else {
      setFile(null);
      setError('Please select a valid ZIP file.');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('zipfile', file);

      const response = await fetch(`${API_BASE_URL}/process`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const { sessionId } = await response.json();
      storageManager.set({ sessionId, status: 'processing' });
      onProcessingStart(sessionId);
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <FileArchive className="mx-auto h-16 w-16 text-indigo-600 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload ZIP File</h1>
          <p className="text-gray-600">Select a ZIP file to process</p>
        </div>

        <div className="space-y-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
            <input
              type="file"
              accept=".zip"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <div className="text-sm text-gray-600">
                {file ? (
                  <span className="font-medium text-indigo-600">{file.name}</span>
                ) : (
                  <>
                    <span className="font-medium">Click to upload</span> or drag and drop
                    <br />
                    ZIP files only
                  </>
                )}
              </div>
            </label>
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-red-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? 'Uploading...' : 'Upload & Process'}
          </button>
        </div>
      </div>
    </div>
  );
};
export default UploadPage;