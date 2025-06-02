import { useState } from 'react';
import UploadSection from './UploadSection';
import DashboardViewer from './DashboardViewer';

const AnimationWorkspace = () => {
  const [hasUploaded, setHasUploaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentSequence, setCurrentSequence] = useState(null);
  const [sequences, setSequences] = useState([]);


  const handleUpload = async (files) => {
    if (!files || files.length === 0) return;
  
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });
  
    try {
      const response = await fetch("http://localhost:3001/upload", {
        method: "POST",
        body: formData,
      });
  
      if (response.ok) {
        console.log("✅ Files uploaded successfully");
        setHasUploaded(true);
      } else {
        console.error("❌ Upload failed");
      }
    } catch (error) {
      console.error("🚨 Error uploading files:", error);
    }
  };
  
  const handleGenerate = () => {
    setIsGenerating(true);

    setTimeout(() => {
      const newSequence = {
        id: `seq-${sequences.length + 1}`,
        name: `Sequence ${sequences.length + 1}`,
        createdAt: new Date().toISOString(),
        parts: Array(5).fill(0).map((_, i) => ({
          id: `part-${i + 1}`,
          name: `Part ${i + 1}`,
          duration: Math.floor(Math.random() * 5) + 2,
          thumbnail: `https://picsum.photos/seed/${i + 1}/300/200`,
        })),
      };

      setSequences((prev) => [...prev, newSequence]);
      setCurrentSequence(newSequence);
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-gradient-to-b from-indigo-100 to-white dark:from-gray-700 dark:to-gray-900">
      {!currentSequence ? (
        <UploadSection
          onUpload={handleUpload}
          onGenerate={handleGenerate}
          hasUploaded={hasUploaded}
          isGenerating={isGenerating}
        />
      ) : (
        <DashboardViewer />  
      )}
    </div>
  );
};

export default AnimationWorkspace;
