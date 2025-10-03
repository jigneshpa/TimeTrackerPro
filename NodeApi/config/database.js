import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbA = mysql.createPool({
  host: process.env.DBA_HOST || 'localhost',
  port: process.env.DBA_PORT || 3306,
  database: process.env.DBA_NAME || 'database_a',
  user: process.env.DBA_USER || 'root',
  password: process.env.DBA_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const dbB = mysql.createPool({
  host: process.env.DBB_HOST || 'localhost',
  port: process.env.DBB_PORT || 3306,
  database: process.env.DBB_NAME || 'time_tracking',
  user: process.env.DBB_USER || 'root',
  password: process.env.DBB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export { dbA, dbB };
export default dbB;
