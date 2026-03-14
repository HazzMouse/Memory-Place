const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Path to our JSON "database"
const dataPath = path.join(__dirname, 'data', 'memories.json');

// Middleware
app.use(cors()); // Allows your frontend to communicate with this backend
app.use(express.json()); // Allows the server to parse incoming JSON data

// --- Helper Functions ---
// Read data from JSON file
const readMemories = () => {
    try {
        const data = fs.readFileSync(dataPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading data. Returning empty array.', error);
        return [];
    }
};

// Write data to JSON file
const writeMemories = (data) => {
    try {
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing data:', error);
    }
};

// --- CRUD Routes ---

// 1. READ (Get all memories)
app.get('/api/memories', (req, res) => {
    const memories = readMemories();
    res.json(memories);
});

// 2. CREATE (Add a new memory)
app.post('/api/memories', (req, res) => {
    const memories = readMemories();
    
    const newMemory = {
        id: Date.now().toString(), // Generate a simple unique ID based on timestamp
        title: req.body.title || 'Untitled Memory',
        content: req.body.content || '',
        location: req.body.location || { lat: 0, lng: 0 },
        time: req.body.time || new Date().toISOString(),
        visualizationLink: `/map?memoryId=${Date.now()}` // Dynamic link based on ID
    };
    
    memories.push(newMemory);
    writeMemories(memories);
    
    res.status(201).json(newMemory);
});

// 3. UPDATE (Edit an existing memory)
app.put('/api/memories/:id', (req, res) => {
    const memories = readMemories();
    const index = memories.findIndex(m => m.id === req.params.id);
    
    if (index === -1) {
        return res.status(404).json({ message: 'Memory not found' });
    }

    // Update only the fields that were passed in the request
    memories[index] = {
        ...memories[index],
        title: req.body.title !== undefined ? req.body.title : memories[index].title,
        content: req.body.content !== undefined ? req.body.content : memories[index].content,
        location: req.body.location !== undefined ? req.body.location : memories[index].location,
        time: req.body.time !== undefined ? req.body.time : memories[index].time
    };

    writeMemories(memories);
    res.json(memories[index]);
});

// 4. DELETE (Remove a memory)
app.delete('/api/memories/:id', (req, res) => {
    let memories = readMemories();
    const initialLength = memories.length;
    
    memories = memories.filter(m => m.id !== req.params.id);
    
    if (memories.length === initialLength) {
        return res.status(404).json({ message: 'Memory not found' });
    }

    writeMemories(memories);
    res.json({ message: 'Memory deleted successfully' });
});

// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});