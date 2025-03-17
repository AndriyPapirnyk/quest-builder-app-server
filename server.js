const express = require('express');
const dotenv = require('dotenv');
const mongoose = require("mongoose");
const cors = require('cors');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
dotenv.config();
const PORT = process.env.PORT || 8000;
const url = process.env.MONGODB_URL;

const corsOptions = {
  origin: 'http://localhost:5173', // Замість цього вказуємо адресу вашого фронтенду
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true 
};

const app = express();
app.use(cors(corsOptions));
app.use(express.json());

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

// user schema 

const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const quizSchema = new mongoose.Schema({
  title: String,
  description: String,
  questions: Array,
  createdBy: mongoose.Schema.Types.ObjectId,
});

const User = mongoose.model("User", UserSchema);
const Quiz = mongoose.model("Quiz", quizSchema);


// registration

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    console.log(username, password);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: "Користувач створений" });
  } catch (error) {
    res.status(400).json({ error: "Помилка реєстрації" });
  }
});

// Логін
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (!user) return res.status(401).json({ error: "Невірний логін або пароль" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ error: "Невірний логін або пароль" });

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
  res.json({ token });
});

// Перевірка аутентифікації
const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.status(403).json({ error: "Доступ заборонено" });

  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
    req.user = decoded;
    console.log("Decoded", req.user);
    next();
  } catch (error) {
    res.status(401).json({ error: "Невірний токен" });
  }
};

// Захищений маршрут
app.get("/protected", authMiddleware, (req, res) => {
  res.json({ message: "Ви маєте доступ" });
});

// quizes

app.post("/quizzes", authMiddleware, async (req, res) => {
  try {
    const { title, description, questions } = req.body;

    if (!req.user || !req.user.userId) { // Використовуємо req.user.userId
      return res.status(400).json({ error: "Не вдалося отримати дані користувача" });
    }

    const newQuiz = new Quiz({
      title,
      description,
      questions,
      createdBy: req.user.userId, // Використовуємо req.user.userId
    });
    await newQuiz.save();
    res.status(201).json({ message: "Вікторина створена", quiz: newQuiz });
  } catch (error) {
    res.status(500).json({ error: "Помилка при створенні вікторини" });
    console.error(error);
  }
});


app.get('/quizzes', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const skip = (page - 1) * limit;

  const totalQuizzes = await Quiz.countDocuments();
  const quizzes = await Quiz.find().skip(skip).limit(limit);

  res.json({ quizzes, totalPages: Math.ceil(totalQuizzes / limit) });
});


// Отримання конкретної вікторини
app.get("/quizzes/:id", async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: "Вікторина не знайдена" });
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ error: "Помилка отримання вікторини" });
  }
});

// Оновлення вікторини (тільки автор)
app.put("/quizzes/:id", authMiddleware, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: "Вікторина не знайдена" });
    if (quiz.createdBy.toString() !== req.user.id) return res.status(403).json({ error: "Доступ заборонено" });

    Object.assign(quiz, req.body);
    await quiz.save();
    res.json({ message: "Вікторина оновлена", quiz });
  } catch (error) {
    res.status(500).json({ error: "Помилка оновлення вікторини" });
  }
});

// Видалення вікторини (тільки автор)
app.delete("/quizzes/:id", authMiddleware, async (req, res) => {
  try {
    console.log(req.params.id);
    const quiz = await Quiz.findById(req.params.id);
    console.log(quiz);
    if (!quiz) return res.status(404).json({ error: "Вікторина не знайдена" });
    if (quiz.createdBy.toString() !== req.user.userId) return res.status(403).json({ error: "Доступ заборонено" });

    await quiz.deleteOne();
    res.json({ message: "Вікторина видалена" });
  } catch (error) {
    res.status(500).json({ error: "Помилка видалення вікторини" });
  }
});



app.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
});