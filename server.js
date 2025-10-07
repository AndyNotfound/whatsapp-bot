const app = require('./src/app');
const { createServer } = require('http');
const { initializeSocket } = require('./src/config/socket');

const PORT = process.env.PORT || 3000;

const httpServer = createServer(app);
initializeSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});