const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data', 'memories.json');

// --- Helper Functions ---
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

const isValidLocation = (location) => {
    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        return false;
    }
    if (location.lat < -90 || location.lat > 90) return false;
    if (location.lng < -180 || location.lng > 180) return false;
    return true;
};

function deleteFileIfExists(filePath) {
    if (!filePath) return;
    const cleaned = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    const fullPath = path.join(__dirname, '..', cleaned);
    fs.unlink(fullPath, err => {
        if (err) console.log("Could not delete file:", fullPath);
    });
}


// --- Controller Functions ---

const getAllMemories = (req, res, next) => {
    try {
        const memories = readMemories();
        res.json(memories);
    } catch (error) {
        next(error);
    }
};

const createMemory = (req, res, next) => {
    try {
        const { title, content, time } = req.body;
        const location = JSON.parse(req.body.location);

        if (!title || typeof title !== 'string' || title.trim() === '') {
            res.status(400);
            throw new Error('A valid title is required.');
        }

        if (!isValidLocation(location)) {
            res.status(400);
            throw new Error('A valid location is required. Latitude must be between -90 and 90, and longitude between -180 and 180.');
        }

        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

        const memories = readMemories();
        const newMemory = {
            id: Date.now().toString(),
            title: title.trim(),
            content: content ? String(content).trim() : '',
            location,
            time: time || new Date().toISOString(),
            image: imageUrl,
            sceneData: null   // populated later by PATCH /api/memories/:id/scene
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

        const { title, content, time } = req.body;

        if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
            res.status(400);
            throw new Error('Title cannot be empty.');
        }

        let parsedLocation = memories[index].location;
        if (req.body.location !== undefined) {
            parsedLocation = JSON.parse(req.body.location);
            if (!isValidLocation(parsedLocation)) {
                res.status(400);
                throw new Error('Invalid location.');
            }
        }

        let newImage = memories[index].image;
        if (req.file) {
            if (newImage) deleteFileIfExists(newImage);
            newImage = `/uploads/${req.file.filename}`;
        }
        if (req.body.removeImage === "true") {
            if (newImage) deleteFileIfExists(newImage);
            newImage = null;
        }

        // If the title or content changed, invalidate the cached scene so it re-generates
        const titleChanged   = title   !== undefined && title.trim()   !== memories[index].title;
        const contentChanged = content !== undefined && String(content).trim() !== memories[index].content;
        const sceneData = (titleChanged || contentChanged) ? null : memories[index].sceneData;

        memories[index] = {
            ...memories[index],
            title:     title   !== undefined ? title.trim()            : memories[index].title,
            content:   content !== undefined ? String(content).trim()  : memories[index].content,
            location:  parsedLocation,
            time:      time    !== undefined ? time                    : memories[index].time,
            image:     newImage,
            sceneData,
        };

        writeMemories(memories);
        res.json(memories[index]);

    } catch (error) {
        next(error);
    }
};

// PATCH /api/memories/:id/scene  — saves the generated sceneData JSON onto the memory
const saveScene = (req, res, next) => {
    try {
        const memories = readMemories();
        const index = memories.findIndex(m => m.id === req.params.id);

        if (index === -1) {
            res.status(404);
            throw new Error('Memory not found');
        }

        const { sceneData } = req.body;
        if (!sceneData || typeof sceneData !== 'object') {
            res.status(400);
            throw new Error('sceneData must be a JSON object.');
        }

        memories[index].sceneData = sceneData;
        writeMemories(memories);
        res.json({ ok: true });

    } catch (error) {
        next(error);
    }
};

const deleteMemory = (req, res, next) => {
    try {
        const memories = readMemories();
        const id = req.params.id;

        const memory = memories.find(m => m.id === id);
        if (!memory) {
            res.status(404);
            throw new Error('Memory not found');
        }

        if (memory.image) deleteFileIfExists(memory.image);

        const updated = memories.filter(m => m.id !== id);
        writeMemories(updated);
        res.json({ message: 'Memory deleted successfully' });

    } catch (error) {
        next(error);
    }
};

const deleteAllMemories = (req, res, next) => {
    try {
        const memories = readMemories();

        // Delete every image file on disk
        memories.forEach(memory => {
            if (memory.image) {
                deleteFileIfExists(memory.image);
            }
        });

        // Clear the JSON file
        writeMemories([]);

        res.json({ message: 'All memories and images have been permanently deleted.' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllMemories,
    createMemory,
    updateMemory,
    saveScene,
    deleteMemory,
    deleteAllMemories
};