const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/parse-memory", authMiddleware, async (req, res, next) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return res.status(400).json({ message: "Prompt is required" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: "GEMINI_API_KEY missing" });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const systemInstruction = `... your long instruction ...`;
    const userPrompt = `Memory: "${prompt.trim()}"`;

    const result = await model.generateContent([systemInstruction, userPrompt]);
    const text = result.response.text();
    const sceneData = JSON.parse(text);

    res.json(sceneData);

  } catch (err) {
    if (err instanceof SyntaxError) {
      return res.status(502).json({ message: "Gemini returned invalid JSON" });
    }
    next(err);
  }
});

module.exports = router;
