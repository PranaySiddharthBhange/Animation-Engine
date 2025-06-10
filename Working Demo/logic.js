
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
    accessToken: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IlhrUFpfSmhoXzlTYzNZS01oRERBZFBWeFowOF9SUzI1NiIsInBpLmF0bSI6ImFzc2MifQ.eyJzY29wZSI6WyJkYXRhOndyaXRlIiwiZGF0YTpyZWFkIiwiYnVja2V0OmNyZWF0ZSIsImJ1Y2tldDpkZWxldGUiXSwiY2xpZW50X2lkIjoiN1dSUmc5M2VUT1RDcnVxZzE4YXFzWUlOcEQ4R3FpQ2xtdEEyNTF4azVrUklSbkQ1IiwiaXNzIjoiaHR0cHM6Ly9kZXZlbG9wZXIuYXBpLmF1dG9kZXNrLmNvbSIsImF1ZCI6Imh0dHBzOi8vYXV0b2Rlc2suY29tIiwianRpIjoiS3JyOGltSXVxU2Nyc1V2ZHU5ajdkaXJISzRPWm1HSW9JTUZoeTIxYTZVbEkwQkNldkswcTNZc1V6MHNKbnU4RiIsImV4cCI6MTc0OTUzNjM0NH0.Fh_BVaYJZvLy_ZHKMbbpPb6GWr6c6rzXEMGqW5AKZIY93akewHvwiSQRmxlnB3DlKHIl3RRk89SX4X8UUl3HdwpCE9o860aX0PMK8Qa-EPSHBJZZFWpj4oGg-Qs1npVNp-3bqF2vT4BmgwaiuN7GMWXjxODyIxKUvFpGjw3u9-qKNfN7foUUbix2_7a0Ol-OGZzLy3-wM3K6KcVb9kDckoVfXqaZ98hs6dSXKvOXeSVMf9g4T-vITKWlQN8OJTlRVZFquwthsasBMzBvHO54fMTFfO1ONA4UkRrlvTXL6yxXudltr9X1JCU0uDyspeRS_tw0jm7j4--jPeB60IsMzQ'
};
const documentId = 'urn:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6YnVja2V0X2IyOTQ4MDg5MGM3NDRiOTFhMGJhOTJlNjRkZTBhNjJhL0Fzc2VtYmx5MS5pYW0';

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

// Get animation commands from Gemini AI

async function getGeminiAnimationCommands() {
    const apiKey = 'AIzaSyDhUtvjS8lgDcsWH85lDC8pnMdeSce9cok';
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;

    // UI Feedback Start
    logToConsole("Generating animation sequence with Gemini AI");
    const btn = document.getElementById('autoAnimateBtn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    btn.classList.add('shimmer');

    try {
        // --- Step 1: Fetch hierarchy and properties JSON files ---
        const [hierarchyRes, propertiesRes] = await Promise.all([
            fetch('responses/09_object_hierarchy.json'),
            fetch('responses/10_properties_all_objects.json')
        ]);

        if (!hierarchyRes.ok || !propertiesRes.ok) {
            throw new Error("Failed to fetch hierarchy or properties data.");
        }

        const hierarchyData = await hierarchyRes.json();
        const propertiesData = await propertiesRes.json();

        // --- Step 2: Build hierarchy description ---
        function describeHierarchy(node, level = 0) {
            let description = '  '.repeat(level) + `- ${node.name} (ID: ${node.objectid})\n`;
            if (node.objects) {
                node.objects.forEach(child => {
                    description += describeHierarchy(child, level + 1);
                });
            }
            return description;
        }

        let hierarchyDescription = "Model Hierarchy:\n";
        hierarchyData.data.objects.forEach(root => {
            hierarchyDescription += describeHierarchy(root);
        });

        // --- Step 3: Build properties description ---
        let propertiesDescription = "Key Properties:\n";
        propertiesData.data.collection.forEach(item => {
            propertiesDescription += `- ${item.name} (ID: ${item.objectid}):\n`;
            for (const [category, props] of Object.entries(item.properties)) {
                if (typeof props === 'object') {
                    propertiesDescription += `  • ${category}:\n`;
                    for (const [key, value] of Object.entries(props)) {
                        propertiesDescription += `    ◦ ${key}: ${value}\n`;
                    }
                } else {
                    propertiesDescription += `  • ${category}: ${props}\n`;
                }
            }
        });

        // --- Step 4: Create fragment descriptions from the model ---
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

        // --- Step 5: Generate prompt for Gemini ---
        const prompt = `
You are an expert 3D animation assistant for Autodesk Forge models. 
Generate a sequence of animation commands for the following fragments that will create a logical, visually appealing animation of disassembly.

${hierarchyDescription}

${propertiesDescription}

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
1. Create an disassembly view showing assembly relationships
2. Move parts along logical axes based on their position in the assembly
3. Rotate rotating components (shaft, rotor, screws) to show movements of disassembly
4. Scale small parts to make them more visible
5. Use reasonable translations depending on part size for disassembly
6. Include 20-30 commands for a comprehensive animation at the end assembly should disassemble completely and then reassemble
7. Prioritize moving outer components first then inner ones
8. Consider mechanical relationships between parts

Generate only the JSON array with no additional text.
        `.trim();

        const body = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1000
            }
        };

        // --- Step 6: Send prompt to Gemini ---
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await res.json();
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

        // --- Step 7: Clean response ---
        if (text.startsWith("```json")) {
            text = text.slice(7, -3).trim();
        } else if (text.startsWith("```")) {
            text = text.slice(3, -3).trim();
        }

        if (!text) {
            logToConsole("No commands generated by Gemini", true);
            return [];
        }

        console.log("Gemini response:", text);

        return JSON.parse(text);

    } catch (e) {
        logToConsole(`Gemini response error: ${e}`, true);
        return [];
    } finally {
        // UI Feedback End
        btn.innerHTML = '<i class="fas fa-play"></i> Generate & Animate';
        btn.classList.remove('shimmer');
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
