const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const config = require('./config');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Document AI API is running',
    environment: config.env
  });
});

app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

app.listen(config.port, () => {
  console.log(`Document AI API running on http://localhost:${config.port}`);
});