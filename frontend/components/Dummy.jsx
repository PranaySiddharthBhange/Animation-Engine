import React from "react";

const App = () => {
  return (
    <div className="flex h-screen bg-black text-white font-sans">
      {/* Sidebar - DO NOT CHANGE */}
      <div className="w-1/3 p-4 border-r border-white flex flex-col">
        {/* Title */}
        <div className="text-center border border-white p-3 mb-4">
          <h1 className="text-3xl font-bold">Animation Engine</h1>
        </div>

        {/* Dropdown & Play button */}
        <div className="flex items-center gap-2 mb-4">
          <select className="w-2/3 px-3 py-2 bg-black border border-white rounded h-10">
            <option>Select a sequence</option>
          </select>
          <button className="w-1/3 h-10 px-4 border border-white rounded text-sm font-medium">
            Play &gt;
          </button>
        </div>

        {/* Table and button */}
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 border border-white rounded-xl overflow-y-auto p-2 mb-2">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="border border-white h-10 mb-2 last:mb-0"></div>
            ))}
          </div>
          <button className="h-10 w-full border border-white rounded text-sm font-medium">
            New Action
          </button>
        </div>
      </div>

      {/* Right Section */}
      <div className="w-2/3 p-4 flex flex-col">
        {/* Video Screen (no size change) */}
        <div className="flex-1 border border-white mb-4 flex items-center justify-center">
          <span className="text-gray-500 text-sm text-center">
            video screen<br />(do not change dimensions that we are using right now)
          </span>
        </div>

        {/* Row 1: Speed + Animation (taking full width and equal height) */}
        <div className="flex justify-between items-center gap-4 mb-4">
          {/* Speed Button Group */}
          <div className="flex items-center gap-2 border border-white px-4 rounded flex-1 h-10">
            <span className="text-sm">Speed</span>
            <button className="px-2 border border-white rounded h-full">1.1 x</button> {/* h-full to fill parent div */}
          </div>
          {/* Animation Button */}
          <button className="px-4 border border-white rounded flex-1 h-10">Animation : Ease in</button>
        </div>

        {/* Row 2: Buttons (equal height) */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <button className="border border-white px-2 rounded text-sm h-10">Regenerate with AI</button>
          <div className="flex gap-4">
            <button className="border border-white px-2 rounded text-sm flex-1 h-10">Stop generating</button>
            <button className="border border-white px-2 rounded text-sm flex-1 h-10">Continue generating</button>
            <button className="border border-white px-2 rounded text-sm flex-1 h-10">Reset</button>
          </div>
        </div>

        {/* Row 3: Export Button (equal height) */}
        <div className="flex justify-center">
          <button className="w-full border border-white rounded text-sm h-10">Export as video</button>
        </div>
      </div>
    </div>
  );
};

export default App;