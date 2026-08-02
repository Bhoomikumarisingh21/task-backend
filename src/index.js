const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 1. Authentication Middleware (POST request ke liye)
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Bearer Token required' });
  }

  const token = authHeader.split(' ')[1];
  if (token !== (process.env.AUTH_TOKEN || 'mysecrettoken123')) {
    return res.status(403).json({ error: 'Forbidden: Invalid token' });
  }

  next();
};

// 2. POST /tasks (Create Task with validation)
app.post('/tasks', authMiddleware, async (req, res, next) => {
  try {
    const { title, description, status, dueDate } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'Validation Error: Title is required' });
    }

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description || null,
        status: status || 'Pending',
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    return res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

// 3. GET /tasks OR GET /tasks?status=Pending
app.get('/tasks', async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const tasks = await prisma.task.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
});

// 4. GET /tasks/:id (Single Task)
app.get('/tasks/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const task = await prisma.task.findUnique({ where: { id } });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    return res.status(200).json(task);
  } catch (error) {
    next(error);
  }
});

// 5. Global Error Handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});