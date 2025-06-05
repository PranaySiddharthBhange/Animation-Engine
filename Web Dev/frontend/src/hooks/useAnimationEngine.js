import { useState } from "react";

export function useAnimationEngine() {
  const [fragmentCount, setFragmentCount] = useState("Loading fragments...");
  const [aiProgress, setAiProgress] = useState(0);
  const [log, setLog] = useState("System initialized. Ready to generate animations.");

  const autoAnimateWithGemini = () => setLog("Generating animation sequence with Gemini AI...");
  const stopAnimations = () => setLog("Animation stopped");
  const resetAllFragments = () => setLog("Reset all fragments to original state");

  return {
    fragmentCount,
    setFragmentCount,
    aiProgress,
    setAiProgress,
    log,
    setLog,
    autoAnimateWithGemini,
    stopAnimations,
    resetAllFragments,
  };
}