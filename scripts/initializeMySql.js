const fs = require('fs/promises');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../src/config');

function getConnectionOptions(database) {
  return {
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
    database,
    multipleStatements: true
  };
}

async function initializeMySql() {
  const databaseName = config.mysql.database;

  if (!/^[a-zA-Z0-9_]+$/.test(databaseName)) {
    throw new Error('MYSQL_DATABASE may only contain letters, numbers, and underscores.');
  }

  const setupConnection = await mysql.createConnection(getConnectionOptions());

  try {
    await setupConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${databaseName}\`
       CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await setupConnection.end();
  }

  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  const schemaSql = await fs.readFile(schemaPath, 'utf8');
  const databaseConnection = await mysql.createConnection(
    getConnectionOptions(databaseName)
  );

  try {
    await databaseConnection.query(schemaSql);
  } finally {
    await databaseConnection.end();
  }

  console.log(`MySQL database ready: ${databaseName}`);
}

module.exports = initializeMySql;
