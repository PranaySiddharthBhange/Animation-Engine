import { useState } from "react";

export function useVideoExport(setLog) {
  const [videoModal, setVideoModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [downloadReady, setDownloadReady] = useState(false);

  const showExportModal = () => setVideoModal(true);
  const closeExportModal = () => setVideoModal(false);

  const startVideoExport = () => {
    setLog && setLog("Starting video export...");
    setTimeout(() => {
      setVideoUrl("https://www.w3schools.com/html/mov_bbb.mp4");
      setDownloadReady(true);
      setLog && setLog("Video export completed! Ready for download.");
    }, 1500);
  };

  const downloadVideo = () => setLog && setLog("Downloading video...");

  return {
    videoModal,
    setVideoModal,
    videoUrl,
    setVideoUrl,
    downloadReady,
    setDownloadReady,
    showExportModal,
    closeExportModal,
    startVideoExport,
    downloadVideo,
  };
}