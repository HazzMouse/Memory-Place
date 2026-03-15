const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');
const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/', async (req, res, next) => {
    try {
        const { prompt } = req.body;

        if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
            res.status(400);
            throw new Error('A prompt is required.');
        }

        if (!process.env.GEMINI_API_KEY) {
            res.status(500);
            throw new Error('GEMINI_API_KEY is not set in the server environment.');
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const systemInstruction = `You are a memory sculptor. Given a memory, design ONE central 3D object that symbolises it — built from geometric primitives — plus the dreamlike environment it inhabits.

Respond ONLY with a JSON object exactly matching this schema (no markdown, no extra keys):
{
  "title": "3-5 poetic lowercase words",
  "skyTop": "#hexcolor",
  "skyBottom": "#hexcolor",
  "fogColor": "#hexcolor",
  "lightColor": "#hexcolor",
  "accentColor": "#hexcolor",
  "groundColor": "#hexcolor",
  "ambientIntensity": 0.2 to 0.7,
  "particleDensity": 400 to 1200,
  "dreamIntensity": 0.4 to 1.0,
  "particleColor": "#hexcolor",
  "object": {
    "label": "short name of what the object is, e.g. oak tree, lighthouse, grandmother",
    "primitives": [
      {
        "shape": "box|sphere|cylinder|cone|torus|ring|octahedron|icosahedron",
        "x": 0, "y": 0, "z": 0,
        "sx": 1, "sy": 1, "sz": 1,
        "rx": 0, "ry": 0, "rz": 0,
        "color": "#hexcolor",
        "emissive": "#hexcolor or null",
        "emissiveIntensity": 0.0,
        "roughness": 0.7,
        "opacity": 1.0,
        "animation": "none|float|spin_y|spin_z|pulse|sway"
      }
    ]
  }
}

GEOMETRY RULES:
- sphere / icosahedron / octahedron: sx = radius (sy, sz ignored)
- cylinder: sx = top radius, sy = height, sz = bottom radius
- cone: sx = base radius, sy = height (sz ignored)
- torus: sx = outer radius, sy = tube radius (sz ignored)
- ring: sx = inner radius, sy = outer radius (sz ignored)
- box: sx = width, sy = height, sz = depth
- Rotations in radians. All positions relative to object centre at ground level (y=0).
- 1 unit ≈ 1 metre. A person is ~1.8 tall. A house is ~3 wide, ~2.5 tall.

DESIGN RULES:
- Choose the ONE object that best symbolises the memory (a tree, a lantern, a house, a chair, a boat, a person, a flower, etc.)
- Use 10–30 primitives to build it with real detail — think low-poly 3D modelling.
- animation: "float" = gentle up/down bob. "spin_y" = slow Y-axis rotation. "spin_z" = Z-axis spin. "pulse" = gentle scale throb. "sway" = gentle Z-axis rock. "none" = static.
- emissive: use for glowing parts only (lantern flame, window light, flower centre, eyes). Set null otherwise.
- opacity < 1.0 for translucent parts (water, glass, petals, mist).
- Colour mood should match the memory's emotional tone and scene colours.
- Aesthetic: painterly low-poly, Studio Ghibli meets impressionism.`;

        const userPrompt = `Memory: "${prompt.trim()}"`;

        const result = await model.generateContent([systemInstruction, userPrompt]);
        const text = result.response.text();
        const sceneData = JSON.parse(text);
        res.json(sceneData);

    } catch (err) {
        if (err instanceof SyntaxError) {
            res.status(502);
            return next(new Error('Gemini returned invalid JSON.'));
        }
        next(err);
    }
});

module.exports = router;