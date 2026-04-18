require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { createHealthRouter } = require('./routes/healthRoutes');
const { createCertificateRouter } = require('./routes/certificateRoutes');

const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.PORT || 4004);

app.use(cors());
app.use(express.json());

app.use(createHealthRouter(prisma));
app.use(createCertificateRouter());

app.listen(port, '0.0.0.0', () => {
  console.log('certificate-service listening on port ' + port);
});
