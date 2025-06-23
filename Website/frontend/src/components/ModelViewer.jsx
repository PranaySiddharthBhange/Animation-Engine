import React, { useRef, useEffect } from "react";

const ModelViewer = ({ onViewerInitialized }) => {
    const viewerContainer = useRef(null);

    useEffect(() => {
        const data = JSON.parse(localStorage.getItem("data") || "{}");
        const accessToken = data.accessToken;
        const encodedUrn = data.encodedUrn;

        if (!accessToken || !encodedUrn) {
            console.error("Missing access token or URN.");
            return;
        }

        let viewer;
        let initialized = false;

        const initializeViewer = () => {
            if (initialized) return;
            initialized = true;

            const options = {
                env: "AutodeskProduction",
                accessToken,
                api: "derivativeV2",
            };

            window.Autodesk.Viewing.Initializer(options, () => {
                viewer = new window.Autodesk.Viewing.GuiViewer3D(viewerContainer.current);
                viewer.start();

                if (onViewerInitialized) {
                    onViewerInitialized(viewer);
                }

                const documentId = `urn:${encodedUrn}`;
                window.Autodesk.Viewing.Document.load(
                    documentId,
                    (doc) => {
                        const viewable = doc.getRoot().getDefaultGeometry();
                        if (viewable) {
                            viewer.loadDocumentNode(doc, viewable);
                        } else {
                            console.error("No viewable geometry found.");
                        }
                    },
                    (err) => console.error("Document load error:", err)
                );
            });
        };

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            const { width, height } = entry.contentRect;

            if (width > 0 && height > 0) {
                observer.disconnect(); // Only initialize once
                initializeViewer();
            }
        });

        if (viewerContainer.current) {
            observer.observe(viewerContainer.current);
        }

        return () => {
            if (viewer) viewer.finish();
            observer.disconnect();
        };
    }, [onViewerInitialized]);

    return (
        <div
            ref={viewerContainer}
            className="viewer-container"
        />
    );
};

export default ModelViewer;
