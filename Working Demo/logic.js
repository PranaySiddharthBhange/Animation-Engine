
// Initialize the dashboard first
document.addEventListener('DOMContentLoaded', function () {
    // Ensure dashboard is visible
    const dashboard = document.getElementById('dashboard');
    dashboard.style.display = 'block';
    dashboard.style.visibility = 'visible';

    // Fragment count element
    const header = document.querySelector('.dashboard-header');
    const countEl = document.createElement('div');
    countEl.className = 'fragment-count';
    countEl.textContent = '0 fragments';
    header.appendChild(countEl);

    // Initialize auto animate button
    document.getElementById('autoAnimateBtn').onclick = autoAnimateWithGemini;
});


// --- Autodesk Viewer Setup ---
const options = {
    env: 'AutodeskProduction',
    accessToken: 'eyJhbGciOiJSUzI1NiIsImtpZCI6ImI4YjJkMzNhLTFlOTYtNDYwNS1iMWE4LTgwYjRhNWE4YjNlNyIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJodHRwczovL2F1dG9kZXNrLmNvbSIsImNsaWVudF9pZCI6IldBMkt6OTF4VlVmQXBJR1lteWg4dkFGM1lVbENRb3FCV3k5SHVrOXoyUkxtcEI5YiIsInNjb3BlIjpbImRhdGE6d3JpdGUiLCJkYXRhOnJlYWQiLCJidWNrZXQ6Y3JlYXRlIiwiYnVja2V0OmRlbGV0ZSJdLCJpc3MiOiJodHRwczovL2RldmVsb3Blci5hcGkuYXV0b2Rlc2suY29tIiwiZXhwIjoxNzQ4NTI1NDM2LCJqdGkiOiJBVC01NjNlMjMyNi1jZmU3LTQxZGItYTM1ZC02ZjJlOTU3NDg3NGYifQ.C8v4MwZ07oqNCT2NcDSlyHgqQe0kee6WJFj9WBhkpwMe_PwCQgO4G47gO034m4SoY2okrUSO-Z9KCjqR921YqXeONBborf_HoaLJ9vNhrfxAs8bMKq43Tq0mr4NRSpO6Iq7jRVliamX7wZ8A2Feq4Ls7ypiBS_CIMpz2fYFBYPhmiPe14sPI9HY44lm6UmR7kziW-iyGlL3KaKXZG25G3t7vdxRqnrxS-DWGt2HxGEf1AHrYawPxq-SfUgrGFd2OMx8t4kIiRzQ5mSFImYSs2GVeWe1YpV7TyNBHdyVjJnaKaVpMiY524u90fIYf9yPIUSTdLwKvO5m8afsmwALifg'
};
const documentId = 'urn:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6Y2hlY2stM2J1Y2tldC9zY2lzc29ycy5pYW0';



let viewer;
let fragmentToDbIdMap = {};
let animationInterval = null;
let animationSpeed = 1000; // Default animation speed in ms

Autodesk.Viewing.Initializer(options, () => {
    viewer = new Autodesk.Viewing.GuiViewer3D(document.getElementById('viewer'));
    viewer.start();
    viewer.setTheme('light-theme');
    Autodesk.Viewing.Document.load(documentId, onDocumentLoadSuccess, onDocumentLoadFailure);
});



function onDocumentLoadSuccess(doc) {
    const viewable = doc.getRoot().getDefaultGeometry();
    viewer.loadDocumentNode(doc, viewable).then(() => {
        logToConsole("Model loaded successfully");
        viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, () => {
            logToConsole("Geometry loaded. Fragments available");
            populateFragmentDropdown();
        });
    });
}

function onDocumentLoadFailure(code, message) {
    logToConsole(`Could not load document (${code}): ${message}`, true);
}

function logToConsole(message, isError = false) {
    const logOutput = document.getElementById("logOutput");
    const entry = document.createElement("div");
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    entry.style.color = isError ? "#e74c3c" : "#2ecc71";
    logOutput.appendChild(entry);
    logOutput.scrollTop = logOutput.scrollHeight;
}

function logModelTree() {
    const tree = viewer.model.getInstanceTree();
    if (!tree) {
        logToConsole("Instance tree not loaded", true);
        return;
    }

    logToConsole("==== Model Structure ====");
    tree.enumNodeChildren(tree.getRootId(), function (dbId) {
        const name = tree.getNodeName(dbId);
        tree.enumNodeFragments(dbId, function (fragId) {
            logToConsole(`Fragment: ${fragId} → dbId: ${dbId} (${name})`);
        });
    }, true);
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

function populateFragmentDropdown() {
    const tree = viewer.model.getInstanceTree();
    if (!tree) {
        logToConsole("Instance tree not loaded", true);
        return;
    }

    const dropdown = document.getElementById("fragmentSelect");
    dropdown.innerHTML = '<option disabled selected>-- Select Fragment --</option>';
    fragmentToDbIdMap = {};

    let fragmentCount = 0;
    tree.enumNodeChildren(tree.getRootId(), function (dbId) {
        const name = tree.getNodeName(dbId);
        tree.enumNodeFragments(dbId, function (fragId) {
            fragmentCount++;
            fragmentToDbIdMap[fragId] = dbId;
            const option = document.createElement("option");
            option.value = fragId;
            option.textContent = `Fragment ${fragId} → ${name}`;
            dropdown.appendChild(option);
        });
    }, true);

    // Update fragment info
    document.querySelector('.fragment-count').textContent = `${fragmentCount} fragments`;
    logToConsole(`Loaded ${fragmentCount} fragments`);

    // Add event listener to update fragment info when selected
    dropdown.addEventListener('change', function () {
        if (this.value) {
            const dbId = fragmentToDbIdMap[this.value];
            document.getElementById('currentFragment').textContent = this.value;
            document.getElementById('currentDbId').textContent = dbId;

            // Get current name
            const tree = viewer.model.getInstanceTree();
            const node = tree.getNodeName(dbId);
            logToConsole(`Selected fragment: ${this.value} (dbId: ${dbId}, ${node})`);
        }
    });
}

function scaleSelectedFragment() {
    const fragId = document.getElementById("fragmentSelect").value;
    if (!fragId) {
        logToConsole("Please select a fragment first", true);
        return;
    }

    const factor = parseFloat(document.getElementById("scaleFactor").value) || 1.5;
    const model = viewer.model;
    const fragProxy = viewer.impl.getFragmentProxy(model, parseInt(fragId));
    if (!fragProxy) {
        logToConsole("Could not get fragment proxy", true);
        return;
    }

    fragProxy.getAnimTransform();
    fragProxy.scale.x *= factor;
    fragProxy.scale.y *= factor;
    fragProxy.scale.z *= factor;
    fragProxy.updateAnimTransform();
    viewer.impl.invalidate(true);

    logToConsole(`Fragment ${fragId} scaled by ${factor}x`);
}

function rotateSelectedFragment() {
    const fragId = document.getElementById("fragmentSelect").value;
    if (!fragId) {
        logToConsole("Please select a fragment first", true);
        return;
    }

    const angleDeg = parseFloat(document.getElementById("rotateAngle").value) || 45;
    const axisVal = document.getElementById("rotateAxis").value;
    let axis;
    if (axisVal === "x") axis = new THREE.Vector3(1, 0, 0);
    else if (axisVal === "y") axis = new THREE.Vector3(0, 1, 0);
    else axis = new THREE.Vector3(0, 0, 1);

    const angleRad = angleDeg * Math.PI / 180;
    const model = viewer.model;
    const fragProxy = viewer.impl.getFragmentProxy(model, parseInt(fragId));
    if (!fragProxy) {
        logToConsole("Could not get fragment proxy", true);
        return;
    }

    fragProxy.getAnimTransform();
    const q = new THREE.Quaternion();
    q.setFromAxisAngle(axis, angleRad);
    fragProxy.quaternion.multiplyQuaternions(q, fragProxy.quaternion);
    fragProxy.updateAnimTransform();
    viewer.impl.invalidate(true);

    logToConsole(`Fragment ${fragId} rotated ${angleDeg}° around ${axisVal.toUpperCase()} axis`);
}

function translateSelectedFragment() {
    const fragId = document.getElementById("fragmentSelect").value;
    if (!fragId) {
        logToConsole("Please select a fragment first", true);
        return;
    }

    const dx = parseFloat(document.getElementById("translateX").value) || 0;
    const dy = parseFloat(document.getElementById("translateY").value) || 0;
    const dz = parseFloat(document.getElementById("translateZ").value) || 0;
    const model = viewer.model;
    const fragProxy = viewer.impl.getFragmentProxy(model, parseInt(fragId));
    if (!fragProxy) {
        logToConsole("Could not get fragment proxy", true);
        return;
    }

    fragProxy.getAnimTransform();
    fragProxy.position.x += dx;
    fragProxy.position.y += dy;
    fragProxy.position.z += dz;
    fragProxy.updateAnimTransform();
    viewer.impl.invalidate(true);

    logToConsole(`Fragment ${fragId} moved by (${dx}, ${dy}, ${dz})`);
}

// --- Enhanced Gemini Integration for Flexible Animation ---
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
6. Include 10-20 commands in the sequence

Generate only the JSON array with no additional text.`;

    const body = {
        contents: [{
            parts: [{
                text: prompt
            }]
        }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000
        }
    };

    logToConsole("Generating animation sequence");

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

        return JSON.parse(text);
    } catch (e) {
        logToConsole(`Gemini response error: ${e}`, true);
        return [];
    }
}

function executeAnimationCommand(cmd) {
    try {
        switch (cmd.action) {
            case "rotate":
                // Set up rotation
                document.getElementById("fragmentSelect").value = cmd.fragmentId;
                document.getElementById("rotateAxis").value = cmd.params.axis;
                document.getElementById("rotateAngle").value = cmd.params.angle;
                rotateSelectedFragment();
                break;

            case "scale":
                document.getElementById("fragmentSelect").value = cmd.fragmentId;
                document.getElementById("scaleFactor").value = cmd.params.factor;
                scaleSelectedFragment();
                break;

            case "translate":
                document.getElementById("fragmentSelect").value = cmd.fragmentId;
                document.getElementById("translateX").value = cmd.params.x;
                document.getElementById("translateY").value = cmd.params.y;
                document.getElementById("translateZ").value = cmd.params.z;
                translateSelectedFragment();
                break;

            default:
                logToConsole(`Unknown action: ${cmd.action}`, true);
        }

        logToConsole(`Executed: ${cmd.action} on fragment ${cmd.fragmentId}`);
    } catch (e) {
        logToConsole(`Error executing command: ${e}`, true);
    }
}

async function autoAnimateWithGemini() {
    // Stop any existing animations
    stopAnimations();

    // Get animation speed from input
    animationSpeed = parseInt(document.getElementById("animationSpeed").value) || 1000;

    const commands = await getGeminiAnimationCommands();
    if (commands.length === 0) {
        logToConsole("No animation commands received", true);
        return;
    }

    logToConsole(`Starting animation sequence with ${commands.length} commands`);

    let index = 0;
    animationInterval = setInterval(() => {
        if (index < commands.length) {
            executeAnimationCommand(commands[index]);
            index++;
        } else {
            stopAnimations();
            logToConsole("Animation sequence completed");
        }
    }, animationSpeed);
}

function stopAnimations() {
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
        logToConsole("Animation stopped");
    }
}
