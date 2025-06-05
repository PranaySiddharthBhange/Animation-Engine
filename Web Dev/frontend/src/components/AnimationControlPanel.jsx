function AnimationControlPanel({
  aiProgress,
  autoAnimateWithGemini,
  stopAnimations,
  resetAllFragments,
  showExportModal
}) {
  return (
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
  );
}

export default AnimationControlPanel;