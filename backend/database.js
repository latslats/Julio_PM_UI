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
        duration NUMERIC(10, 2), -- Consider storing duration as INTERVAL or in seconds
        notes TEXT,
        "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Checked/created time_entries table.');

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
