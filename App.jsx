import { useState, useEffect, useCallback } from 'react';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import FilterBar from './components/FilterBar';
import SummaryPanel from './components/SummaryPanel';
import ConfirmModal from './components/ConfirmModal';
import { getExpenses, createExpense, updateExpense, deleteExpense, getSummary } from './api';

const defaultFilters = {
  search: '', category: 'All', from: '', to: '', sortBy: 'date', order: 'DESC',
};

export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(defaultFilters);
  const [editingExpense, setEditingExpense] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [connectionError, setConnectionError] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getExpenses(filters);
      setExpenses(result.data);
      setFilteredTotal(result.total);
      setConnectionError(false);
    } catch (err) {
      setConnectionError(true);
      showToast(`Could not load expenses: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadSummary = useCallback(async () => {
    try {
      const data = await getSummary();
      setSummary(data);
    } catch {
      // summary is non-critical; fail silently
    }
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  async function handleCreateOrUpdate(formData) {
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, formData);
        showToast('Expense updated successfully.');
        setEditingExpense(null);
      } else {
        await createExpense(formData);
        showToast('Expense added successfully.');
      }
      await loadExpenses();
      await loadSummary();
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  }

  function handleEditClick(expense) {
    setEditingExpense(expense);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleCancelEdit() {
    setEditingExpense(null);
  }

  function handleDeleteClick(expense) {
    setConfirmTarget(expense);
  }

  async function handleConfirmDelete() {
    if (!confirmTarget) return;
    try {
      await deleteExpense(confirmTarget.id);
      showToast('Expense deleted.');
      if (editingExpense && editingExpense.id === confirmTarget.id) {
        setEditingExpense(null);
      }
      await loadExpenses();
      await loadSummary();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setConfirmTarget(null);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>💰 Personal Expense Tracker</h1>
        <p className="subtitle">Track, manage, and analyze your spending</p>
      </header>

      {connectionError && (
        <div className="banner banner-error">
          Cannot reach the backend API. Make sure the server is running on port 5000.
        </div>
      )}

      <main className="app-main">
        <section className="left-column">
          <ExpenseForm
            onSubmit={handleCreateOrUpdate}
            editingExpense={editingExpense}
            onCancelEdit={handleCancelEdit}
          />
        </section>

        <section className="right-column">
          <SummaryPanel
            summary={summary}
            filteredTotal={filteredTotal}
            filteredCount={expenses.length}
          />

          <FilterBar
            filters={filters}
            onChange={setFilters}
            onReset={() => setFilters(defaultFilters)}
          />

          <ExpenseList
            expenses={expenses}
            loading={loading}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
          />
        </section>
      </main>

      <ConfirmModal
        open={!!confirmTarget}
        title="Delete Expense"
        message={confirmTarget ? `Are you sure you want to delete "${confirmTarget.title}"? This cannot be undone.` : ''}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmTarget(null)}
      />

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
