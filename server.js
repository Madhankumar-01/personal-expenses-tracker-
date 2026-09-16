// Personal Expense Tracker - Backend (Express + better-sqlite3)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ---------- Database Setup ----------
const db = new Database(path.join(__dirname, 'expenses.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    amount REAL NOT NULL CHECK (amount > 0),
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

const VALID_CATEGORIES = [
  'Food', 'Transport', 'Housing', 'Utilities', 'Entertainment',
  'Health', 'Shopping', 'Education', 'Savings', 'Other'
];

// ---------- Validation Helper ----------
function validateExpense(body, isUpdate = false) {
  const errors = [];
  const { title, amount, category, date, notes } = body;

  if (!isUpdate || title !== undefined) {
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      errors.push('Title is required and cannot be empty.');
    } else if (title.length > 100) {
      errors.push('Title must be under 100 characters.');
    }
  }

  if (!isUpdate || amount !== undefined) {
    const numAmount = Number(amount);
    if (amount === undefined || amount === null || amount === '' || isNaN(numAmount)) {
      errors.push('Amount is required and must be a number.');
    } else if (numAmount <= 0) {
      errors.push('Amount must be greater than 0.');
    } else if (numAmount > 100000000) {
      errors.push('Amount is unrealistically large.');
    }
  }

  if (!isUpdate || category !== undefined) {
    if (!category || !VALID_CATEGORIES.includes(category)) {
      errors.push(`Category must be one of: ${VALID_CATEGORIES.join(', ')}.`);
    }
  }

  if (!isUpdate || date !== undefined) {
    if (!date || isNaN(Date.parse(date))) {
      errors.push('A valid date is required (YYYY-MM-DD).');
    } else if (new Date(date) > new Date(new Date().toDateString() + ' 23:59:59')) {
      errors.push('Date cannot be in the future.');
    }
  }

  if (notes !== undefined && notes !== null && notes.length > 500) {
    errors.push('Notes must be under 500 characters.');
  }

  return errors;
}

// ---------- Routes ----------

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Expense Tracker API running' });
});

// GET all expenses (supports search/filter/sort via query params)
app.get('/api/expenses', (req, res) => {
  try {
    const { category, search, from, to, sortBy = 'date', order = 'DESC' } = req.query;

    let query = 'SELECT * FROM expenses WHERE 1=1';
    const params = [];

    if (category && category !== 'All') {
      query += ' AND category = ?';
      params.push(category);
    }
    if (search) {
      query += ' AND (title LIKE ? OR notes LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (from) {
      query += ' AND date >= ?';
      params.push(from);
    }
    if (to) {
      query += ' AND date <= ?';
      params.push(to);
    }

    const allowedSort = ['date', 'amount', 'title', 'category', 'created_at'];
    const sortCol = allowedSort.includes(sortBy) ? sortBy : 'date';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortCol} ${sortOrder}`;

    const rows = db.prepare(query).all(...params);

    const total = rows.reduce((sum, r) => sum + r.amount, 0);

    res.json({ count: rows.length, total: Number(total.toFixed(2)), data: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch expenses.', details: err.message });
  }
});

// GET single expense by ID
app.get('/api/expenses/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid ID.' });

    const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'Expense not found.' });

    res.json(row);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch expense.', details: err.message });
  }
});

// POST create new expense
app.post('/api/expenses', (req, res) => {
  const errors = validateExpense(req.body);
  if (errors.length > 0) return res.status(400).json({ errors });

  try {
    const { title, amount, category, date, notes } = req.body;
    const stmt = db.prepare(`
      INSERT INTO expenses (title, amount, category, date, notes)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(title.trim(), Number(amount), category, date, notes || null);
    const newExpense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json(newExpense);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create expense.', details: err.message });
  }
});

// PUT update existing expense
app.put('/api/expenses/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid ID.' });

    const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Expense not found.' });

    const errors = validateExpense(req.body, true);
    if (errors.length > 0) return res.status(400).json({ errors });

    const title = req.body.title !== undefined ? req.body.title.trim() : existing.title;
    const amount = req.body.amount !== undefined ? Number(req.body.amount) : existing.amount;
    const category = req.body.category !== undefined ? req.body.category : existing.category;
    const date = req.body.date !== undefined ? req.body.date : existing.date;
    const notes = req.body.notes !== undefined ? req.body.notes : existing.notes;

    db.prepare(`
      UPDATE expenses
      SET title = ?, amount = ?, category = ?, date = ?, notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(title, amount, category, date, notes, id);

    const updated = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update expense.', details: err.message });
  }
});

// DELETE expense
app.delete('/api/expenses/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid ID.' });

    const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Expense not found.' });

    db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    res.json({ message: 'Expense deleted successfully.', id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete expense.', details: err.message });
  }
});

// GET summary/analytics
app.get('/api/summary', (req, res) => {
  try {
    const byCategory = db.prepare(`
      SELECT category, SUM(amount) as total, COUNT(*) as count
      FROM expenses GROUP BY category ORDER BY total DESC
    `).all();

    const totalRow = db.prepare('SELECT SUM(amount) as total, COUNT(*) as count FROM expenses').get();

    const byMonth = db.prepare(`
      SELECT strftime('%Y-%m', date) as month, SUM(amount) as total
      FROM expenses GROUP BY month ORDER BY month DESC LIMIT 12
    `).all();

    res.json({
      total: totalRow.total || 0,
      count: totalRow.count || 0,
      byCategory,
      byMonth
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch summary.', details: err.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`Expense Tracker API running on http://localhost:${PORT}`);
});
