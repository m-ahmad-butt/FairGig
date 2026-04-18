require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    service: 'analytics-service',
    status: 'ok',
    message: 'Simple startup route',
    note: 'Includes analytics plus certificate placeholder boundary'
  });
});

const PORT = process.env.PORT || 8005;
app.listen(PORT, () => {
  console.log(`Analytics service running on port ${PORT}`);
});
