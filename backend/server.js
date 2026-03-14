const express = require('express');
const cors = require('cors');
require('dotenv').config();

const memoryRoutes = require('./routes/memoryRoutes');
const { errorHandler } = require('./middleware/errorMiddleware'); // Import the middleware

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/memories', memoryRoutes);

// --- Error Handler Middleware ---
// This goes AFTER the routes so it can catch anything the routes throw
app.use(errorHandler);

// Start the Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});