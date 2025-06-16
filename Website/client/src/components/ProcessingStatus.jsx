const ProcessingStatus = ({ message, progress }) => (
  <div className="space-y-6">
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">Progress</span>
        <span className="text-sm font-medium text-indigo-600">{progress}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className="bg-indigo-600 h-3 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>

    <div className="text-center">
      <p className="text-gray-700 font-medium">{message}</p>
    </div>
  </div>
);
export default ProcessingStatus;