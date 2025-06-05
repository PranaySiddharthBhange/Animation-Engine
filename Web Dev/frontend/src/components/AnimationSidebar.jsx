import React from 'react'
import AnimationControlPanel from './AnimationControlPanel'
import AnimationActivityLog from './AnimationActivityLog'

function AnimationSidebar({
  fragmentCount,
  aiProgress,
  log,
  autoAnimateWithGemini,
  stopAnimations,
  resetAllFragments,
  showExportModal,
  sidebarOpen
}) {
  return (
    <div
      className={`transition-all duration-300 z-20 flex flex-col bg-gradient-to-br from-gray-800/95 to-gray-900/98 shadow-xl border-r border-white/10 backdrop-blur-lg p-7 w-[420px] max-w-full ${
        sidebarOpen ? "left-0 absolute" : "lg:relative"
      } overflow-y-auto h-screen`}
      style={{ minWidth: 320 }}
    >
      {/* Header */}
      <div className="text-center mb-8 pb-6 border-b border-white/10 relative">
        <div className="flex justify-center mb-5">
          <div className="w-[70px] h-[70px] rounded-2xl flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg transition-transform hover:scale-105">
            <i className="fas fa-robot text-white text-3xl"></i>
          </div>
        </div>
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent mb-3 tracking-tight leading-tight">
          AI Animation Engine
        </h1>
        <p className="text-base text-gray-400 max-w-[90%] mx-auto leading-relaxed font-normal">
          Generate and preview smooth animations powered by AI
        </p>
        <div className="flex justify-center items-center gap-2 mt-6">
          <div className="bg-gradient-to-br from-indigo-600/15 to-indigo-400/20 text-gray-50 px-6 py-2 rounded-full text-sm font-semibold inline-flex items-center gap-2 border border-indigo-400/20 backdrop-blur">
            <i className="fas fa-cube"></i>
            <span>{fragmentCount}</span>
          </div>
        </div>
      </div>

      {/* AI Animation Section */}
      <AnimationControlPanel
        aiProgress={aiProgress}
        autoAnimateWithGemini={autoAnimateWithGemini}
        stopAnimations={stopAnimations}
        resetAllFragments={resetAllFragments}
        showExportModal={showExportModal}
      />

      {/* Status/Log */}
      <AnimationActivityLog log={log} />
    </div>
  )
}

export default AnimationSidebar