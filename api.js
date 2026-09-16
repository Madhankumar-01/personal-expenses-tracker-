const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.errors ? data.errors.join(' ') : (data.error || 'Request failed');
    throw new Error(message);
  }
  return data;
}

export async function getExpenses(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  ).toString();
  const res = await fetch(`${API_BASE}/expenses${query ? `?${query}` : ''}`);
  return handleResponse(res);
}

export async function getExpense(id) {
  const res = await fetch(`${API_BASE}/expenses/${id}`);
  return handleResponse(res);
}

export async function createExpense(expense) {
  const res = await fetch(`${API_BASE}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  });
  return handleResponse(res);
}

export async function updateExpense(id, expense) {
  const res = await fetch(`${API_BASE}/expenses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  });
  return handleResponse(res);
}

export async function deleteExpense(id) {
  const res = await fetch(`${API_BASE}/expenses/${id}`, { method: 'DELETE' });
  return handleResponse(res);
}

export async function getSummary() {
  const res = await fetch(`${API_BASE}/summary`);
  return handleResponse(res);
}

export const CATEGORIES = [
  'Food', 'Transport', 'Housing', 'Utilities', 'Entertainment',
  'Health', 'Shopping', 'Education', 'Savings', 'Other'
];
