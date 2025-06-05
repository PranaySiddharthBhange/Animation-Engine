// AnimationEngine.jsx
import React, { useState } from "react";

export default function AnimationEngine() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fragmentCount, setFragmentCount] = useState("Loading fragments...");
  const [aiProgress, setAiProgress] = useState(0);
  const [log, setLog] = useState("System initialized. Ready to generate animations.");
  const [videoModal, setVideoModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [downloadReady, setDownloadReady] = useState(false);

  // Placeholder handlers
  const autoAnimateWithGemini = () => setLog("Generating animation sequence with Gemini AI...");
  const stopAnimations = () => setLog("Animation stopped");
  const resetAllFragments = () => setLog("Reset all fragments to original state");
  const showExportModal = () => setVideoModal(true);
  const closeExportModal = () => setVideoModal(false);
  const startVideoExport = () => {
    setLog("Starting video export...");
    setTimeout(() => {
      setVideoUrl("https://www.w3schools.com/html/mov_bbb.mp4");
      setDownloadReady(true);
      setLog("Video export completed! Ready for download.");
    }, 1500);
  };
  const downloadVideo = () => setLog("Downloading video...");

  return (
    <div className="flex w-full min-h-screen relative bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100 font-sans overflow-hidden">
      {/* Dashboard */}
      <div
        className={`transition-all duration-300 z-20 flex flex-col bg-gradient-to-br from-gray-800/95 to-gray-900/98 shadow-xl border-r border-white/10 backdrop-blur-lg h-full p-7 w-[420px] max-w-full ${
          sidebarOpen ? "left-0 absolute" : "lg:relative"
        }`}
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
        <div className="bg-white/5 border border-white/10 rounded-2xl p-7 mb-7 shadow transition-all hover:-translate-y-1 hover:shadow-2xl backdrop-blur">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-[42px] h-[42px] rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-lg">
              <i className="fas fa-bolt"></i>
            </div>
            <h3 className="text-xl font-bold text-gray-100">AI-Powered Animation</h3>
          </div>
          <p className="text-gray-400 mb-5 text-sm leading-relaxed">
            Generate logical animations using AI with smooth transitions
          </p>
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={autoAnimateWithGemini}
              className="flex-1 min-w-[160px] min-h-[58px] px-6 py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-3 bg-gradient-to-br from-emerald-600 to-cyan-500 text-white shadow hover:-translate-y-1 transition-all pulse"
            >
              <i className="fas fa-play"></i> Generate & Animate
            </button>
            <button
              onClick={stopAnimations}
              className="flex-1 min-w-[160px] min-h-[58px] px-6 py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-3 bg-gradient-to-br from-red-600 to-orange-400 text-white shadow hover:-translate-y-1 transition-all"
            >
              <i className="fas fa-stop"></i> Stop
            </button>
          </div>
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={resetAllFragments}
              className="flex-1 min-w-[160px] min-h-[58px] px-6 py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-3 bg-gradient-to-br from-gray-600 to-gray-700 text-white shadow hover:-translate-y-1 transition-all"
            >
              <i className="fas fa-undo"></i> Reset Model
            </button>
            <button
              onClick={showExportModal}
              className="flex-1 min-w-[160px] min-h-[58px] px-6 py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-3 bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow hover:-translate-y-1 transition-all"
            >
              <i className="fas fa-video"></i> Export as Video
            </button>
          </div>
          <div className="flex gap-3 items-center mt-5 p-5 bg-gray-700/30 rounded-xl border border-white/10">
            <div className="flex-1">
              <label className="block mb-2 text-gray-200 text-sm font-medium">Duration (ms)</label>
              <input
                type="number"
                className="w-full bg-gray-800/70 border border-white/10 rounded-lg px-4 py-3 text-gray-100 text-base focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 transition"
                defaultValue={1000}
                min={100}
                step={100}
              />
            </div>
            <div className="flex-1">
              <label className="block mb-2 text-gray-200 text-sm font-medium">Easing</label>
              <select className="w-full bg-gray-800/70 border border-white/10 rounded-lg px-4 py-3 text-gray-100 text-base focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 transition">
                <option value="easeInOut">Ease In/Out</option>
                <option value="easeIn">Ease In</option>
                <option value="easeOut">Ease Out</option>
                <option value="linear">Linear</option>
                <option value="bounce">Bounce</option>
              </select>
            </div>
          </div>
          <div className="w-full h-2 bg-gray-700/50 rounded mt-6 overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded transition-all"
              style={{ width: `${aiProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Status/Log */}
        <div className="bg-gray-700/30 border border-white/10 rounded-xl p-6 mt-auto flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <i className="fas fa-terminal"></i>
            <h4 className="text-lg font-semibold text-gray-100">Activity Log</h4>
          </div>
          <div className="bg-gray-800/70 px-5 py-3 rounded-lg min-h-[46px] flex items-center text-base text-gray-100 border border-white/10 shadow-inner">
            <div className="w-full transition-all">{log}</div>
          </div>
        </div>
      </div>

      {/* Viewer Panel
      <div className="flex-1 h-full min-w-0 m-0 relative flex justify-center items-center bg-gray-900">
        <div className="absolute top-6 left-6 bg-gray-800/90 px-5 py-3 rounded-xl font-medium shadow flex items-center gap-3 text-gray-200 border border-white/10 backdrop-blur z-10">
          <i className="fas fa-cube"></i>
          <span>Autodesk Forge Viewer - Loading model...</span>
        </div>
      </div> */}

      {/* Sidebar Toggle */}
      <button
        className="absolute top-6 right-6 w-11 h-11 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center text-gray-100 text-xl cursor-pointer z-30 shadow hover:bg-indigo-600 hover:text-white transition-all lg:hidden"
        onClick={() => setSidebarOpen((v) => !v)}
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