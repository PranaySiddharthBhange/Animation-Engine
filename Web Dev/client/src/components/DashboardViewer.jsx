import React, { useEffect, useRef, useState } from "react";

const AUTODESK_VIEWER_URL =
  "https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js";
const AUTODESK_VIEWER_CSS =
  "https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.min.css";
const FONTAWESOME_CSS =
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";

const ACCESS_TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI6IlhrUFpfSmhoXzlTYzNZS01oRERBZFBWeFowOF9SUzI1NiIsInBpLmF0bSI6ImFzc2MifQ.eyJzY29wZSI6WyJkYXRhOndyaXRlIiwiZGF0YTpyZWFkIiwiYnVja2V0OmNyZWF0ZSIsImJ1Y2tldDpkZWxldGUiXSwiY2xpZW50X2lkIjoiV0EyS3o5MXhWVWZBcElHWW15aDh2QUYzWVVsQ1FvcUJXeTlIdWs5ejJSTG1wQjliIiwiaXNzIjoiaHR0cHM6Ly9kZXZlbG9wZXIuYXBpLmF1dG9kZXNrLmNvbSIsImF1ZCI6Imh0dHBzOi8vYXV0b2Rlc2suY29tIiwianRpIjoieDdLNUdxejBkYmVqeXlkZTlQdWhCdXVYcUV5R05tdEtiOXpuN2tPTnEybHRFeTlLTHp6VlZBVzBVYnRxRUZleiIsImV4cCI6MTc0ODg0NTkwOX0.OoxsTc4-dovIUeCQngBsWEihW9sAcP3lILSq_8FDkzprSDnLbouap_u7RW0VGpBq_SK10ZSn4_jzBKA7v1YABybv8ZgHhQpKY-GEl9rYYqZ_v32AKSPFItJ2iCHYD5tmDrCe4rwqYuIotTkAeXdDzeBAHdOVw1cTT7eS6UhrsWQ3gRC8IFcOt9La-_himumZXzgNPauK0_LkasoBq2-woJSZKjnc0jMk8yshJ42MATAnTLvD_Zg1onJRFR637nMNIZFxR8OURq81oBSYBAYpIAgV5ExUoZhm4FnN01x9GzigauBYvcWdE6bEtBSQO5m1JyuI-UIP_jz3nZy8vUFAsw";
const DOCUMENT_ID =
  "urn:dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6Y2hlY2stM2J1Y2tldC9zY2lzc29ycy5pYW0";
const GEMINI_API_KEY = "AIzaSyDhUtvjS8lgDcsWH85lDC8pnMdeSce9cok";



export default function DashboardViewer() {
  const viewerDiv = useRef(null);
  const [log, setLog] = useState([
    { text: "System ready. Load a model to begin.", error: false },
  ]);
  const [fragmentList, setFragmentList] = useState([]);
  const [fragmentMap, setFragmentMap] = useState({});
  const [selectedFragment, setSelectedFragment] = useState("");
  const [currentDbId, setCurrentDbId] = useState("");
  const [fragmentCount, setFragmentCount] = useState(0);
  const [animationInterval, setAnimationInterval] = useState(null);
  const [animationSpeed, setAnimationSpeed] = useState(1000);
  const [viewer, setViewer] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Load external scripts/styles
  useEffect(() => {
    if (!window.Autodesk) {
      const script = document.createElement("script");
      script.src = AUTODESK_VIEWER_URL;
      script.async = true;
      document.body.appendChild(script);
      script.onload = () => setTimeout(initViewer, 500);
    } else {
      setTimeout(initViewer, 100);
    }
    [AUTODESK_VIEWER_CSS, FONTAWESOME_CSS].forEach((href) => {
      if (!document.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        document.head.appendChild(link);
      }
    });
    // eslint-disable-next-line
  }, []);

  // Log helper
  const logToConsole = (text, error = false) => {
    setLog((prev) => [
      ...prev,
      { text: `[${new Date().toLocaleTimeString()}] ${text}`, error },
    ]);
  };

  // Viewer init
  function initViewer() {
    if (!window.Autodesk || viewer) return;
    window.Autodesk.Viewing.Initializer(
      {
        env: "AutodeskProduction",
        accessToken: ACCESS_TOKEN,
      },
      () => {
        const v = new window.Autodesk.Viewing.GuiViewer3D(viewerDiv.current);
        v.start();
        v.setTheme("light-theme");
        setViewer(v);
        window.Autodesk.Viewing.Document.load(
          DOCUMENT_ID,
          (doc) => {
            const viewable = doc.getRoot().getDefaultGeometry();
            v.loadDocumentNode(doc, viewable).then(() => {
              logToConsole("Model loaded successfully");
              v.addEventListener(
                window.Autodesk.Viewing.GEOMETRY_LOADED_EVENT,
                () => {
                  logToConsole("Geometry loaded. Fragments available");
                  populateFragmentDropdown(v);
                }
              );
            });
          },
          (code, message) => {
            logToConsole(`Could not load document (${code}): ${message}`, true);
          }
        );
      }
    );
  }

  // Populate fragment dropdown
  function populateFragmentDropdown(v) {
    const tree = v.model.getInstanceTree();
    if (!tree) {
      logToConsole("Instance tree not loaded", true);
      return;
    }
    let fragments = [];
    let map = {};
    let count = 0;
    tree.enumNodeChildren(
      tree.getRootId(),
      function (dbId) {
        const name = tree.getNodeName(dbId);
        tree.enumNodeFragments(dbId, function (fragId) {
          count++;
          map[fragId] = dbId;
          fragments.push({ fragId, name });
        });
      },
      true
    );
    setFragmentList(fragments);
    setFragmentMap(map);
    setFragmentCount(count);
    logToConsole(`Loaded ${count} fragments`);
  }

  // Fragment actions
  function getFragProxy(fragId) {
    if (!viewer) return null;
    return viewer.impl.getFragmentProxy(viewer.model, parseInt(fragId));
  }

  function scaleSelectedFragment() {
    if (!selectedFragment) {
      logToConsole("Please select a fragment first", true);
      return;
    }
    const factor =
      parseFloat(document.getElementById("scaleFactor").value) || 1.5;
    const fragProxy = getFragProxy(selectedFragment);
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
    logToConsole(`Fragment ${selectedFragment} scaled by ${factor}x`);
  }

  function rotateSelectedFragment() {
    if (!selectedFragment) {
      logToConsole("Please select a fragment first", true);
      return;
    }
    const angleDeg =
      parseFloat(document.getElementById("rotateAngle").value) || 45;
    const axisVal = document.getElementById("rotateAxis").value;
    let axis;
    if (axisVal === "x") axis = new window.THREE.Vector3(1, 0, 0);
    else if (axisVal === "y") axis = new window.THREE.Vector3(0, 1, 0);
    else axis = new window.THREE.Vector3(0, 0, 1);

    const angleRad = (angleDeg * Math.PI) / 180;
    const fragProxy = getFragProxy(selectedFragment);
    if (!fragProxy) {
      logToConsole("Could not get fragment proxy", true);
      return;
    }
    fragProxy.getAnimTransform();
    const q = new window.THREE.Quaternion();
    q.setFromAxisAngle(axis, angleRad);
    fragProxy.quaternion.multiplyQuaternions(q, fragProxy.quaternion);
    fragProxy.updateAnimTransform();
    viewer.impl.invalidate(true);
    logToConsole(
      `Fragment ${selectedFragment} rotated ${angleDeg}° around ${axisVal.toUpperCase()} axis`
    );
  }

  function translateSelectedFragment() {
    if (!selectedFragment) {
      logToConsole("Please select a fragment first", true);
      return;
    }
    const dx = parseFloat(document.getElementById("translateX").value) || 0;
    const dy = parseFloat(document.getElementById("translateY").value) || 0;
    const dz = parseFloat(document.getElementById("translateZ").value) || 0;
    const fragProxy = getFragProxy(selectedFragment);
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
    logToConsole(
      `Fragment ${selectedFragment} moved by (${dx}, ${dy}, ${dz})`
    );
  }

  function resetAllFragments() {
    if (!viewer) return;
    const tree = viewer.model.getInstanceTree();
    if (!tree) {
      logToConsole("Instance tree not loaded", true);
      return;
    }
    tree.enumNodeChildren(
      tree.getRootId(),
      function (dbId) {
        const fragIds = [];
        tree.enumNodeFragments(dbId, function (fragId) {
          fragIds.push(fragId);
        });
        fragIds.forEach((fragId) => {
          const fragProxy = viewer.impl.getFragmentProxy(viewer.model, fragId);
          if (fragProxy) {
            fragProxy.getAnimTransform();
            fragProxy.scale.set(1, 1, 1);
            fragProxy.position.set(0, 0, 0);
            fragProxy.quaternion.set(0, 0, 0, 1);
            fragProxy.updateAnimTransform();
          }
        });
      },
      true
    );
    viewer.impl.invalidate(true);
    logToConsole("Reset all fragments to original state");
  }

  function logModelTree() {
    if (!viewer) return;
    const tree = viewer.model.getInstanceTree();
    if (!tree) {
      logToConsole("Instance tree not loaded", true);
      return;
    }
    logToConsole("==== Model Structure ====");
    tree.enumNodeChildren(
      tree.getRootId(),
      function (dbId) {
        const name = tree.getNodeName(dbId);
        tree.enumNodeFragments(dbId, function (fragId) {
          logToConsole(`Fragment: ${fragId} → dbId: ${dbId} (${name})`);
        });
      },
      true
    );
  }

  // Gemini AI Animation
  async function getGeminiAnimationCommands() {
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
      GEMINI_API_KEY;

    // Create a description of available fragments
    const fragmentDescriptions = [];
    if (!viewer) return [];
    const tree = viewer.model.getInstanceTree();
    tree.enumNodeChildren(
      tree.getRootId(),
      function (dbId) {
        const name = tree.getNodeName(dbId);
        tree.enumNodeFragments(dbId, function (fragId) {
          fragmentDescriptions.push({
            fragmentId: fragId,
            dbId: dbId,
            name: name,
          });
        });
      },
      true
    );

    const prompt = `You are an expert 3D animation assistant for Autodesk Forge models. 
Generate a sequence of animation commands for the following fragments that will create a logical, visually appealing animation.

Available fragments (fragmentId: name):
${fragmentDescriptions.map((f) => `- ${f.fragmentId}: ${f.name}`).join("\n")}

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
  }
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
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    };

    logToConsole("Generating animation sequence with Gemini AI");

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

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
          setSelectedFragment(String(cmd.fragmentId));
          document.getElementById("fragmentSelect").value = cmd.fragmentId;
          document.getElementById("rotateAxis").value = cmd.params.axis;
          document.getElementById("rotateAngle").value = cmd.params.angle;
          rotateSelectedFragment();
          break;
        case "scale":
          setSelectedFragment(String(cmd.fragmentId));
          document.getElementById("fragmentSelect").value = cmd.fragmentId;
          document.getElementById("scaleFactor").value = cmd.params.factor;
          scaleSelectedFragment();
          break;
        case "translate":
          setSelectedFragment(String(cmd.fragmentId));
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
    stopAnimations();
    setIsAnimating(true);
    const speed =
      parseInt(document.getElementById("animationSpeed").value) || 1000;
    setAnimationSpeed(speed);

    const commands = await getGeminiAnimationCommands();
    if (!commands.length) {
      logToConsole("No animation commands received", true);
      setIsAnimating(false);
      return;
    }

    logToConsole(`Starting animation sequence with ${commands.length} commands`);

    let index = 0;
    const interval = setInterval(() => {
      if (index < commands.length) {
        executeAnimationCommand(commands[index]);
        index++;
      } else {
        stopAnimations();
        logToConsole("Animation sequence completed");
      }
    }, speed);
    setAnimationInterval(interval);
  }

  function stopAnimations() {
    if (animationInterval) {
      clearInterval(animationInterval);
      setAnimationInterval(null);
      setIsAnimating(false);
      logToConsole("Animation stopped");
    }
  }

  // --- UI ---
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">
      {/* Inline CSS for demo */}
      <style>{`
        html, body { margin: 0; padding: 0; height: 100%; }
        * { box-sizing: border-box; }
        body { background: #f8fafc; color: #334155; }
        #dashboard {
          width: 450px;
          background: #fff;
          padding: 32px;
          overflow-y: auto;
          height: 100vh;
          position: relative;
          z-index: 100;
          box-shadow: 8px 0 20px rgba(0,0,0,0.03);
          border-right: 1px solid #f1f5f9;
        }
        #viewer {
          flex: 1;
          height: 100vh;
          background: #fff;
          border-radius: 0 24px 24px 0;
          box-shadow: 0 10px 40px rgba(0,0,0,0.05);
          min-width: 0;
          margin: 0;
          position: relative;
          overflow: hidden;
          display: flex;
          justify-content: center;
          align-items: center;
          border-left: 1px solid #e2e8f0;
        }
        .viewer-overlay {
          position: absolute;
          top: 24px;
          left: 24px;
          background: rgba(255,255,255,0.9);
          padding: 12px 20px;
          border-radius: 12px;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          z-index: 100;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .viewer-overlay i { color: #0ea5e9; }
        .dashboard-header { text-align: center; margin-bottom: 36px; padding-bottom: 24px; border-bottom: 1px solid #f1f5f9; }
        .logo { display: flex; justify-content: center; align-items: center; gap: 12px; margin-bottom: 20px; }
        .logo-icon { width: 44px; height: 44px; background: linear-gradient(135deg,#0ea5e9,#6366f1); border-radius: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 12px rgba(99,102,241,0.15);}
        .logo-icon i { font-size: 22px; color: white; }
        .dashboard-header h2 { font-size: 28px; font-weight: 700; color: #0f172a; margin-bottom: 8px; letter-spacing: -0.5px;}
        .dashboard-header p { font-size: 16px; color: #64748b; max-width: 90%; margin: 0 auto; line-height: 1.6; font-weight: 400;}
        .fragment-count { background: linear-gradient(135deg,#e0f2fe,#dbeafe); color: #0ea5e9; padding: 8px 24px; border-radius: 999px; font-size: 14px; font-weight: 600; margin-top: 20px; display: inline-block; border: 1px solid #e0f2fe; box-shadow: 0 4px 10px rgba(14,165,233,0.08);}
        .section { background: #fff; border-radius: 20px; padding: 28px; margin-bottom: 28px; box-shadow: 0 8px 25px rgba(0,0,0,0.03); transition: all 0.3s ease; border: 1px solid #f1f5f9;}
        .section:hover { box-shadow: 0 12px 30px rgba(0,0,0,0.05); transform: translateY(-2px);}
        .section h3 { font-size: 18px; font-weight: 600; margin-bottom: 22px; color: #1e293b; display: flex; align-items: center; gap: 12px;}
        .section h3 i { color: #6366f1; width: 28px; height: 28px; background: #eef2ff; border-radius: 8px; display: flex; align-items: center; justify-content: center;}
        .control-group { margin-bottom: 20px;}
        .control-group label { font-weight: 500; font-size: 14px; color: #475569; margin-bottom: 8px; display: block;}
        input[type="number"], select { width: 100%; padding: 12px 18px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 15px; background: #fff; transition: all 0.3s ease; color: #334155; font-family: 'Inter', sans-serif; box-shadow: 0 2px 4px rgba(0,0,0,0.02);}
        input[type="number"]:focus, select:focus { outline: none; border-color: #0ea5e9; box-shadow: 0 0 0 4px rgba(14,165,233,0.15);}
        .fragment-info { display: flex; align-items: center; gap: 16px; background: #f8fafc; padding: 18px; border-radius: 14px; font-size: 14px; color: #475569; margin: 20px 0; border: 1px solid #f1f5f9;}
        .fragment-info i { color: #0ea5e9; font-size: 20px;}
        .row { display: flex; gap: 12px; align-items: center;}
        .button-group { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 24px;}
        button { padding: 14px 22px; border: none; border-radius: 14px; cursor: pointer; font-size: 15px; font-weight: 600; transition: all 0.3s ease; display: flex; align-items: center; gap: 8px; min-height: 48px; flex: 1; position: relative; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); background: #fff; color: #334155; border: 1px solid #e2e8f0;}
        button:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.08);}
        .btn-primary { background: linear-gradient(135deg,#0ea5e9,#6366f1); color: white; border: none;}
        .btn-success { background: linear-gradient(135deg,#10b981,#06b6d4); color: white; border: none;}
        .btn-danger { background: linear-gradient(135deg,#ef4444,#f97316); color: white; border: none;}
        .btn-dark { background: linear-gradient(135deg,#475569,#334155); color: white; border: none;}
        .animation-controls { display: flex; gap: 12px; align-items: center; margin-top: 20px; padding: 18px; background: #f8fafc; border-radius: 16px; border: 1px solid #f1f5f9;}
        .status-bar { background: #f8fafc; color: #334155; border-radius: 18px; padding: 24px; margin-top: 28px; border: 1px solid #f1f5f9;}
        .status-bar h4 { font-size: 17px; margin-bottom: 16px; color: #0f172a; display: flex; align-items: center; gap: 10px;}
        #logOutput { background: #fff; padding: 18px; border-radius: 14px; max-height: 200px; overflow-y: auto; font-family: 'Courier New', monospace; font-size: 14px; color: #475569; line-height: 1.6; border: 1px solid #f1f5f9; box-shadow: inset 0 2px 6px rgba(0,0,0,0.02);}
        #logOutput div { margin-bottom: 10px; padding-left: 12px; border-left: 2px solid #e2e8f0;}
      `}</style>
      {/* Dashboard */}
      <div id="dashboard">
        <div className="dashboard-header">
          <div className="logo">
            <div className="logo-icon">
              <i className="fas fa-cube"></i>
            </div>
          </div>
          <h2>Animation Engine</h2>
          <p>
            Select fragments and apply transformations or use AI-powered animation
          </p>
          <div className="fragment-count">
            <i className="fas fa-cube"></i>{" "}
            {fragmentCount ? `${fragmentCount} fragments` : "Loading fragments..."}
          </div>
        </div>

        <div className="section">
          <h3>
            <i className="fas fa-cube"></i> Fragment Selection
          </h3>
          <div className="control-group">
            <label htmlFor="fragmentSelect">Select Fragment</label>
            <select
              id="fragmentSelect"
              value={selectedFragment}
              onChange={(e) => {
                setSelectedFragment(e.target.value);
                setCurrentDbId(fragmentMap[e.target.value] || "");
                const frag = fragmentList.find((f) => f.fragId === parseInt(e.target.value));
                logToConsole(
                  `Selected fragment: ${e.target.value} (dbId: ${fragmentMap[e.target.value]}, ${frag?.name || ""})`
                );
              }}
            >
              <option value="" disabled>
                -- Select Fragment --
              </option>
              {fragmentList.map((f) => (
                <option key={f.fragId} value={f.fragId}>
                  Fragment {f.fragId} → {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="fragment-info">
            <i className="fas fa-info-circle"></i>
            <div>
              <div>
                Fragment: <span id="currentFragment">{selectedFragment || "N/A"}</span>
              </div>
              <div>
                dbId: <span id="currentDbId">{currentDbId || "N/A"}</span>
              </div>
            </div>
          </div>

          <div className="button-group">
            <button onClick={logModelTree} className="btn-dark">
              <i className="fas fa-list"></i> Log Fragments
            </button>
            <button onClick={resetAllFragments} className="btn-dark">
              <i className="fas fa-undo"></i> Reset All
            </button>
          </div>
        </div>

        <div className="section">
          <h3>
            <i className="fas fa-sync-alt"></i> Transformations
          </h3>
          <div className="control-group">
            <label>Scale Fragment</label>
            <div className="row">
              <input
                type="number"
                id="scaleFactor"
                defaultValue="1.5"
                min="0.1"
                step="0.1"
                title="Scale factor"
              />
              <button onClick={scaleSelectedFragment} className="btn-primary">
                <i className="fas fa-expand"></i> Scale
              </button>
            </div>
          </div>
          <div className="control-group">
            <label>Rotate Fragment (degrees)</label>
            <div className="row">
              <input
                type="number"
                id="rotateAngle"
                defaultValue="45"
                step="1"
                title="Degrees"
              />
              <select id="rotateAxis" defaultValue="z">
                <option value="x">X Axis</option>
                <option value="y">Y Axis</option>
                <option value="z">Z Axis</option>
              </select>
              <button onClick={rotateSelectedFragment} className="btn-primary">
                <i className="fas fa-redo"></i> Rotate
              </button>
            </div>
          </div>
          <div className="control-group">
            <label>Translate Fragment</label>
            <div className="row">
              <input
                type="number"
                id="translateX"
                defaultValue="10"
                step="1"
                title="X"
              />
              <input
                type="number"
                id="translateY"
                defaultValue="0"
                step="1"
                title="Y"
              />
              <input
                type="number"
                id="translateZ"
                defaultValue="0"
                step="1"
                title="Z"
              />
              <button onClick={translateSelectedFragment} className="btn-primary">
                <i className="fas fa-arrows-alt"></i> Move
              </button>
            </div>
          </div>
        </div>

        <div className="section">
          <h3>
            <i className="fas fa-bolt"></i> AI-Powered Animation
          </h3>
          <p>Generate logical animations using AI</p>
          <div className="button-group">
            <button
              className="btn-success"
              onClick={autoAnimateWithGemini}
              disabled={isAnimating}
            >
              <i className="fas fa-play"></i> Generate & Animate
            </button>
            <button
              className="btn-danger"
              onClick={stopAnimations}
              disabled={!isAnimating}
            >
              <i className="fas fa-stop"></i> Stop Animations
            </button>
          </div>
          <div className="animation-controls">
            <input
              type="number"
              id="animationSpeed"
              defaultValue="1000"
              min="100"
              step="100"
              title="Speed in ms"
              onChange={(e) => setAnimationSpeed(parseInt(e.target.value) || 1000)}
            />
            <button className="btn-primary" disabled>
              <i className="fas fa-sync-alt"></i> Apply Speed
            </button>
          </div>
        </div>

        <div className="status-bar">
          <h4>
            <i className="fas fa-terminal"></i> Activity Log
          </h4>
          <div id="logOutput" style={{ maxHeight: 200, overflowY: "auto" }}>
            {log.map((entry, idx) => (
              <div key={idx} style={{ color: entry.error ? "#ef4444" : "#10b981" }}>
                {entry.text}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Viewer */}
      <div id="viewer" ref={viewerDiv}>
        <div className="viewer-overlay">
          <i className="fas fa-cube"></i>
          <span>Autodesk Forge Viewer</span>
        </div>
      </div>
    </div>
  );
}