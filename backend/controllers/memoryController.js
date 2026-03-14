const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data', 'memories.json');

// --- Helper Functions ---
const readMemories = () => {
    try {
        const data = fs.readFileSync(dataPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // If the file doesn't exist yet, return an empty array
        return [];
    }
};

const writeMemories = (data) => {
    // If this fails (e.g., permission issues), it will throw an error 
    // that the parent try...catch blocks will automatically catch.
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
};

const isValidLocation = (location) => {
    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        return false;
    }
    if (location.lat < -90 || location.lat > 90) {
        return false;
    }
    if (location.lng < -180 || location.lng > 180) {
        return false;
    }
    return true;
};

// --- Controller Functions ---

const getAllMemories = (req, res, next) => {
    try {
        const memories = readMemories();
        res.json(memories);
    } catch (error) {
        next(error); // Passes the error to the custom error handler
    }
};

const createMemory = (req, res, next) => {
    try {
        const { title, content, location, time } = req.body;

        // Validation: Throwing an error automatically sends it to the catch block
        if (!title || typeof title !== 'string' || title.trim() === '') {
            res.status(400); 
            throw new Error('A valid title is required.');
        }

        if (!isValidLocation(location)) {
            res.status(400);
            throw new Error('A valid location is required. Latitude must be between -90 and 90, and longitude between -180 and 180.');
        }

        const memories = readMemories();
        const newMemory = {
            id: Date.now().toString(),
            title: title.trim(),
            content: content ? String(content).trim() : '',
            location,
            time: time || new Date().toISOString()
        };
        
        memories.push(newMemory);
        writeMemories(memories);
        res.status(201).json(newMemory);

    } catch (error) {
        next(error);
    }
};

const updateMemory = (req, res, next) => {
    try {
        const memories = readMemories();
        const index = memories.findIndex(m => m.id === req.params.id);
        
        if (index === -1) {
            res.status(404);
            throw new Error('Memory not found');
        }

        const { title, content, location, time } = req.body;

        if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
            res.status(400);
            throw new Error('Title cannot be empty.');
        }

        if (location !== undefined && !isValidLocation(location)) {
            res.status(400);
            throw new Error('Invalid location. Latitude must be between -90 and 90, and longitude between -180 and 180.');
        }

        // Apply updates
        memories[index] = {
            ...memories[index],
            title: title !== undefined ? title.trim() : memories[index].title,
            content: content !== undefined ? String(content).trim() : memories[index].content,
            location: location !== undefined ? location : memories[index].location,
            time: time !== undefined ? time : memories[index].time
        };

        writeMemories(memories);
        res.json(memories[index]);

    } catch (error) {
        next(error);
    }
};

const deleteMemory = (req, res, next) => {
    try {
        let memories = readMemories();
        const initialLength = memories.length;
        
        memories = memories.filter(m => m.id !== req.params.id);
        
        if (memories.length === initialLength) {
            res.status(404);
            throw new Error('Memory not found');
        }

        writeMemories(memories);
        res.json({ message: 'Memory deleted successfully' });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllMemories,
    createMemory,
    updateMemory,
    deleteMemory
};