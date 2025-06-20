import React, { useState, useRef, useCallback } from 'react';
import ModelViewer from './components/ModelViewer.jsx';
import Dashboard from './components/Dashboard.jsx';
import './App.css';

const App = () => {
    const [viewer, setViewer] = useState(null);
    const viewerRef = useRef();

    const handleViewerInitialized = useCallback((viewerInstance) => {
        viewerRef.current = viewerInstance;
        setViewer(viewerInstance);
    }, []);

    return (
        <div className="flex h-screen justify-around items-center bg-blue-300 border-2 border-red-500">
            <div className="w-1/3 bg-blue-500 flex items-center justify-center h-full">
                <Dashboard viewer={viewer} />
            </div>
            <div className='bg-red-500 w-full h-full flex flex-col justify-between'>
                <div className='bg-green-500 h-full flex flex-col'>
                    <div className='bg-yellow-500 h-1/4'>Viewer</div>
                    <div className='h-full'>
                        <ModelViewer onViewerInitialized={handleViewerInitialized} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;