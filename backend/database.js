const { Pool } = require('pg');

// Check if DATABASE_URL is set, otherwise throw an error
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set.');
}

// Create a connection pool using the DATABASE_URL environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Add SSL configuration if required for your PostgreSQL setup (e.g., cloud providers)
  // ssl: {
  //   rejectUnauthorized: false // Use only for development/testing if needed
  // }
});

// Function to initialize the database tables
const initializeDatabase = async () => {
  const client = await pool.connect();
  try {
    console.log('Connected to the PostgreSQL database.');

    // Use TEXT for IDs if they are UUIDs or similar strings, VARCHAR otherwise.
    // Using VARCHAR(255) as a safe default if unsure.
    // Using TIMESTAMPTZ for dates to include timezone information.

    // Projects Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        client VARCHAR(255),
        color VARCHAR(7),
        "startDate" TIMESTAMPTZ, -- Use quotes for camelCase column names
        "dueDate" TIMESTAMPTZ,
        status VARCHAR(50) DEFAULT 'in-progress',
        "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Checked/created projects table.');

    // Tasks Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(255) PRIMARY KEY,
        "projectId" VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'not-started',
        priority VARCHAR(50) DEFAULT 'medium',
        "dueDate" TIMESTAMPTZ,
        "estimatedHours" NUMERIC(10, 2),
        "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Checked/created tasks table.');

    // Time Entries Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS time_entries (
        id VARCHAR(255) PRIMARY KEY,
        "taskId" VARCHAR(255) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        "startTime" TIMESTAMPTZ NOT NULL,
        "endTime" TIMESTAMPTZ,
        duration NUMERIC(10, 2), -- Final duration in seconds
        notes TEXT,
        "isPaused" BOOLEAN DEFAULT false NOT NULL,          -- Track pause state
        "lastResumedAt" TIMESTAMPTZ,                       -- When the timer last started/resumed
        "pausedAt" TIMESTAMPTZ,                           -- When the timer was last paused
        "totalPausedDuration" NUMERIC(12, 2) DEFAULT 0 NOT NULL, -- Accumulates paused time in seconds
        "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Checked/created time_entries table.');

    // Waiting Items Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS waiting_items (
        id VARCHAR(255) PRIMARY KEY,
        "projectId" VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        "requestType" VARCHAR(100) NOT NULL,
        priority VARCHAR(50) DEFAULT 'medium',
        "requestedFrom" VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        "sentDate" TIMESTAMPTZ NOT NULL,
        "deadlineDate" TIMESTAMPTZ,
        "receivedDate" TIMESTAMPTZ,
        notes TEXT,
        link VARCHAR(255),
        "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Checked/created waiting_items table.');

    // Waiting Timeline Events Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS waiting_timeline_events (
        id VARCHAR(255) PRIMARY KEY,
        "waitingItemId" VARCHAR(255) NOT NULL REFERENCES waiting_items(id) ON DELETE CASCADE,
        "eventType" VARCHAR(100) NOT NULL,
        description TEXT,
        "eventDate" TIMESTAMPTZ NOT NULL,
        "createdBy" VARCHAR(255),
        "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Checked/created waiting_timeline_events table.');

    // Settings Table (Assuming single row for now)
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT PRIMARY KEY DEFAULT 1, -- Use INT for single row constraint
        "auto_pause_enabled" BOOLEAN DEFAULT false,
        "auto_pause_time" TIME, -- e.g., '18:00:00'
        CONSTRAINT settings_pk CHECK (id = 1) -- Enforce single row
      );
    `);
    console.log('Checked/created settings table.');

    // Insert default settings if the table was just created and is empty
    const settingsCheck = await client.query('SELECT COUNT(*) FROM settings');
    if (parseInt(settingsCheck.rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO settings (id, "auto_pause_enabled", "auto_pause_time")
        VALUES (1, false, NULL);
      `);
      console.log('Inserted default settings row.');
    }

    // Add columns if they don't exist (for existing databases)
    // Normally, you'd use migration tools for this in production
    try {
      await client.query('ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS "isPaused" BOOLEAN DEFAULT false NOT NULL');
      await client.query('ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS "lastResumedAt" TIMESTAMPTZ');
      await client.query('ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS "pausedAt" TIMESTAMPTZ');
      await client.query('ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS "totalPausedDuration" NUMERIC(12, 2) DEFAULT 0 NOT NULL');
      console.log('Checked/added columns for pause functionality to time_entries.');
    } catch (alterErr) {
      console.error('Error adding columns to time_entries (may already exist):', alterErr.message);
    }

  } catch (err) {
    console.error('Error initializing database tables:', err.stack);
    // Decide if the application should exit if DB init fails
    // process.exit(1);
  } finally {
    client.release(); // Release the client back to the pool
  }
};

// Initialize the database on application start
initializeDatabase().catch(err => {
  console.error('Failed to initialize database connection pool:', err.stack);
  // process.exit(1); // Optionally exit if pool connection fails critically
});

// Export the pool for querying
module.exports = pool;
