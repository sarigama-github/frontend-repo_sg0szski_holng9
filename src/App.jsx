import { useEffect, useMemo, useState } from 'react'

function formatCurrency(n) {
  if (isNaN(n)) return '$0.00'
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

function App() {
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [transactions, setTransactions] = useState([])
  const [budgets, setBudgets] = useState([])
  const [insights, setInsights] = useState(null)

  const [txForm, setTxForm] = useState({ amount: '', category: '', date: new Date().toISOString().slice(0,10), notes: '', account: '' })
  const [budgetForm, setBudgetForm] = useState({ category: '', amount: '', period: 'monthly' })

  const [chatInput, setChatInput] = useState('How am I doing this month?')
  const [chatReply, setChatReply] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  const refreshAll = async () => {
    setLoading(true)
    setError('')
    try {
      const [txRes, bRes] = await Promise.all([
        fetch(`${baseUrl}/api/transactions`).then(r => r.json()),
        fetch(`${baseUrl}/api/budgets`).then(r => r.json()),
      ])
      setTransactions(txRes.items || [])
      setBudgets(bRes.items || [])
      // also refresh insights via chat endpoint silently
      const chatRes = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'summary' })
      }).then(r => r.json())
      setInsights(chatRes.insights || null)
      setChatReply(chatRes.reply || '')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onAddTransaction = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const payload = {
        amount: parseFloat(txForm.amount),
        category: txForm.category || 'uncategorized',
        date: txForm.date,
        notes: txForm.notes || undefined,
        account: txForm.account || undefined,
      }
      if (!payload.amount || isNaN(payload.amount)) throw new Error('Enter a valid amount')
      if (!payload.category) throw new Error('Enter a category')
      await fetch(`${baseUrl}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => {
        if (!r.ok) throw new Error('Failed to add transaction')
        return r.json()
      })
      setTxForm({ amount: '', category: '', date: new Date().toISOString().slice(0,10), notes: '', account: '' })
      await refreshAll()
    } catch (e) {
      setError(e.message)
    }
  }

  const onAddBudget = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const payload = {
        category: budgetForm.category || 'general',
        amount: parseFloat(budgetForm.amount || '0'),
        period: budgetForm.period,
      }
      if (!payload.category) throw new Error('Enter a category')
      if (isNaN(payload.amount)) throw new Error('Enter a valid budget amount')
      await fetch(`${baseUrl}/api/budgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => {
        if (!r.ok) throw new Error('Failed to add budget')
        return r.json()
      })
      setBudgetForm({ category: '', amount: '', period: 'monthly' })
      await refreshAll()
    } catch (e) {
      setError(e.message)
    }
  }

  const askChat = async () => {
    if (!chatInput.trim()) return
    setChatLoading(true)
    try {
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: chatInput })
      })
      const data = await res.json()
      setChatReply(data.reply || '')
      setInsights(data.insights || null)
    } catch (e) {
      setError(e.message)
    } finally {
      setChatLoading(false)
    }
  }

  const summary = useMemo(() => insights?.summary || { income: 0, expense: 0, net: 0 }, [insights])

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sky-50">
      <header className="sticky top-0 backdrop-blur bg-white/70 border-b border-emerald-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-emerald-700">Finance Buddy</h1>
          <nav className="text-sm text-gray-600">Smart tracking + chat insights</nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-700 border border-red-200 rounded">{error}</div>
        )}

        {/* Summary cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-5 border border-emerald-100">
            <div className="text-sm text-gray-500">Income</div>
            <div className="text-2xl font-semibold text-emerald-700">{formatCurrency(summary.income || 0)}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-5 border border-emerald-100">
            <div className="text-sm text-gray-500">Expenses</div>
            <div className="text-2xl font-semibold text-rose-600">{formatCurrency(summary.expense || 0)}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-5 border border-emerald-100">
            <div className="text-sm text-gray-500">Net</div>
            <div className={`text-2xl font-semibold ${((summary.net || 0) >= 0) ? 'text-emerald-700' : 'text-rose-600'}`}>{formatCurrency(summary.net || 0)}</div>
          </div>
        </section>

        {/* Entry + Chat */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: forms and lists */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow border border-emerald-100 p-5">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">Add Transaction</h2>
              <form onSubmit={onAddTransaction} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <input type="number" step="0.01" placeholder="Amount (use negative for expense)" className="col-span-1 sm:col-span-2 px-3 py-2 rounded border" value={txForm.amount} onChange={e => setTxForm(v => ({ ...v, amount: e.target.value }))} />
                <input type="text" placeholder="Category" className="px-3 py-2 rounded border" value={txForm.category} onChange={e => setTxForm(v => ({ ...v, category: e.target.value }))} />
                <input type="date" className="px-3 py-2 rounded border" value={txForm.date} onChange={e => setTxForm(v => ({ ...v, date: e.target.value }))} />
                <button className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700">Add</button>
                <input type="text" placeholder="Notes (optional)" className="sm:col-span-3 px-3 py-2 rounded border" value={txForm.notes} onChange={e => setTxForm(v => ({ ...v, notes: e.target.value }))} />
                <input type="text" placeholder="Account (optional)" className="sm:col-span-2 px-3 py-2 rounded border" value={txForm.account} onChange={e => setTxForm(v => ({ ...v, account: e.target.value }))} />
              </form>
            </div>

            <div className="bg-white rounded-xl shadow border border-emerald-100 p-5">
              <h2 className="text-lg font-semibold mb-3 text-gray-800">Transactions</h2>
              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="py-2 pr-4">Date</th>
                        <th className="py-2 pr-4">Category</th>
                        <th className="py-2 pr-4 text-right">Amount</th>
                        <th className="py-2 pr-4">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.length === 0 && (
                        <tr><td className="py-3 text-gray-400" colSpan={4}>No transactions yet. Add your first above.</td></tr>
                      )}
                      {transactions.map((t) => (
                        <tr key={t.id} className="border-b last:border-b-0">
                          <td className="py-2 pr-4">{t.date}</td>
                          <td className="py-2 pr-4 capitalize">{t.category}</td>
                          <td className={`py-2 pr-4 text-right font-medium ${t.amount < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{formatCurrency(t.amount)}</td>
                          <td className="py-2 pr-4">{t.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow border border-emerald-100 p-5">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">Set Budget</h2>
              <form onSubmit={onAddBudget} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input type="text" placeholder="Category" className="px-3 py-2 rounded border" value={budgetForm.category} onChange={e => setBudgetForm(v => ({ ...v, category: e.target.value }))} />
                <input type="number" step="0.01" placeholder="Amount" className="px-3 py-2 rounded border" value={budgetForm.amount} onChange={e => setBudgetForm(v => ({ ...v, amount: e.target.value }))} />
                <select className="px-3 py-2 rounded border" value={budgetForm.period} onChange={e => setBudgetForm(v => ({ ...v, period: e.target.value }))}>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                </select>
                <button className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700">Save</button>
              </form>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {budgets.length === 0 && (
                  <p className="text-gray-500">No budgets yet.</p>
                )}
                {budgets.map(b => (
                  <div key={b.id} className="border rounded-lg p-3">
                    <div className="text-sm text-gray-500">{b.period}</div>
                    <div className="font-semibold capitalize">{b.category}</div>
                    <div className="text-emerald-700">{formatCurrency(b.amount)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Chat + Insights */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow border border-emerald-100 p-5 sticky top-24">
              <h2 className="text-lg font-semibold mb-3 text-gray-800">AI Chatbot</h2>
              <div className="space-y-3">
                <div className="text-sm p-3 rounded bg-gray-50 border text-gray-700 min-h-[60px]">
                  {chatLoading ? 'Thinking…' : (chatReply || 'Ask for a summary, tips to save, or check budgets.')}
                </div>
                <div className="flex gap-2">
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') askChat() }} placeholder="Ask anything about your finances" className="flex-1 px-3 py-2 rounded border" />
                  <button onClick={askChat} className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700">Ask</button>
                </div>
                {insights?.tips?.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs uppercase text-gray-500 mb-1">Tips</div>
                    <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                      {insights.tips.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-10 text-center text-sm text-gray-500">
        Built with ❤️ — Track income, expenses, and get smart guidance.
      </footer>
    </div>
  )
}

export default App
