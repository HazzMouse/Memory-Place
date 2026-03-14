const express = require('express');
const cors = require('cors');
require('dotenv').config();

const memoryRoutes = require('./routes/memoryRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/memories', memoryRoutes);

// Start the Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});