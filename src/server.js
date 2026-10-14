const createApp = require('./app');
const config = require('./config');
const { connectMongo } = require('./db/mongo');

async function start() {
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET is required. Add it to your .env file.');
  }

  await connectMongo();
  const app = createApp();

  app.listen(config.port, () => {
    console.log(`API is running at http://localhost:${config.port}`);
  });
}

start().catch((error) => {
  console.error('Could not start the API:', error.message);
  process.exit(1);
});
