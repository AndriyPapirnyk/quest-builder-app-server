const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const PORT = process.env.PORT || 8000;

const app = express();

app.get('/', (req, res) => {
  res.send('Hello World Testing');
});

app.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
});