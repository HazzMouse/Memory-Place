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

function deleteFileIfExists(filePath) {
  if (!filePath) return;

  // Remove leading slash so path.join works correctly
  const cleaned = filePath.startsWith('/') ? filePath.slice(1) : filePath;

  const fullPath = path.join(__dirname, '..', cleaned);

  fs.unlink(fullPath, err => {
    if (err) {
      console.log("Could not delete file:", fullPath);
    }
  });
}


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
        const { title, content, time } = req.body;

        // ⭐ Parse location FIRST
        const location = JSON.parse(req.body.location);

        // ⭐ Validate AFTER parsing
        if (!title || typeof title !== 'string' || title.trim() === '') {
            res.status(400);
            throw new Error('A valid title is required.');
        }

        if (!isValidLocation(location)) {
            res.status(400);
            throw new Error('A valid location is required. Latitude must be between -90 and 90, and longitude between -180 and 180.');
        }

        // ⭐ Handle image
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

        const memories = readMemories();
        const newMemory = {
            id: Date.now().toString(),
            title: title.trim(),
            content: content ? String(content).trim() : '',
            location, // ✅ use the parsed location
            time: time || new Date().toISOString(),
            image: imageUrl
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

        let parsedLocation = memories[index].location;

        if (req.body.location !== undefined) {
            parsedLocation = JSON.parse(req.body.location);

            if (!isValidLocation(parsedLocation)) {
                res.status(400);
                throw new Error('Invalid location.');
            }
        }

        // Handle image update
        let newImage = memories[index].image; // keep existing image by default

        if (req.file) {
            // If user uploaded a new image → delete old one
            if (newImage) deleteFileIfExists(newImage);
            // User uploaded a new image
            newImage = `/uploads/${req.file.filename}`;
        }

        if (req.body.removeImage === "true") {
            // If user removed the image → delete old one
            if (newImage) deleteFileIfExists(newImage);
            // User wants to remove the image
            newImage = null;
        }

        // Apply updates
        memories[index] = {
            ...memories[index],
            title: title !== undefined ? title.trim() : memories[index].title,
            content: content !== undefined ? String(content).trim() : memories[index].content,
            location: parsedLocation, // ✅ always use the validated value
            time: time !== undefined ? time : memories[index].time,
            image: newImage
        };

        writeMemories(memories);
        res.json(memories[index]);

        

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

        // Delete image if it exists
        if (memory.image) {
            deleteFileIfExists(memory.image);
        }

        // Remove memory from list
        const updated = memories.filter(m => m.id !== id);
        writeMemories(updated);

        res.json({ message: 'Memory deleted successfully' });

    } catch (error) {
        next(error);
    }
};

const deleteAllMemories = (req, res, next) => {
    try {
        // Overwrite the database with an empty array
        writeMemories([]);
        res.json({ message: 'All memories have been permanently deleted.' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllMemories,
    createMemory,
    updateMemory,
    deleteMemory,
    deleteAllMemories
};