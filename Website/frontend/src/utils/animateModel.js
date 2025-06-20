import { easingFunctions } from './easingFunctions.js';

const GEMINI_API_KEY = 'AIzaSyDhUtvjS8lgDcsWH85lDC8pnMdeSce9cok';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// Store initial fragment states
const initialFragmentStates = new Map();

// Get and store animation sequences
const getStoredSequences = () => {
    const sequences = sessionStorage.getItem('sequences');
    return sequences ? JSON.parse(sequences) : [];
};

const addSequenceToStorage = (sequence) => {
    const sequences = getStoredSequences();
    sequences.push(sequence);
    sessionStorage.setItem('sequences', JSON.stringify(sequences));
};

const getLatestSequence = () => {
    const sequences = getStoredSequences();
    return sequences.length > 0 ? sequences[sequences.length - 1] : [];
};

export async function animateModel(viewer, mode = 'disassembly') {
    try {
        // Only reset for disassembly
        if (mode === 'disassembly') {
            resetAllFragments(viewer);
        }
        
        // Load structured data from localStorage
        const data = JSON.parse(localStorage.getItem("data") || "{}");
        const propertiesData = data.properties;
        const hierarchyData = data.hierarchy;
        const jointsAndConstraintsData = data.joints_and_constraints;

        // Get assembly sequence from integrated logic
        const sequence = getAssemblySequence(
            propertiesData, 
            hierarchyData, 
            jointsAndConstraintsData,
            mode
        );
        
        let commands;
        if (mode === 'disassembly') {
            // Get new disassembly commands
            commands = await getGeminiAnimationCommands(
                viewer, 
                sequence,
                propertiesData,
                hierarchyData,
                jointsAndConstraintsData,
                mode
            );
            // Store for current session
            addSequenceToStorage(commands);
        } else {
            // Use latest disassembly commands for reassembly
            commands = getLatestSequence();
            if (commands.length === 0) {
                // Fallback if no stored commands
                commands = await getGeminiAnimationCommands(
                    viewer, 
                    sequence,
                    propertiesData,
                    hierarchyData,
                    jointsAndConstraintsData,
                    mode
                );
            }
        }
        
        // Execute animations
        await executeAnimationQueue(viewer, commands, mode);
        
        return true;
    } catch (error) {
        console.error('Animation error:', error);
        return false;
    }
}




function getAssemblySequence(properties, hierarchy, jointsData, mode) {
    // Build assembly graph
    const graph = buildAssemblyGraph(properties, hierarchy, jointsData);
    
    // Determine disassembly sequence
    const disassemblySequence = disassemblyPlanner(graph);
    
    // Return sequence based on mode
    return mode === 'disassembly' 
        ? disassemblySequence 
        : [...disassemblySequence].reverse();
}

function buildAssemblyGraph(properties, hierarchy, jointsData) {
    const nodes = new Map();
    const edges = [];
    
    // Add nodes from properties
    properties.data.collection.forEach(item => {
        nodes.set(item.name, {
            id: item.objectid,
            name: item.name,
            properties: item.properties
        });
    });
    
    // Add edges from joints
    jointsData.Joints.forEach(joint => {
        edges.push({
            source: joint.OccurrenceOne,
            target: joint.OccurrenceTwo,
            type: 'joint',
            jointType: joint.Type.split(':')[0]
        });
    });
    
    // Add hierarchical relationships
    const parseHierarchy = (items, parent) => {
        items.forEach(item => {
            if (parent && nodes.has(parent) && nodes.has(item.name)) {
                edges.push({
                    source: parent,
                    target: item.name,
                    type: 'hierarchy'
                });
            }
            if (item.objects) {
                parseHierarchy(item.objects, item.name);
            }
        });
    };
    parseHierarchy(hierarchy.data.objects, null);
    
    return { nodes, edges };
}

function disassemblyPlanner(graph) {
    const sequence = [];
    const dependencies = new Map();
    
    // Build dependency map
    graph.edges.forEach(edge => {
        if (edge.type === 'joint') {
            if (!dependencies.has(edge.target)) {
                dependencies.set(edge.target, new Set());
            }
            dependencies.get(edge.target).add(edge.source);
        }
    });
    
    // Find removable parts (no dependencies)
    const findRemovable = () => {
        return Array.from(graph.nodes.keys()).filter(node => {
            return (!dependencies.has(node) || dependencies.get(node).size === 0);
        });
    };
    
    // Main disassembly logic
    while (graph.nodes.size > 0) {
        const removable = findRemovable();
        if (removable.length === 0) break;
        
        const partToRemove = removable[0];
        sequence.push(partToRemove);
        
        // Remove part and its dependencies
        graph.nodes.delete(partToRemove);
        dependencies.delete(partToRemove);
        
        // Update dependencies
        dependencies.forEach((deps, node) => {
            deps.delete(partToRemove);
        });
    }
    
    return sequence;
}

async function getGeminiAnimationCommands(viewer, sequence, properties, hierarchy, jointsData, mode) {
    // Build fragment descriptions
    const fragmentDescriptions = [];
    const fragmentMap = new Map();
    const tree = viewer.model.getInstanceTree();
    
    tree.enumNodeChildren(tree.getRootId(), dbId => {
        const name = tree.getNodeName(dbId);
        tree.enumNodeFragments(dbId, fragId => {
            fragmentDescriptions.push({
                fragmentId: fragId,
                name: name
            });
            fragmentMap.set(name, fragId);
        });
    }, true);

    // Build hierarchy description
    const describeHierarchy = (objects, level = 0) => {
        let description = '';
        objects.forEach(node => {
            description += '  '.repeat(level) + `- ${node.name} (ID: ${node.objectid})\n`;
            if (node.objects) {
                description += describeHierarchy(node.objects, level + 1);
            }
        });
        return description;
    };

    // Build properties description
    const describeProperties = () => {
        let description = '';
        properties.data.collection.forEach(item => {
            description += `- ${item.name} (ID: ${item.objectid}):\n`;
            for (const [category, props] of Object.entries(item.properties)) {
                if (typeof props === 'object') {
                    description += `  • ${category}:\n`;
                    for (const [key, value] of Object.entries(props)) {
                        description += `    ◦ ${key}: ${value}\n`;
                    }
                } else {
                    description += `  • ${category}: ${props}\n`;
                }
            }
        });
        return description;
    };

    // Build joints description
    const describeJoints = () => {
        return jointsData.Joints.map(j => 
            `- ${j.OccurrenceOne} connected to ${j.OccurrenceTwo} with ${j.Type} joint`
        ).join('\n');
    };

    // Construct Gemini prompt
    const prompt = `
You are an expert 3D mechanical animation designer. Generate precise animation commands for a ${mode} sequence based on the following assembly structure:

ASSEMBLY SEQUENCE (${mode} order):
${sequence.map((part, i) => `${i+1}. ${part}`).join('\n')}

MECHANICAL JOINTS:
${describeJoints()}

COMPONENT HIERARCHY:
${describeHierarchy(hierarchy.data.objects)}

COMPONENT PROPERTIES:
${describeProperties()}

AVAILABLE FRAGMENTS (fragmentId: componentName):
${fragmentDescriptions.map(f => `- ${f.fragmentId}: ${f.name}`).join('\n')}

GUIDELINES:
1. Create 1-3 animation steps per component
2. Use joint types to determine natural movement:
   - Slider: Linear translation along joint axis
   - Rotational: Circular motion around pivot point
   - Cylindrical: Combined rotation and translation
   - Ball: Multi-axis rotation or translation
3. For disassembly: Move components away from assembly
4. For assembly: Reverse disassembly motions
5. Use realistic distances/angles based on component sizes
6. Duration: 1000ms per command

OUTPUT FORMAT (JSON array):
[
  {
    "fragmentId": 123,
    "action": "rotate|translate|scale",
    "params": {
      // Rotate: "axis" ("x","y","z") and "angle" (degrees)
      // Translate: "x", "y", "z" values
      // Scale: "factor" (multiplier)
    },
    "duration": 1000
  },
  ...
]
`.trim();

    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 2048
                }
            })
        });

        const data = await response.json();
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

        // Clean JSON response
        if (text.startsWith("```json")) text = text.slice(7, -3).trim();
        else if (text.startsWith("```")) text = text.slice(3, -3).trim();
        
        return JSON.parse(text);
    } catch (error) {
        console.error('Gemini API error:', error);
        return generateFallbackCommands(sequence, fragmentMap, mode);
    }
}

function generateFallbackCommands(sequence, fragmentMap, mode) {
    const direction = mode === 'disassembly' ? 1 : -1;
    return sequence.map(partName => {
        const fragmentId = fragmentMap.get(partName);
        return fragmentId ? {
            fragmentId,
            action: 'translate',
            params: { x: 0, y: 100 * direction, z: 0 },
            duration: 1000
        } : null;
    }).filter(cmd => cmd !== null);
}

function resetAllFragments(viewer) {
    const tree = viewer.model.getInstanceTree();
    if (!tree) return;

    tree.enumNodeChildren(tree.getRootId(), dbId => {
        const fragIds = [];
        tree.enumNodeFragments(dbId, fragId => fragIds.push(fragId));
        
        fragIds.forEach(fragId => {
            const fragProxy = viewer.impl.getFragmentProxy(viewer.model, fragId);
            if (fragProxy) {
                fragProxy.getAnimTransform();
                fragProxy.scale.set(1, 1, 1);
                fragProxy.position.set(0, 0, 0);
                fragProxy.quaternion.set(0, 0, 0, 1);
                fragProxy.updateAnimTransform();
                
                // Store initial state
                if (!initialFragmentStates.has(fragId)) {
                    initialFragmentStates.set(fragId, {
                        position: fragProxy.position.clone(),
                        scale: fragProxy.scale.clone(),
                        quaternion: fragProxy.quaternion.clone()
                    });
                }
            }
        });
    }, true);

    viewer.impl.invalidate(true);
}

async function executeAnimationQueue(viewer, commands, mode) {
    // For reassembly, reverse and invert commands
    const executionCommands = mode === 'assembly' 
        ? [...commands].reverse().map(invertCommand) 
        : commands;
    
    for (const cmd of executionCommands) {
        await executeSmoothAnimation(viewer, cmd);
    }
}

function invertCommand(cmd) {
    const inverted = {...cmd};
    
    if (cmd.action === 'rotate') {
        inverted.params = {...cmd.params};
        inverted.params.angle = -cmd.params.angle;
    } 
    else if (cmd.action === 'translate') {
        inverted.params = {
            x: -(cmd.params.x || 0),
            y: -(cmd.params.y || 0),
            z: -(cmd.params.z || 0)
        };
    }
    else if (cmd.action === 'scale') {
        inverted.params = {...cmd.params};
        inverted.params.factor = 1 / (cmd.params.factor || 1.5);
    }
    
    return inverted;
}

function executeSmoothAnimation(viewer, cmd) {
    return new Promise(resolve => {
        const fragProxy = viewer.impl.getFragmentProxy(
            viewer.model, 
            parseInt(cmd.fragmentId)
        );
        
        if (!fragProxy) {
            resolve();
            return;
        }

        // Get current state
        fragProxy.getAnimTransform();
        const currentPosition = fragProxy.position.clone();
        const currentScale = fragProxy.scale.clone();
        const currentQuaternion = fragProxy.quaternion.clone();

        // Calculate target state
        let targetPosition, targetScale, targetQuaternion;
        const params = cmd.params || {};

        switch (cmd.action) {
            case "rotate":
                const axis = params.axis === "x" ? new THREE.Vector3(1, 0, 0) :
                          params.axis === "y" ? new THREE.Vector3(0, 1, 0) :
                          new THREE.Vector3(0, 0, 1);
                
                const angleRad = (params.angle || 45) * Math.PI / 180;
                const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(axis, angleRad);
                
                targetQuaternion = rotationQuaternion.multiply(currentQuaternion);
                targetPosition = currentPosition.clone();
                targetScale = currentScale.clone();
                break;

            case "scale":
                const factor = params.factor || 1.5;
                targetScale = new THREE.Vector3(
                    currentScale.x * factor,
                    currentScale.y * factor,
                    currentScale.z * factor
                );
                targetPosition = currentPosition.clone();
                targetQuaternion = currentQuaternion.clone();
                break;

            case "translate":
                targetPosition = new THREE.Vector3(
                    currentPosition.x + (params.x || 0),
                    currentPosition.y + (params.y || 0),
                    currentPosition.z + (params.z || 0)
                );
                targetScale = currentScale.clone();
                targetQuaternion = currentQuaternion.clone();
                break;
        }

        // Animation parameters
        const duration = cmd.duration || 1000;
        const easingType = 'easeInOut';
        const startTime = performance.now();

        function animate(currentTime) {
            // Calculate progress (0 to 1)
            let progress = (currentTime - startTime) / duration;
            if (progress > 1) progress = 1;

            // Apply easing
            const easeFunc = easingFunctions[easingType];
            const easedProgress = easeFunc(progress);

            // Apply transformations
            switch (cmd.action) {
                case "rotate":
                    fragProxy.quaternion.slerpQuaternions(
                        currentQuaternion,
                        targetQuaternion,
                        easedProgress
                    );
                    break;

                case "scale":
                    fragProxy.scale.lerpVectors(
                        currentScale,
                        targetScale,
                        easedProgress
                    );
                    break;

                case "translate":
                    fragProxy.position.lerpVectors(
                        currentPosition,
                        targetPosition,
                        easedProgress
                    );
                    break;
            }

            fragProxy.updateAnimTransform();
            viewer.impl.invalidate(true);

            // Continue animation if not finished
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                resolve();
            }
        }

        requestAnimationFrame(animate);
    });
}

export default animateModel;