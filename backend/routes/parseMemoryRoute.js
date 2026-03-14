const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');
const router = express.Router();

// Initialize the Gemini SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/', async (req, res, next) => {
    try {
        const { prompt } = req.body;

        if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
            res.status(400);
            throw new Error('A prompt is required.');
        }

        // Check for API Key
        if (!process.env.GEMINI_API_KEY) {
            res.status(500);
            throw new Error('GEMINI_API_KEY is not set in the server environment.');
        }

        // Initialize the model with JSON constraint
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash", // Or "gemini-3.1-flash-lite-preview"
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        const systemInstruction = `You are a dream scene interpreter. Given a memory, extract scene data for a beautiful 3D dreamlike rendering.
Respond ONLY with a JSON object following this schema:
{
  "skyTop": "hex string",
  "skyBottom": "hex string",
  "fogColor": "hex string",
  "lightColor": "hex string",
  "accentColor": "hex string",
  "groundColor": "hex string",
  "objects": [{ "type": "string", "count": number, "scale": number, "glowing": boolean, "floating": boolean }],
  "ambientIntensity": number (0.2-0.7),
  "particleDensity": number (400-1200),
  "dreamIntensity": number (0.4-1.0),
  "title": "3-5 poetic words"
}

Rules:
- Objects: Choose 4-6 from: tree, willow, pine, house, mountain, moon, sun, water, flower, bird, stars, lantern, path, arch, stone, grass.
- Aesthetic: Painterly and atmospheric — Studio Ghibli meets impressionism.`;

        const userPrompt = `Memory: "${prompt.trim()}"`;

        // Generate content
        const result = await model.generateContent([systemInstruction, userPrompt]);
        const response = await result.response;
        const text = response.text();

        // Gemini with JSON mode is very reliable, but we'll parse safely
        const sceneData = JSON.parse(text);
        res.json(sceneData);

    } catch (err) {
        // Handle Gemini-specific errors or parsing issues
        if (err instanceof SyntaxError) {
            res.status(502);
            return next(new Error('Gemini returned invalid JSON.'));
        }
        next(err);
    }
});

module.exports = router;