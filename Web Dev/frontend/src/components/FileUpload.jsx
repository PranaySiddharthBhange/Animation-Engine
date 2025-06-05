import React from 'react'
import { useFileUpload } from "../hooks/useFileUpload";
import { useSessionStatus } from "../hooks/useSessionStatus";
import { useGenerateAnimation } from "../hooks/useGenerateAnimation";

function FileUpload() {
  const { file, onFileChange, uploading, error, uploadFile, sessionId } = useFileUpload();
  const { status } = useSessionStatus(sessionId);
  const { loading, commands, error: genError, generate } = useGenerateAnimation();

  return (
    <div className=" flex items-center justify-center flex-col gap-4 bg-slate-800 text-white p-4 h-screen w-full">
      <h1 className='text-3xl font-semibold'>
        File Upload
      </h1>
      <p>
        Upload your files and we'll generate beautiful animations for your assembly real quick.
      </p>
      <input type="file" accept=".zip" onChange={onFileChange} />
      <button 
        className='mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600'
        onClick={uploadFile} disabled={uploading || !file}>
          {uploading ? "Uploading..." : "Upload"}
      </button>
      {error && <div className="text-red-500">{error}</div>}
      {sessionId && (
        <div>
          <div>Status: {status?.status} - {status?.message}</div>
          <button onClick={() => generate(sessionId)} disabled={loading}>
            {loading ? "Generating..." : "Generate Animation"}
          </button>
        </div>
      )}
      {commands && (
        <pre className="bg-gray-900 text-white p-4 rounded mt-4 overflow-x-auto">
          {JSON.stringify(commands, null, 2)}
        </pre>
      )}
      {genError && <div className="text-red-500">{genError}</div>}
    </div>
  )
}

export default FileUpload
