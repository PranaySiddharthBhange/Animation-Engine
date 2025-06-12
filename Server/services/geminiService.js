// services/geminiService.js
const axios = require('axios');
const { GEMINI_API_KEY } = require('../config');

async function generateAnimationWithGemini(hierarchyData, propertiesData) {
  function describeHierarchy(node, level = 0) {
    let text = '  '.repeat(level) + `- ${node.name} (ID: ${node.objectid})\n`;
    if (node.objects) {
      node.objects.forEach(child => {
        text += describeHierarchy(child, level + 1);
      });
    }
    return text;
  }

  const hierarchyDescription = "Model Hierarchy:\n" +
    hierarchyData.data.objects.map(root => describeHierarchy(root)).join('\n');

  const propertiesDescription = "Key Properties:\n" +
    propertiesData.data.collection.map(item => {
      let out = `- ${item.name} (ID: ${item.objectid}):\n`;
      for (const [cat, props] of Object.entries(item.properties)) {
        if (typeof props === 'object') {
          out += `  • ${cat}:\n`;
          for (const [key, val] of Object.entries(props)) {
            out += `    ◦ ${key}: ${val}\n`;
          }
        } else {
          out += `  • ${cat}: ${props}\n`;
        }
      }
      return out;
    }).join('\n');

  const prompt = `
You are an expert 3D animation assistant for Autodesk Forge models.
Generate a sequence of animation commands for the following fragments that will create a logical, visually appealing animation of disassembly.

${hierarchyDescription}

${propertiesDescription}

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
1. Create a disassembly view showing assembly relationships
2. Move parts along logical axes based on their position
3. Rotate rotating components like shafts, rotors, screws
4. Scale small parts to make them more visible
5. Include 8–12 steps for full disassembly and reassembly
6. Prioritize moving outer components first
7. Consider mechanical relationships and rotational parts

Respond only with the raw JSON array.
  `.trim();

  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    let text = res.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    // Remove any code block markers
    if (text.startsWith("```json")) text = text.replace(/^```json/, "").replace(/```$/, "").trim();
    else if (text.startsWith("```")) text = text.replace(/^```/, "").replace(/```$/, "").trim();

    return JSON.parse(text);
  } catch (err) {
    console.error("Gemini API error:", err.message);
    throw new Error(`Animation generation failed: ${err.response?.data?.error?.message || err.message}`);
  }
}

module.exports = generateAnimationWithGemini;
