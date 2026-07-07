const { createClient } = require('redis');

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Connection Error', err));
redisClient.on('connect', () => console.log('Redis Cache Connected...'));

// Connect asynchronously 
(async () => {
  await redisClient.connect();
})();

module.exports = redisClient;