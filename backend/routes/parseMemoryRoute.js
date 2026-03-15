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

        if (!process.env.GEMINI_API_KEY) {
            res.status(500);
            throw new Error('GEMINI_API_KEY is not set in the server environment.');
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
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
  "objects": [{ "type": "string", "count": number, "scale": number, "glowing": boolean, "floating": boolean, "speechText": "string or null" }],
  "ambientIntensity": number (0.2-0.7),
  "particleDensity": number (400-1200),
  "dreamIntensity": number (0.4-1.0),
  "title": "3-5 poetic words"
}

Rules:
- Objects: Choose 4-8 from this full list:
    tree, willow, pine, oak, bush, bamboo,
    house, cabin, castle, fence, bench, bridge, well, windmill, barn, lighthouse,
    mountain, hill, cliff,
    moon, sun, stars, cloud, rainbow,
    water, lake, river, waterfall,
    flower, mushroom, cactus, fern,
    bird, butterfly, cat, dog, rabbit, horse, deer,
    lantern, path, arch, stone, grass,
    person, crowd,
    speech_bubble, balloon, kite, boat, campfire, tent, umbrella.
- person: Renders a stylised Mii-like character. Use count 1-5. Include when the memory mentions specific people.
- crowd: Renders a loose group of small background figures. Use count 1.
- speech_bubble: Floats above a nearby person. Set speechText to a short quote or feeling (max 6 words). Include when dialogue or strong emotion is mentioned.
- Aesthetic: Painterly and atmospheric — Studio Ghibli meets impressionism.`;

        const userPrompt = `Memory: "${prompt.trim()}"`;

        const result = await model.generateContent([systemInstruction, userPrompt]);
        const response = await result.response;
        const text = response.text();

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