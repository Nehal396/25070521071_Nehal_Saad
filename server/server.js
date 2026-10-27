import './config/env.js';
import app from './app.js';
import { connectDB } from './config/db.js';

const port = Number(process.env.PORT) || 5000;

try {
  await connectDB();
  app.listen(port, () => console.log(`Atelier API listening on port ${port}`));
} catch (error) {
  console.error('Unable to start API:', error.message);
  process.exitCode = 1;
}
