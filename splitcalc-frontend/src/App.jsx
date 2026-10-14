const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
import { useMemo, useState } from 'react';
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, ArrowDownLeft, ArrowLeft, ArrowRight, Bell, Calculator, Check,
  ChevronDown, ChevronRight, CircleHelp, Clock3, Coffee, Compass, Home,
  LayoutDashboard, LogOut, Menu, MoreHorizontal, Plus, Search, Settings,
  SlidersHorizontal, Sparkles, Users, Wallet, X, Percent, ReceiptText,
  Fuel, Plane, Utensils, ShoppingBag, CarFront, Trash2
} from 'lucide-react';

const initialGroups = [
  { id: 1, name: 'Trip to Goa', people: 4, emoji: '🌴', color: 'mint', total: 8420, detail: '3 expenses this week' },
  { id: 2, name: 'Flatmates', people: 3, emoji: '🏡', color: 'lavender', total: 3150, detail: 'Updated yesterday' },
  { id: 3, name: 'College Friends', people: 6, emoji: '🎓', color: 'peach', total: 1875, detail: 'Updated 3 days ago' },
];
const initialExpenses = [
  { id: 1, title: 'Dinner at The Fisherman', group: 'Trip to Goa', category: 'Food & drink', icon: 'food', amount: 2400, paidBy: 'You', date: 'Today', split: 'Equal split' },
  { id: 2, title: 'Cab to the beach', group: 'Trip to Goa', category: 'Transport', icon: 'car', amount: 680, paidBy: 'Maya', date: 'Yesterday', split: 'Equal split' },
  { id: 3, title: 'Groceries', group: 'Flatmates', category: 'Home', icon: 'bag', amount: 1250, paidBy: 'Arjun', date: 'Oct 6', split: 'Custom split' },
  { id: 4, title: 'Coffee & snacks', group: 'College Friends', category: 'Food & drink', icon: 'coffee', amount: 540, paidBy: 'You', date: 'Oct 5', split: 'Equal split' },
];
const members = ['You', 'Maya', 'Arjun', 'Riya'];
const money = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const safeEvaluate = expression => {
  const cleaned = expression.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/%/g, '/100');
  if (!cleaned.trim() || !/^[\d+\-*/().\s]+$/.test(cleaned)) throw new Error('Check your expression');
  const tokens = cleaned.match(/(?:\d+\.?\d*|\.\d+|[()+\-*/])/g) || [];
  if (tokens.join('') !== cleaned.replace(/\s/g, '')) throw new Error('Invalid expression');
  const result = Function('"use strict"; return (' + cleaned + ')')();
  if (!Number.isFinite(result)) throw new Error('Cannot divide by zero');
  return Math.round((result + Number.EPSILON) * 100) / 100;
};
function IconFor({ type, size = 19 }) {
  const props = { size, strokeWidth: 1.8 };
  if (type === 'food') return <Utensils {...props}/>;
  if (type === 'car') return <CarFront {...props}/>;
  if (type === 'bag') return <ShoppingBag {...props}/>;
  if (type === 'coffee') return <Coffee {...props}/>;
  if (type === 'fuel') return <Fuel {...props}/>;
  if (type === 'plane') return <Plane {...props}/>;
  return <ReceiptText {...props}/>;
}
function Avatar({ name = 'You', size = 'md' }) {
  const initials = name === 'You' ? 'YO' : name.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
  const colors = { You: 'green', Maya: 'purple', Arjun: 'blue', Riya: 'orange' };
  return <span className={`avatar avatar-${size} avatar-${colors[name] || 'green'}`}>{initials}</span>;
}
function App() {
  const [groups, setGroups] = useState(initialGroups);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [activeGroup, setActiveGroup] = useState('Trip to Goa');
  const [showCalculator, setShowCalculator] = useState(false);
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const notify = msg => { setToast(msg); window.setTimeout(() => setToast(''), 2600); };
  const addExpense = expense => {
    setExpenses(prev => [{ ...expense, id: Date.now(), date: 'Just now' }, ...prev]);
    setGroups(prev => prev.map(g => g.name === expense.group ? { ...g, total: g.total + Number(expense.amount) } : g));
    setShowCalculator(false);
    navigate('/expenses');
    notify('Expense saved successfully');
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <NavLink to="/" className="brand"><span className="brand-mark"><Wallet size={21}/></span><span>split<span className="brand-accent">calc</span></span><span className="beta">BETA</span></NavLink>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="main-nav">
        <NavLink to="/" end><LayoutDashboard/> <span>Overview</span></NavLink>
        <NavLink to="/groups"><Users/><span>Groups</span><span className="nav-count">3</span></NavLink>
        <NavLink to="/expenses"><ReceiptText/><span>All expenses</span></NavLink>
        <NavLink to="/balances"><Activity/><span>Balances</span></NavLink>
      </nav>
      <div className="side-section-head"><span>YOUR GROUPS</span><button className="icon-button tiny" onClick={() => notify('Group creation can be connected to your backend next.')} aria-label="Add group"><Plus size={16}/></button></div>
      <div className="side-groups">
        {groups.map(g => <button key={g.id} className={`side-group ${activeGroup === g.name ? 'selected' : ''}`} onClick={() => {setActiveGroup(g.name); navigate('/groups');}}>
          <span className={`group-emoji ${g.color}`}>{g.emoji}</span><span className="side-group-name">{g.name}</span><ChevronRight size={15} className="muted-icon"/>
        </button>)}
      </div>
      <div className="sidebar-bottom">
        <div className="help-card"><span className="help-icon"><Sparkles size={17}/></span><strong>Split smarter</strong><p>Calculate a bill before you split it.</p><button onClick={() => setShowCalculator(true)}>Try calculator <ArrowRight size={14}/></button></div>
        <button className="profile-row" onClick={() => notify('Profile settings coming soon')}><Avatar name="You"/><span><strong>Alex Morgan</strong><small>Personal workspace</small></span><MoreHorizontal size={19}/></button>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14}/><strong>{routeTitle(location.pathname)}</strong></div>
        <div className="top-actions">
          <label className="search-box"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search expenses..." /></label>
          <button className="icon-button notification" onClick={() => notify('You’re all caught up!')} aria-label="Notifications"><Bell size={18}/><i/></button>
          <Avatar name="You"/>
        </div>
      </header>
      <div className="page-content">
        <Routes>
          <Route path="/" element={<Dashboard groups={groups} expenses={expenses} onAdd={() => navigate('/add-expense')} onCalculator={() => setShowCalculator(true)} onGroup={g => {setActiveGroup(g); navigate('/groups');}} search={search}/>}/>
          <Route path="/groups" element={<GroupsPage groups={groups} expenses={expenses} activeGroup={activeGroup} setActiveGroup={setActiveGroup} onAdd={() => navigate('/add-expense')} search={search}/>}/>
          <Route path="/expenses" element={<ExpensesPage expenses={expenses} onAdd={() => navigate('/add-expense')} search={search}/>}/>
          <Route path="/balances" element={<BalancesPage expenses={expenses}/>}/>
          <Route path="/add-expense" element={<AddExpense groups={groups} onSave={addExpense} onCalculator={() => setShowCalculator(true)} notify={notify}/>}/>
          <Route path="*" element={<Dashboard groups={groups} expenses={expenses} onAdd={() => navigate('/add-expense')} onCalculator={() => setShowCalculator(true)} onGroup={g => {setActiveGroup(g); navigate('/groups');}} search={search}/>}/>
        </Routes>
      </div>
    </main>

    {showCalculator && <CalculatorModal onClose={() => setShowCalculator(false)} onUseResult={amount => {
      sessionStorage.setItem('splitcalc-calculated-amount', String(amount));
      setShowCalculator(false);
      if (location.pathname !== '/add-expense') navigate('/add-expense');
      notify(`${money(amount)} ready to use in your expense`);
    }}/>}
    {toast && <div className="toast"><span className="toast-check"><Check size={15}/></span>{toast}<button onClick={() => setToast('')}><X size={15}/></button></div>}
  </div>;
}
function routeTitle(path) {
  if (path === '/') return 'Overview';
  if (path.startsWith('/groups')) return 'Groups';
  if (path.startsWith('/expenses')) return 'All expenses';
  if (path.startsWith('/balances')) return 'Balances';
  if (path.startsWith('/add-expense')) return 'Add expense';
  return 'Overview';
}
function PageHeading({ eyebrow, title, subtitle, action }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>;
}
function Dashboard({ groups, expenses, onAdd, onCalculator, onGroup, search }) {
  const filtered = expenses.filter(e => `${e.title} ${e.group} ${e.paidBy}`.toLowerCase().includes(search.toLowerCase()));
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  return <>
    <PageHeading eyebrow="THURSDAY, OCTOBER 9" title="Good morning, Alex 👋" subtitle="Here's what's happening with your shared expenses." action={<button className="button primary" onClick={onAdd}><Plus size={17}/> Add an expense</button>}/>
    <section className="welcome-banner"><div className="welcome-copy"><span className="banner-pill"><Sparkles size={13}/> YOUR MONEY, IN SYNC</span><h2>Good friends. Clear balances.</h2><p>Keep tabs on shared spending and settle up without the awkward math.</p><button className="button banner-button" onClick={onCalculator}><Calculator size={16}/> Open smart calculator <ArrowRight size={15}/></button></div><div className="banner-art"><div className="art-circle circle-one"/><div className="art-circle circle-two"/><div className="receipt-art"><span>DINNER BILL</span><strong>₹ 2,400</strong><div/><small>÷ 4 friends</small><b>₹ 600 each</b></div><span className="float-chip chip-a"><Check size={14}/> Split evenly</span><span className="float-chip chip-b"><Calculator size={15}/> Quick math</span></div></section>
    <section className="stats-grid">
      <StatCard label="Total tracked" value={money(total)} detail="Across your recent expenses" icon={<Wallet/>} tone="green"/>
      <StatCard label="You are owed" value={money(1150)} detail="From 2 friends" icon={<ArrowDownLeft/>} tone="blue"/>
      <StatCard label="You owe" value={money(575.67)} detail="Across 2 groups" icon={<Activity/>} tone="orange"/>
    </section>
    <div className="section-heading"><div><h2>Your groups</h2><p>Shared spaces for the people in your life</p></div><NavLink to="/groups" className="text-link">View all <ArrowRight size={15}/></NavLink></div>
    <section className="groups-grid">{groups.map(g => <button className="group-card" key={g.id} onClick={() => onGroup(g.name)}><div className={`group-card-icon ${g.color}`}>{g.emoji}</div><div className="group-card-top"><span className="member-count"><Users size={13}/>{g.people} members</span><MoreHorizontal size={18} className="muted-icon"/></div><h3>{g.name}</h3><p>{g.detail}</p><div className="group-card-footer"><span>Total expenses</span><strong>{money(g.total)}</strong></div><div className="group-progress"><span style={{width: `${Math.min(92, 28 + g.people * 9)}%`}}/></div></button>)}</section>
    <div className="section-heading recent-heading"><div><h2>Recent expenses</h2><p>Your latest shared spending, all in one place</p></div><NavLink to="/expenses" className="text-link">All expenses <ArrowRight size={15}/></NavLink></div>
    <ExpenseTable expenses={filtered.slice(0, 4)}/>
  </>;
}
function StatCard({ label, value, detail, icon, tone }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-detail">{detail}</span></div>;
}
function ExpenseTable({ expenses }) {
  if (!expenses.length) return <div className="empty-state"><ReceiptText size={28}/><strong>No matching expenses</strong><p>Try another search or add a new expense.</p></div>;
  return <div className="table-card"><div className="expense-table-head"><span>EXPENSE</span><span>GROUP</span><span>PAID BY</span><span>DATE</span><span className="align-right">AMOUNT</span></div>{expenses.map(e => <div className="expense-row" key={e.id}><div className="expense-name"><span className={`expense-icon ${e.icon}`}><IconFor type={e.icon}/></span><span><strong>{e.title}</strong><small>{e.category}</small></span></div><span className="table-group">{e.group}</span><span className="paid-by"><Avatar name={e.paidBy} size="sm"/>{e.paidBy}</span><span className="date-text">{e.date}</span><span className="amount-cell">{money(e.amount)}<small>{e.split}</small></span></div>)}</div>;
}
function GroupsPage({ groups, expenses, activeGroup, setActiveGroup, onAdd, search }) {
  const group = groups.find(g => g.name === activeGroup) || groups[0];
  const rows = expenses.filter(e => e.group === group.name && `${e.title} ${e.paidBy}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <PageHeading eyebrow="YOUR PEOPLE" title="Groups" subtitle="Every shared plan, trip, and household in one place." action={<button className="button primary" onClick={onAdd}><Plus size={17}/> Add an expense</button>}/>
    <div className="groups-layout"><div className="group-picker">{groups.map(g => <button key={g.id} className={`group-picker-item ${g.name === group.name ? 'active' : ''}`} onClick={() => setActiveGroup(g.name)}><span className={`group-card-icon ${g.color}`}>{g.emoji}</span><span><strong>{g.name}</strong><small>{g.people} members · {money(g.total)}</small></span><ChevronRight size={17}/></button>)}</div><div className="group-detail-card"><div className="group-detail-banner"><span className={`group-card-icon ${group.color}`}>{group.emoji}</span><div><h2>{group.name}</h2><p>{group.people} members · Created by you</p></div><button className="button secondary compact" onClick={onAdd}><Plus size={15}/> Add expense</button></div><div className="member-strip"><span className="eyebrow">MEMBERS</span><div className="avatar-stack">{members.slice(0, Math.min(group.people, 4)).map(n => <Avatar key={n} name={n}/>) }<span className="extra-members">+{Math.max(0, group.people - 4)}</span></div></div><div className="section-heading inline-heading"><div><h2>Group expenses</h2><p>Activity in {group.name}</p></div><strong>{money(group.total)}</strong></div><ExpenseTable expenses={rows}/></div></div>
  </>;
}
function ExpensesPage({ expenses, onAdd, search }) {
  const filtered = expenses.filter(e => `${e.title} ${e.group} ${e.paidBy} ${e.category}`.toLowerCase().includes(search.toLowerCase()));
  return <><PageHeading eyebrow="ACTIVITY" title="All expenses" subtitle="A clear history of every shared purchase." action={<button className="button primary" onClick={onAdd}><Plus size={17}/> Add an expense</button>}/><div className="filter-bar"><span><SlidersHorizontal size={16}/> All activity</span><span className="filter-count">{filtered.length} expenses</span></div><ExpenseTable expenses={filtered}/></>;
}
function BalancesPage({ expenses }) {
  return <><PageHeading eyebrow="SETTLE UP" title="Balances" subtitle="Know where you stand and keep things fair." action={<button className="button secondary" onClick={() => window.alert('Settlement flow can be connected to your backend next.')}><Activity size={16}/> Settle up</button>}/><div className="balance-overview"><div><span className="stat-label">Overall, you are owed</span><strong className="balance-positive">{money(1150)}</strong><p>You're in the green. Nice!</p></div><div className="balance-illustration">₹<span>↗</span></div></div><div className="section-heading"><div><h2>People</h2><p>Your current balances with friends</p></div></div><div className="balances-card">{[{name:'Maya',group:'Trip to Goa',value:850,positive:true},{name:'Arjun',group:'Flatmates',value:575.67,positive:false},{name:'Riya',group:'Trip to Goa',value:300,positive:true},{name:'Sam',group:'College Friends',value:220,positive:false}].map(p=><div className="balance-row" key={p.name}><Avatar name={p.name}/><div className="balance-person"><strong>{p.name}</strong><small>{p.group}</small></div><div className="balance-amount"><strong className={p.positive?'balance-positive':'balance-negative'}>{p.positive?'+':'−'}{money(p.value)}</strong><small>{p.positive?'owes you':'you owe'}</small></div><button className="button secondary compact" onClick={() => window.alert(`Settlement with ${p.name} can be added in the backend phase.`)}>Settle up</button></div>)}</div><p className="small-note"><CircleHelp size={14}/> Demo balances for the frontend prototype. Connect your API to calculate real balances.</p></>;
}
function AddExpense({ groups, onSave, onCalculator, notify }) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState(() => {
    const value = sessionStorage.getItem('splitcalc-calculated-amount');
    if (value) { sessionStorage.removeItem('splitcalc-calculated-amount'); return value; }
    return '';
  });
  const [group, setGroup] = useState(groups[0]?.name || 'Trip to Goa');
  const [paidBy, setPaidBy] = useState('You');
  const [splitType, setSplitType] = useState('Equal');
  const [selected, setSelected] = useState(['You', 'Maya', 'Arjun']);
  const [custom, setCustom] = useState({});
  const [date, setDate] = useState('2026-10-09');
  const [description, setDescription] = useState('');
  const [showSplit, setShowSplit] = useState(false);
  const total = Number(amount) || 0;
  const splitTotal = selected.length || 1;
  const each = total / splitTotal;
  const [taxRate, setTaxRate] = useState('0');
  const finalAmount = total * (1 + Number(taxRate || 0) / 100);
  const toggleMember = name => setSelected(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  const save = e => {
    e.preventDefault();
    if (!title.trim()) return notify('Add a description for this expense');
    if (!total || total < 0) return notify('Enter a valid amount');
    if (!selected.length) return notify('Choose at least one person to split with');
    onSave({ title: title.trim(), group, amount: finalAmount, paidBy, date: 'Just now', split: `${splitType} split`, icon: 'food', category: description || 'Shared expense' });
  };
  return <><button className="back-link" onClick={() => history.back()}><ArrowLeft size={16}/> Back</button><PageHeading eyebrow="NEW TRANSACTION" title="Add an expense" subtitle="Add the details, calculate your total, then split it fairly."/><form className="expense-form-layout" onSubmit={save}><div className="form-main-card">
    <div className="form-section-title"><span className="step-number">1</span><div><h2>Expense details</h2><p>What was this expense for?</p></div></div>
    <label className="field-label">Description <span className="required">*</span><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Dinner at the beach" required/></label>
    <label className="field-label">Group<select value={group} onChange={e=>setGroup(e.target.value)}>{groups.map(g=><option key={g.id}>{g.name}</option>)}</select></label>
    <div className="field-label">Amount <span className="required">*</span><div className="amount-input-wrap"><span>₹</span><input type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" required/><button type="button" className="amount-calc-button" onClick={onCalculator}><Calculator size={18}/><span>Calculator</span></button></div><small className="field-hint">Use the smart calculator to add items, tax, and tips without leaving this page.</small></div>
    <button type="button" className="calculator-inline-cta" onClick={onCalculator}><span className="calc-cta-icon"><Calculator size={19}/></span><span><strong>Open smart calculator</strong><small>Work out the bill, then use the result here</small></span><ChevronRight size={18}/></button>
    <div className="field-grid"><label className="field-label">Paid by<select value={paidBy} onChange={e=>setPaidBy(e.target.value)}>{members.map(m=><option key={m}>{m}</option>)}</select></label><label className="field-label">Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div>
    <div className="form-divider"/>
    <div className="form-section-title"><span className="step-number">2</span><div><h2>Split between</h2><p>Who should share this expense?</p></div></div>
    <div className="member-checkboxes">{members.map((m,i)=><button type="button" key={m} className={`member-check ${selected.includes(m)?'checked':''}`} onClick={()=>toggleMember(m)}><Avatar name={m}/><span><strong>{m}</strong><small>{i===0?'That’s you':'Group member'}</small></span><span className="fake-checkbox">{selected.includes(m)&&<Check size={13}/>}</span></button>)}</div>
    <div className="split-type-tabs">{['Equal','Percentage','Custom'].map(t=><button type="button" key={t} className={splitType===t?'active':''} onClick={()=>setSplitType(t)}>{t==='Percentage'&&<Percent size={14}/>} {t} split</button>)}</div>
    {splitType==='Equal'?<div className="split-summary"><div><span>Each person pays</span><strong>{money(each)}</strong></div><span className="summary-people">{selected.length} people · Equal split</span></div>:splitType==='Percentage'?<div className="custom-split-list">{selected.map((m,i)=><label key={m}>{m}<span><input type="number" min="0" max="100" defaultValue={Math.floor(100/selected.length)} /> %</span></label>)}</div>:<div className="custom-split-list">{selected.map(m=><label key={m}>{m}<span>₹ <input type="number" min="0" placeholder="0.00" value={custom[m]||''} onChange={e=>setCustom(p=>({...p,[m]:e.target.value}))}/></span></label>)}</div>}
    <div className="form-divider"/>
    <div className="form-section-title"><span className="step-number">3</span><div><h2>Optional details</h2><p>Make the expense easier to find later.</p></div></div>
    <label className="field-label">Category / notes<input value={description} onChange={e=>setDescription(e.target.value)} placeholder="e.g. Food & drink"/></label>
  </div><aside className="form-summary-card"><span className="summary-kicker"><Sparkles size={14}/> EXPENSE SUMMARY</span><h3>Ready to split?</h3><p>Review your total before saving it to the group.</p><div className="summary-total"><span>Total amount</span><strong>{money(finalAmount)}</strong><small>{amount?`Base amount ${money(total)}`:'Enter an amount to get started'}</small></div><label className="field-label tax-field">Add tax / GST <select value={taxRate} onChange={e=>setTaxRate(e.target.value)}><option value="0">No extra tax</option><option value="5">5% GST</option><option value="12">12% GST</option><option value="18">18% GST</option></select></label><div className="summary-line"><span>Paid by</span><span className="summary-member"><Avatar name={paidBy} size="sm"/>{paidBy}</span></div><div className="summary-line"><span>Split with</span><strong>{selected.length} people</strong></div><div className="summary-line"><span>Split type</span><strong>{splitType}</strong></div><div className="summary-each"><span>Per person (estimate)</span><strong>{money(finalAmount/(selected.length||1))}</strong></div><button type="submit" className="button primary full-width"><Check size={17}/> Save expense</button><p className="secure-note"><Check size={13}/> You can edit this expense later.</p></aside></form></>;
}
function CalculatorModal({ onClose, onUseResult }) {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('Basic');
  const [showHistory, setShowHistory] = useState(false);
  const append = value => { setExpression(prev => prev + value); setError(''); };
  const clear = () => {setExpression('');setResult(null);setError('');};
  const calculate = () => {
    try {
      const value = safeEvaluate(expression);
      setResult(value); setError('');
      setHistory(prev => [{expression, result:value}, ...prev].slice(0, 8));
    } catch (e) { setError(e.message || 'Enter a valid calculation'); setResult(null); }
  };
  const useResult = () => {
    let value = result;
    if (value === null) { try { value = safeEvaluate(expression); } catch { setError('Enter a valid calculation first'); return; } }
    onUseResult(value);
  };
  const keys = [
    ['C','clear'],['(', 'op'],[')', 'op'],['%', 'op'],
    ['7','num'],['8','num'],['9','num'],['÷','op'],
    ['4','num'],['5','num'],['6','num'],['×','op'],
    ['1','num'],['2','num'],['3','num'],['−','op'],
    ['0','num'],['.','num'],['⌫','delete'],['+','op']
  ];
  const quick = (kind) => {
    try {
      let value;
      if (kind === 'GST') { value = safeEvaluate(expression || '0') * .18; setExpression(`${expression || '0'} + (${expression || '0'} × 18%)`); }
      if (kind === 'Tip') { value = safeEvaluate(expression || '0') * .1; setExpression(`${expression || '0'} + (${expression || '0'} × 10%)`); }
      if (kind === 'Split') { setExpression(`${expression || '0'} ÷ ${Math.max(2, members.length)}`); }
      setResult(null); setError('');
    } catch { setError('Enter an amount first'); }
  };
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section className="calculator-modal" role="dialog" aria-modal="true" aria-labelledby="calculator-title"><header className="calculator-header"><div className="calculator-title-icon"><Calculator size={20}/></div><div><h2 id="calculator-title">Smart calculator</h2><p>Calculate first. Split second.</p></div><button className="icon-button modal-close" onClick={onClose} aria-label="Close calculator"><X size={19}/></button></header><div className="calculator-tabs">{['Basic','Split','Tip','GST'].map(t=><button key={t} className={tab===t?'active':''} onClick={()=>{setTab(t);if(t==='Split')quick('Split');if(t==='Tip')quick('Tip');if(t==='GST')quick('GST');}}>{t==='GST'?<Percent size={13}/>:null}{t}</button>)}</div><div className="calculator-display"><span className="display-label">{result!==null?'RESULT':'YOUR CALCULATION'}</span><div className="expression-line">{expression||'0'}<button onClick={()=>setShowHistory(v=>!v)} className="history-toggle"><Clock3 size={14}/> History</button></div><div className="result-line"><span>=</span>{result!==null?money(result):<span className="result-placeholder">—</span>}</div>{error&&<small className="calc-error">{error}</small>}</div>{showHistory&&<div className="calc-history">{history.length?history.map((h,i)=><button key={i} onClick={()=>{setExpression(h.expression);setResult(h.result);setShowHistory(false);}}><span>{h.expression}</span><strong>{money(h.result)}</strong></button>):<p>No calculations yet. Your results will appear here.</p>}</div>}<div className="calculator-keypad">{keys.map(([label,type])=><button key={label} className={`calc-key ${type==='op'?'operator':''} ${type==='clear'?'clear-key':''} ${type==='delete'?'delete-key':''}`} onClick={()=>type==='clear'?clear():type==='delete'?(setExpression(p=>p.slice(0,-1)),setError('')):append(label)}>{label}</button>)}<button className="calc-key equals-key" onClick={calculate}>=</button></div><div className="quick-actions"><span className="eyebrow">QUICK ACTIONS</span><div><button onClick={()=>{append('(');setTab('Basic')}}><span className="quick-action-icon">±</span>Sign / bracket</button><button onClick={()=>quick('GST')}><span className="quick-action-icon"><Percent size={17}/></span>18% GST</button><button onClick={()=>quick('Tip')}><span className="quick-action-icon">10%</span>10% tip</button><button onClick={()=>quick('Split')}><span className="quick-action-icon"><Users size={17}/></span>Split 4 ways</button></div></div><footer className="calculator-footer"><button className="button secondary" onClick={clear}>Clear</button><button className="button primary" onClick={useResult}><Check size={16}/> Use result <ArrowRight size={15}/></button></footer><p className="calculator-disclaimer">Your calculation stays in this prototype until you use the result.</p></section></div>;
}
export default App;
