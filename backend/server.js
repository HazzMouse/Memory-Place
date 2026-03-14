const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from two directories back
dotenv.config({ path: path.join(__dirname, '../.env') });

const memoryRoutes = require('./routes/memoryRoutes');
const parseMemoryRoute = require('./routes/parseMemoryRoute');
const { errorHandler } = require('./middleware/errorMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/memories', memoryRoutes);
app.use('/api/parse-memory', parseMemoryRoute);

// Error Handler (must come after routes)
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});