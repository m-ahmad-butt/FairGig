require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    service: 'grievance-service',
    status: 'ok',
    message: 'Simple startup route'
  });
});

const PORT = process.env.PORT || 8004;
app.listen(PORT, () => {
  console.log(`Grievance service running on port ${PORT}`);
});
