const sqlite3 = require('sqlite3').verbose();

// Use a file-based database named 'taskflow.db'
const DBSOURCE = 'taskflow.db';

const db = new sqlite3.Database(DBSOURCE, (err) => {
  if (err) {
    // Cannot open database
    console.error(err.message);
    throw err;
  } else {
    console.log('Connected to the SQLite database.');
    // Create tables if they don't exist
    db.serialize(() => {
      // Projects Table
      db.run(`CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        client TEXT,
        color TEXT,
        startDate TEXT,
        dueDate TEXT,
        status TEXT DEFAULT 'in-progress',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) console.error("Error creating projects table: ", err.message);
      });

      // Tasks Table
      db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        projectId TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'not-started',
        priority TEXT DEFAULT 'medium',
        dueDate TEXT,
        estimatedHours REAL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projectId) REFERENCES projects (id) ON DELETE CASCADE
      )`, (err) => {
        if (err) console.error("Error creating tasks table: ", err.message);
      });

      // Time Entries Table
      db.run(`CREATE TABLE IF NOT EXISTS time_entries (
        id TEXT PRIMARY KEY,
        taskId TEXT NOT NULL,
        startTime DATETIME NOT NULL,
        endTime DATETIME,
        duration REAL, -- Store duration in minutes or seconds for easier calculation
        notes TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (taskId) REFERENCES tasks (id) ON DELETE CASCADE
      )`, (err) => {
        if (err) console.error("Error creating time_entries table: ", err.message);
      });
    });
  }
});

module.exports = db;
