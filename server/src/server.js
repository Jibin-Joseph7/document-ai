// server/src/server.js
const app = require('./app');
const config = require('./config');
require('./db/connection'); // opens DB + applies schema on boot

app.listen(config.port, () => {
  console.log(`document-ai server listening on http://localhost:${config.port}`);
});