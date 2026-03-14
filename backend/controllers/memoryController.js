const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data', 'memories.json');

// Helper functions
const readMemories = () => {
    try {
        const data = fs.readFileSync(dataPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

const writeMemories = (data) => {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
};

// --- Controller Functions ---

const getAllMemories = (req, res) => {
    const memories = readMemories();
    res.json(memories);
};

const createMemory = (req, res) => {
    const { title, content, location, time } = req.body;

    // Basic Validation
    if (!title || !location || !location.lat || !location.lng) {
        return res.status(400).json({ message: 'Title and location (lat/lng) are required.' });
    }

    const memories = readMemories();
    const newMemory = {
        id: Date.now().toString(),
        title,
        content: content || '',
        location,
        time: time || new Date().toISOString()
    };
    
    memories.push(newMemory);
    writeMemories(memories);
    res.status(201).json(newMemory);
};

const updateMemory = (req, res) => {
    const memories = readMemories();
    const index = memories.findIndex(m => m.id === req.params.id);
    
    if (index === -1) {
        return res.status(404).json({ message: 'Memory not found' });
    }

    memories[index] = { ...memories[index], ...req.body };
    writeMemories(memories);
    res.json(memories[index]);
};

const deleteMemory = (req, res) => {
    let memories = readMemories();
    const initialLength = memories.length;
    
    memories = memories.filter(m => m.id !== req.params.id);
    
    if (memories.length === initialLength) {
        return res.status(404).json({ message: 'Memory not found' });
    }

    writeMemories(memories);
    res.json({ message: 'Memory deleted successfully' });
};

module.exports = {
    getAllMemories,
    createMemory,
    updateMemory,
    deleteMemory
};