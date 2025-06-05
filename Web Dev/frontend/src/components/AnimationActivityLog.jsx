import React from "react";

function AnimationActivityLog({ log }) {
  return (
    <div className="bg-gray-700/30 border border-white/10 rounded-xl p-6 mt-auto flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <i className="fas fa-terminal"></i>
        <h4 className="text-lg font-semibold text-gray-100">Activity Log</h4>
      </div>
      <div className="bg-gray-800/70 px-5 py-3 rounded-lg min-h-[46px] flex items-center text-base text-gray-100 border border-white/10 shadow-inner">
        <div className="w-full transition-all">{log}</div>
      </div>
    </div>
  );
}

export default AnimationActivityLog;