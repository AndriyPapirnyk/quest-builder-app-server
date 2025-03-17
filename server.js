const express = require('express');
const dotenv = require('dotenv');
const mongoose = require("mongoose");
const cors = require('cors');
dotenv.config();
const PORT = process.env.PORT || 8000;
const url = process.env.MONGODB_URL;

const app = express();
app.use(cors());

app.get('/', (req, res) => {
  res.send('Hello World Testing and connected to mongodb');
});

app.get('/get-data', (req, res) => {
  res.send('Hello from server');
});

async function connect() {
  try {  
    await mongoose.connect(url);
    console.log(`Connected to mongodb`);
  } catch (error) {
    console.error(`Connection error: ${error}`);
  }
};

connect();

app.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
});