// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const db = require('./database.js'); // Import the database connection

const projectRoutes = require('./routes/projects'); // Import project routes
const taskRoutes = require('./routes/tasks'); // Import task routes
const timeEntryRoutes = require('./routes/timeEntries'); // Import time entry routes
const waitingItemRoutes = require('./routes/waitingItems'); // Import waiting item routes
const reportRoutes = require('./routes/reports'); // Import report routes

const app = express();

// Middleware
app.use(cors()); // Enable CORS for all origins
app.use(express.json()); // Enable parsing JSON request bodies

// Basic Route
app.get('/', (req, res) => {
  res.json({ message: 'TaskFlow API is running!' });
});

// Mount API Routes
app.use('/api/projects', projectRoutes); // Use project routes
app.use('/api/tasks', taskRoutes); // Use task routes
app.use('/api/time-entries', timeEntryRoutes); // Use time entry routes
app.use('/api/waiting-items', waitingItemRoutes); // Use waiting item routes
app.use('/api/reports', reportRoutes); // Use report routes

// Error Handling Middleware (Basic)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Start Server
const PORT = process.env.PORT || 5001; // Use a different port than the frontend (usually 5173 or 3000)
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
