import { useState } from "react";

export function useFileUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  const onFileChange = (e) => {
    setFile(e.target.files[0]);
    setError(null);
  };

  const uploadFile = async () => {
    if (!file) {
      setError("No file selected");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("zipfile", file);
      const res = await fetch("/process", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.sessionId) {
        setSessionId(data.sessionId);
      } else {
        setError(data.error || "Upload failed");
      }
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return { file, onFileChange, uploading, error, uploadFile, sessionId };
}