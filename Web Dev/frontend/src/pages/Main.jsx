import React from "react";
import AnimationSidebar from "../components/AnimationSidebar";
import AnimationViewer from "../components/AnimationViewer";
import { useSidebar } from "../hooks/useSidebar";
import { useAnimationEngine } from "../hooks/useAnimationEngine";
import { useVideoExport } from "../hooks/useVideoExport";

function Main() {
  const { sidebarOpen, toggleSidebar } = useSidebar();
  const {
    fragmentCount,
    aiProgress,
    log,
    setLog,
    autoAnimateWithGemini,
    stopAnimations,
    resetAllFragments,
  } = useAnimationEngine();
  const {
    videoModal,
    videoUrl,
    downloadReady,
    showExportModal,
    closeExportModal,
    startVideoExport,
    downloadVideo,
  } = useVideoExport(setLog);

  return (
    <div className="flex w-full min-h-screen relative bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100 font-sans">
      {/* Sidebar */}
      <AnimationSidebar
        fragmentCount={fragmentCount}
        aiProgress={aiProgress}
        log={log}
        autoAnimateWithGemini={autoAnimateWithGemini}
        stopAnimations={stopAnimations}
        resetAllFragments={resetAllFragments}
        showExportModal={showExportModal}
        sidebarOpen={sidebarOpen}
      />

      {/* Viewer Panel */}
      <div className="flex-1 h-screen min-w-0 m-0 relative flex justify-center items-center bg-gray-900">
        <AnimationViewer />
      </div>

      {/* Sidebar Toggle */}
      <button
        className="absolute top-6 right-6 w-11 h-11 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center text-gray-100 text-xl cursor-pointer z-30 shadow hover:bg-indigo-600 hover:text-white transition-all lg:hidden"
        onClick={toggleSidebar}
      >
        <i className="fas fa-bars"></i>
      </button>

      {/* Video Export Modal */}
      {videoModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[10000] transition-all">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 w-[90%] max-w-lg shadow-2xl border border-white/10 transform transition-all">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Export Animation as Video
              </h3>
              <button
                className="text-2xl text-gray-400 hover:text-white transition-transform hover:rotate-90"
                onClick={closeExportModal}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="mb-4">
              <label className="block mb-2 text-gray-200 text-sm font-medium">Video Quality</label>
              <select className="w-full bg-gray-800/70 border border-white/10 rounded-lg px-4 py-3 text-gray-100 text-base focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 transition">
                <option value="high">High (1080p)</option>
                <option value="medium" selected>
                  Medium (720p)
                </option>
                <option value="low">Low (480p)</option>
              </select>
            </div>
            <div className="bg-gray-700/50 h-2 rounded mb-5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded transition-all w-0"></div>
            </div>
            <div className="mt-5 text-center">
              <video
                className="w-full rounded-lg border border-white/10 bg-gray-900 aspect-video"
                controls
                src={videoUrl}
              ></video>
            </div>
            {downloadReady && (
              <div className="mt-5 text-center">
                <button
                  className="bg-gradient-to-br from-emerald-600 to-cyan-500 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 mx-auto shadow hover:-translate-y-1 transition-all"
                  onClick={downloadVideo}
                >
                  <i className="fas fa-download"></i> Download Video
                </button>
              </div>
            )}
            <div className="flex gap-4 mt-7">
              <button
                className="flex-1 py-3 rounded-lg bg-gray-700/70 text-gray-100 border border-white/10 font-semibold hover:-translate-y-1 transition-all"
                onClick={closeExportModal}
              >
                Cancel
              </button>
              <button
                className="flex-1 py-3 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-semibold flex items-center justify-center gap-2 hover:-translate-y-1 transition-all"
                onClick={startVideoExport}
              >
                <i className="fas fa-download"></i> Export Video
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Main;