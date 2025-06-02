
// Toggle sidebar on mobile
document.getElementById('sidebarToggle').addEventListener('click', function () {
    document.getElementById('dashboard').classList.toggle('active');
    this.classList.toggle('active');
});

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', function () {
    // Ensure dashboard is visible
    const dashboard = document.getElementById('dashboard');
    dashboard.style.display = 'block';
    dashboard.style.visibility = 'visible';

    // Fragment count element
    const countEl = document.getElementById('fragmentCount');
    countEl.textContent = 'Loading fragments...';
});

// --- Autodesk Viewer Setup ---
const options = {
    env: 'AutodeskProduction',
    accessToken: 'eyJhbGciOiJSUzI1NiIsImtpZCI6ImI4YjJkMzNhLTFlOTYtNDYwNS1iMWE4LTgwYjRhNWE4YjNlNyIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJodHRwczovL2F1dG9kZXNrLmNvbSIsImNsaWVudF9pZCI6IldBMkt6OTF4VlVmQXBJR1lteWg4dkFGM1lVbENRb3FCV3k5SHVrOXoyUkxtcEI5YiIsInNjb3BlIjpbImRhdGE6d3JpdGUiLCJkYXRhOnJlYWQiLCJidWNrZXQ6Y3JlYXRlIiwiYnVja2V0OmRlbGV0ZSJdLCJpc3MiOiJodHRwczovL2RldmVsb3Blci5hcGkuYXV0b2Rlc2suY29tIiwiZXhwIjoxNzQ4ODY2OTMzLCJqdGkiOiJBVC1jMjExZDUxMi0zMjM2LTQ3YTYtYTI3MC1kZDQxZWNjMTRiZWIifQ.CjotX9JnL3c7gTr5HrhX7RFJDHBODeU654phmcN-NhDN6DKwpzKrsp5cCmx-_E7guEv3Wey242S70rx4lONAo42C1VBnRzi43sjCQwxAcxwZBx6SO2lTskFupPEKFaVidaj16kyLGYFn0bQOPhpSMp8pryYr307sMX6-_aeLsmQzeeCxnOunNfWWUlZfwIhlovNC8LgRXjfLYQTQhz5o6-AhASwg4p8c6YALxPI-VPPY0WSsCnc0TeK7OCthNOIxvNFQU9sO2t4CZf-gCd4uwRBEVg6dSOC67cPY6NHt5L8bqkkNtUniGIdVGLPxQKCmH0D805dpodFdw9g2ROeIaA'
};
const documentId = 'urn:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6bmV3ZXN0YnVja2V0L0Fzc2VtYmx5MS5pYW0';

let viewer;
let fragmentToDbIdMap = {};
let animationQueue = [];
let activeAnimations = {};
let isAnimating = false;
let savedState = null;
let lastAnimationCommands = [];
let recordedChunks = [];
let mediaRecorder;
let recordedVideoUrl = null;

Autodesk.Viewing.Initializer(options, () => {
    viewer = new Autodesk.Viewing.GuiViewer3D(document.getElementById('viewer'));
    viewer.start();
    viewer.setTheme('dark-theme');
    Autodesk.Viewing.Document.load(documentId, onDocumentLoadSuccess, onDocumentLoadFailure);
});

function onDocumentLoadSuccess(doc) {
    const viewable = doc.getRoot().getDefaultGeometry();
    viewer.loadDocumentNode(doc, viewable).then(() => {
        logToConsole("Model loaded successfully");
        document.querySelector('.viewer-overlay span').textContent = "Model loaded successfully";
        viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, () => {
            logToConsole("Geometry loaded");
            populateFragmentCount();
        });
    });
}

function onDocumentLoadFailure(code, message) {
    logToConsole(`Could not load document (${code}): ${message}`, true);
    document.querySelector('.viewer-overlay span').textContent = "Failed to load model";
}

function logToConsole(message, isError = false) {
    const logOutput = document.getElementById("logOutput");
    logOutput.innerHTML = `<div class="log-entry">[${new Date().toLocaleTimeString()}] ${message}</div>`;
    logOutput.style.color = isError ? "#ef4444" : "#10b981";
}

function resetAllFragments() {
    const tree = viewer.model.getInstanceTree();
    if (!tree) {
        logToConsole("Instance tree not loaded", true);
        return;
    }

    tree.enumNodeChildren(tree.getRootId(), function (dbId) {
        // Reset transformations
        const fragIds = [];
        tree.enumNodeFragments(dbId, function (fragId) {
            fragIds.push(fragId);
        });

        fragIds.forEach(fragId => {
            const fragProxy = viewer.impl.getFragmentProxy(viewer.model, fragId);
            if (fragProxy) {
                fragProxy.getAnimTransform();
                fragProxy.scale.set(1, 1, 1);
                fragProxy.position.set(0, 0, 0);
                fragProxy.quaternion.set(0, 0, 0, 1);
                fragProxy.updateAnimTransform();
            }
        });
    }, true);

    viewer.impl.invalidate(true);
    logToConsole("Reset all fragments to original state");
}

function populateFragmentCount() {
    const tree = viewer.model.getInstanceTree();
    if (!tree) {
        logToConsole("Instance tree not loaded", true);
        return;
    }

    let fragmentCount = 0;
    tree.enumNodeChildren(tree.getRootId(), function (dbId) {
        tree.enumNodeFragments(dbId, function (fragId) {
            fragmentCount++;
        });
    }, true);

    // Update fragment info
    document.getElementById('fragmentCount').textContent = `${fragmentCount} fragments`;
    logToConsole(`Loaded ${fragmentCount} fragments`);
}

// Easing functions for smooth animations
const easingFunctions = {
    linear: t => t,
    easeIn: t => t * t,
    easeOut: t => t * (2 - t),
    easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    bounce: t => {
        if (t < 1 / 2.75) {
            return 7.5625 * t * t;
        } else if (t < 2 / 2.75) {
            return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
        } else if (t < 2.5 / 2.75) {
            return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
        } else {
            return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
        }
    }
};

// --- Enhanced Gemini Integration for Smooth Animation ---
async function getGeminiAnimationCommands() {
    const apiKey = 'AIzaSyDhUtvjS8lgDcsWH85lDC8pnMdeSce9cok';
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;

    // Create a description of available fragments
    const fragmentDescriptions = [];
    const tree = viewer.model.getInstanceTree();
    tree.enumNodeChildren(tree.getRootId(), function (dbId) {
        const name = tree.getNodeName(dbId);
        tree.enumNodeFragments(dbId, function (fragId) {
            fragmentDescriptions.push({
                fragmentId: fragId,
                dbId: dbId,
                name: name
            });
        });
    }, true);

    const prompt =
        `You are an expert 3D animation assistant for Autodesk Forge models. 
Generate a sequence of animation commands for the following fragments that will create a logical, visually appealing animation.

Available fragments (fragmentId: name):
${fragmentDescriptions.map(f => `- ${f.fragmentId}: ${f.name}`).join('\n')}

Command format (JSON array of objects):
[
  {
    "fragmentId": <number>,
    "action": "rotate" | "scale" | "translate",
    "params": {
      // For "rotate": "axis" ("x","y","z"), "angle": <degrees>
      // For "scale": "factor": <number>
      // For "translate": "x": <number>, "y": <number>, "z": <number>
    }
  },
  // ... more commands
]

Guidelines:
1. Create a logical animation sequence (e.g., parts moving together, mechanical movements)
2. Use a variety of actions across multiple fragments
3. Rotations: Use angles between 10-180 degrees, any axis
4. Scaling: Use factors between 0.5-2.0
5. Translations: Keep movements reasonable (0-50 units)
6. Include atlest 8-12 commands in the sequence

Generate only the JSON array with no additional text.`;

    const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000
        }
    };

    logToConsole("Generating animation sequence with Gemini AI");
    document.getElementById('autoAnimateBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    document.getElementById('autoAnimateBtn').classList.add('shimmer');

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await res.json();
        let text = data.candidates[0].content.parts[0].text.trim();

        // Clean up the response
        if (text.startsWith("```json")) {
            text = text.substring(7, text.length - 3).trim();
        } else if (text.startsWith("```")) {
            text = text.substring(3, text.length - 3).trim();
        }
        logToConsole(text);
        if (!text) {
            logToConsole("No commands generated by Gemini", true);
            return [];
        }


        return JSON.parse(text);


    } catch (e) {
        logToConsole(`Gemini response error: ${e}`, true);
        return [];
    } finally {
        document.getElementById('autoAnimateBtn').innerHTML = '<i class="fas fa-play"></i> Generate & Animate';
        document.getElementById('autoAnimateBtn').classList.remove('shimmer');
    }
}

// Execute a single animation command with smooth transition
function executeSmoothAnimation(cmd) {
    return new Promise((resolve) => {
        const fragId = cmd.fragmentId;
        const model = viewer.model;
        const fragProxy = viewer.impl.getFragmentProxy(model, parseInt(fragId));

        if (!fragProxy) {
            logToConsole(`Fragment ${fragId} not found`, true);
            resolve();
            return;
        }

        // Get original state
        fragProxy.getAnimTransform();
        const originalPosition = new THREE.Vector3().copy(fragProxy.position);
        const originalScale = new THREE.Vector3().copy(fragProxy.scale);
        const originalQuaternion = new THREE.Quaternion().copy(fragProxy.quaternion);

        // Calculate target state
        let targetPosition, targetScale, targetQuaternion;

        switch (cmd.action) {
            case "rotate":
                const axisVal = cmd.params.axis || 'z';
                let axis;
                if (axisVal === "x") axis = new THREE.Vector3(1, 0, 0);
                else if (axisVal === "y") axis = new THREE.Vector3(0, 1, 0);
                else axis = new THREE.Vector3(0, 0, 1);

                const angleDeg = cmd.params.angle || 45;
                const angleRad = angleDeg * Math.PI / 180;

                targetQuaternion = new THREE.Quaternion().setFromAxisAngle(axis, angleRad);
                targetQuaternion.multiply(originalQuaternion);
                targetPosition = originalPosition.clone();
                targetScale = originalScale.clone();
                break;

            case "scale":
                const factor = cmd.params.factor || 1.5;
                targetScale = new THREE.Vector3(
                    originalScale.x * factor,
                    originalScale.y * factor,
                    originalScale.z * factor
                );
                targetPosition = originalPosition.clone();
                targetQuaternion = originalQuaternion.clone();
                break;

            case "translate":
                targetPosition = new THREE.Vector3(
                    originalPosition.x + (cmd.params.x || 0),
                    originalPosition.y + (cmd.params.y || 0),
                    originalPosition.z + (cmd.params.z || 0)
                );
                targetScale = originalScale.clone();
                targetQuaternion = originalQuaternion.clone();
                break;
        }

        // Animation parameters
        const duration = parseInt(document.getElementById("animationDuration").value) || 1000;
        const easingType = document.getElementById("easingType").value;
        const startTime = performance.now();
        const endTime = startTime + duration;

        // Create animation ID
        const animId = `frag-${fragId}-${Date.now()}`;
        activeAnimations[animId] = true;

        // Animation update function
        function animate(currentTime) {
            if (!activeAnimations[animId]) {
                resolve();
                return;
            }

            // Calculate progress (0 to 1)
            let progress = (currentTime - startTime) / duration;
            if (progress > 1) progress = 1;

            // Apply easing
            const easeFunc = easingFunctions[easingType] || easingFunctions.linear;
            const easedProgress = easeFunc(progress);

            // Apply transformations
            switch (cmd.action) {
                case "rotate":
                    fragProxy.quaternion.slerpQuaternions(
                        originalQuaternion,
                        targetQuaternion,
                        easedProgress
                    );
                    break;

                case "scale":
                    fragProxy.scale.lerpVectors(
                        originalScale,
                        targetScale,
                        easedProgress
                    );
                    break;

                case "translate":
                    fragProxy.position.lerpVectors(
                        originalPosition,
                        targetPosition,
                        easedProgress
                    );
                    break;
            }

            fragProxy.updateAnimTransform();
            viewer.impl.invalidate(true);

            // Update progress bar
            document.getElementById('aiProgressBar').style.width = `${progress * 100}%`;

            // Continue animation if not finished
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                delete activeAnimations[animId];
                resolve();
            }
        }

        // Start animation
        requestAnimationFrame(animate);
    });
}

// Execute the animation queue
async function executeAnimationQueue(commands) {
    if (isAnimating) return;

    isAnimating = true;
    document.getElementById('aiProgressBar').style.width = '0%';

    try {
        for (let i = 0; i < commands.length; i++) {
            if (!isAnimating) break;

            const cmd = commands[i];
            logToConsole(`Executing: ${cmd.action} on fragment ${cmd.fragmentId}`);

            await executeSmoothAnimation(cmd);
        }

        logToConsole("Animation sequence completed");
    } catch (e) {
        logToConsole(`Animation error: ${e}`, true);
    } finally {
        isAnimating = false;
        document.getElementById('autoAnimateBtn').innerHTML = '<i class="fas fa-play"></i> Generate & Animate';
    }
}

async function autoAnimateWithGemini() {
    if (isAnimating) {
        stopAnimations();
        return;
    }

    document.getElementById('autoAnimateBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing...';

    const commands = await getGeminiAnimationCommands();
    if (commands.length === 0) {
        logToConsole("No animation commands received", true);
        return;
    }

    // Store commands for video export
    lastAnimationCommands = commands;

    logToConsole(`Starting animation sequence with ${commands.length} commands`);
    document.getElementById('autoAnimateBtn').innerHTML = '<i class="fas fa-stop"></i> Stop Animation';

    executeAnimationQueue(commands);
}

function stopAnimations() {
    isAnimating = false;
    activeAnimations = {};
    logToConsole("Animation stopped");
    document.getElementById('aiProgressBar').style.width = '0%';
    document.getElementById('autoAnimateBtn').innerHTML = '<i class="fas fa-play"></i> Generate & Animate';
}

// Video Export Functions
function showExportModal() {
    document.getElementById('videoModal').classList.add('active');
    document.getElementById('downloadContainer').style.display = 'none';
    document.getElementById('videoPreview').src = '';
}

function closeExportModal() {
    document.getElementById('videoModal').classList.remove('active');
}

function startVideoExport() {
    const quality = document.getElementById('videoQuality').value;
    const animationDuration = parseInt(document.getElementById("animationDuration").value) || 1000;

    // Calculate total animation time in seconds
    const totalSeconds = lastAnimationCommands.length * (animationDuration / 1000);

    logToConsole(`Starting video export: ${quality} quality, ${totalSeconds.toFixed(1)}s`);

    // Reset progress bar
    const progressBar = document.getElementById('exportProgressBar');
    progressBar.style.width = '0%';

    // Hide download button until ready
    document.getElementById('downloadContainer').style.display = 'none';

    // Capture the viewer canvas
    const canvas = viewer.impl.canvas;

    // Set up media recorder
    recordedChunks = [];

    try {
        const fps = 30; // Fixed frame rate
        const stream = canvas.captureStream(fps);
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: quality === 'high' ? 5000000 :
                quality === 'medium' ? 2500000 : 1000000
        });

        mediaRecorder.ondataavailable = function (e) {
            if (e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        };

        mediaRecorder.onstop = function () {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            recordedVideoUrl = URL.createObjectURL(blob);

            // Show the preview
            const videoPreview = document.getElementById('videoPreview');
            videoPreview.src = recordedVideoUrl;

            // Show download button
            document.getElementById('downloadContainer').style.display = 'block';
            logToConsole("Video export completed! Ready for download.");
        };

        // Start recording
        mediaRecorder.start();

        // Reset the model
        resetAllFragments();

        // Start animation after a short delay
        setTimeout(() => {
            if (lastAnimationCommands.length > 0) {
                // Execute animation for recording
                executeAnimationQueue(lastAnimationCommands);

                // Set timer to stop recording
                setTimeout(() => {
                    if (mediaRecorder && mediaRecorder.state === 'recording') {
                        mediaRecorder.stop();
                    }
                }, totalSeconds * 1000);

                // Update progress bar
                let progress = 0;
                const interval = setInterval(() => {
                    progress += 5;
                    if (progress > 100) {
                        clearInterval(interval);
                    } else {
                        progressBar.style.width = `${progress}%`;
                    }
                }, (totalSeconds * 1000) / 20);

            } else {
                logToConsole("No animation commands available", true);
                mediaRecorder.stop();
            }
        }, 500);

    } catch (e) {
        logToConsole(`Video export error: ${e}`, true);
    }
}

function downloadVideo() {
    if (recordedVideoUrl) {
        const a = document.createElement('a');
        a.href = recordedVideoUrl;
        a.download = 'ai-animation-export.webm';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}
