#!/usr/bin/env node
// Run: node scripts/init-db.js
// Initialises the SQLite database and seeds default niches.
const path = require('path');
process.env.DATABASE_PATH = process.env.DATABASE_PATH || './data/smb.db';

// Trigger the db module (which auto-migrates on first connection)
require('ts-node').register({ transpileOnly: true });
require('../src/lib/db').getDb();
console.log('Database initialised at', process.env.DATABASE_PATH);
