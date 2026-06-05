import React, { useState, useEffect } from 'react';
import { Project, Payment, Contact, CloudDocument } from '../types';
import { DollarSign, FileText, Percent, ShieldCheck, TrendingUp, TrendingDown, Layers, Landmark, HardHat, CircleCheck, AlertCircle, Plus, Trash2, Edit, Check, X, Briefcase } from 'lucide-react';
import { formatCompactNumber, formatCurrency } from '../lib/formatter';
import { DEFAULT_CUSTOM_OVERHEADS, DEFAULT_STAFF_SALARIES, getSetting, readJsonSetting, setSetting } from '../lib/settingsStore';
import { DEDUCTIBLE_PARTY_ROLES } from '../lib/roleLabels';

interface DashboardProps {
  projects: Project[];
  payments: Payment[];
  contacts: Contact[];
  documents: CloudDocument[];
  onSelectProject: (projectId: string) => void;
}

export default function Dashboard({
  projects,
  payments,
  contacts,
  documents,
  onSelectProject
}: DashboardProps) {
  const [taxRate, setTaxRate] = useState<number>(() => {
    const saved = getSetting('cc_tax_rate');
    return saved ? Number(saved) : 20;
  });
  const [gstRate, setGstRate] = useState<number>(() => {
    const saved = getSetting('cc_gst_rate');
    return saved ? Number(saved) : 18;
  });

  // Supplemental Custom Studio/Office Overhead expenses (not tied to specific project ledgers)
  const [customOverheads, setCustomOverheads] = useState<Array<{ id: string; label: string; amount: number }>>(() => {
    return readJsonSetting('cc_custom_overheads', DEFAULT_CUSTOM_OVERHEADS);
  });

  // Staff and salary directory list state (synced with settings and defaults)
  const [staffList, setStaffList] = useState<Array<{ id: string; name: string; role: string; salary: number }>>(() => {
    return readJsonSetting('cc_staff_salaries', DEFAULT_STAFF_SALARIES);
  });

  useEffect(() => {
    const handleUpdate = () => {
      setCustomOverheads(readJsonSetting('cc_custom_overheads', DEFAULT_CUSTOM_OVERHEADS));
      setStaffList(readJsonSetting('cc_staff_salaries', DEFAULT_STAFF_SALARIES));
    };
    window.addEventListener('custom-settings-updated', handleUpdate);
    window.addEventListener('custom-db-updated', handleUpdate);
    return () => {
      window.removeEventListener('custom-settings-updated', handleUpdate);
      window.removeEventListener('custom-db-updated', handleUpdate);
    };
  }, []);

  const [newLabel, setNewLabel] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [editingAmount, setEditingAmount] = useState('');

  const saveCustomOverheads = (newOverheads: Array<{ id: string; label: string; amount: number }>) => {
    setCustomOverheads(newOverheads);
    setSetting('cc_custom_overheads', JSON.stringify(newOverheads));
    window.dispatchEvent(new Event('custom-db-updated'));
    window.dispatchEvent(new Event('custom-settings-updated'));
  };

  const handleAddOverhead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || !newAmount) return;
    const val = parseFloat(newAmount);
    if (isNaN(val) || val <= 0) return;

    const newItem = {
      id: `oh-${Date.now()}`,
      label: newLabel.trim(),
      amount: val
    };

    saveCustomOverheads([...customOverheads, newItem]);
    setNewLabel('');
    setNewAmount('');
  };

  const handleDeleteOverhead = (id: string) => {
    saveCustomOverheads(customOverheads.filter(x => x.id !== id));
  };

  const handleStartEdit = (item: { id: string; label: string; amount: number }) => {
    setEditingId(item.id);
    setEditingLabel(item.label);
    setEditingAmount(item.amount.toString());
  };

  const handleSaveEdit = (id: string) => {
    if (!editingLabel.trim() || !editingAmount) return;
    const val = parseFloat(editingAmount);
    if (isNaN(val) || val <= 0) return;

    saveCustomOverheads(customOverheads.map(x => x.id === id ? { ...x, label: editingLabel.trim(), amount: val } : x));
    setEditingId(null);
  };

  const totalStaffSalaries = staffList.reduce((acc, s) => acc + s.salary, 0);
  const totalCustomOverhead = customOverheads.reduce((acc, x) => acc + x.amount, 0) + totalStaffSalaries;

  const [selectedFy, setSelectedFy] = useState<string>(() => getSetting('cc_selected_fy') || 'all');

  // Extract all unique financial years based on payment data and the current year.
  const availableFinancialYears = React.useMemo(() => {
    const yearsSet = new Set<number>();
    const currentYear = new Date().getFullYear();

    yearsSet.add(currentYear - 1);
    yearsSet.add(currentYear);
    yearsSet.add(currentYear + 1);

    payments.forEach(p => {
      if (!p.date) return;
      const cleanDate = p.date.substring(0, 10);
      const parts = cleanDate.split('-');
      if (parts.length >= 1) {
        const yr = parseInt(parts[0], 10);
        const mo = parts.length >= 2 ? parseInt(parts[1], 10) : 4; // default to April
        if (!isNaN(yr)) {
          const startYr = mo >= 4 ? yr : yr - 1;
          yearsSet.add(startYr);
        }
      }
    });

    return Array.from(yearsSet).sort((a, b) => b - a); // Sort descending
  }, [payments]);

  const filteredPayments = React.useMemo(() => {
    if (selectedFy === 'all') return payments;
    const startYear = parseInt(selectedFy, 10);
    const startDate = `${startYear}-04-01`;
    const endDate = `${startYear + 1}-03-31`;
    
    return payments.filter(p => {
      if (!p.date) return false;
      const cleanDate = p.date.substring(0, 10);
      return cleanDate >= startDate && cleanDate <= endDate;
    });
  }, [payments, selectedFy]);

  // Financial calculations based on filtered payments
  const totalBudget = projects.reduce((acc, p) => acc + p.budget, 0);
  
  const cashInArray = filteredPayments.filter((p) => p.type === 'in');
  const cashOutArray = filteredPayments.filter((p) => p.type === 'out');
  
  const totalCashIn = cashInArray.reduce((acc, p) => acc + p.amount, 0);
  const totalCashOut = cashOutArray.reduce((acc, p) => acc + p.amount, 0) + totalCustomOverhead;
  
  const netProfit = totalCashIn - totalCashOut;
  const marginPercentage = totalCashIn > 0 ? (netProfit / totalCashIn) * 100 : 0;

  // Document states
  const docsPending = documents.filter((d) => d.syncStatus === 'syncing').length;
  const docsReady = documents.length - docsPending;

  // Tax calculations based on filtered payments
  // Deductibles are project outlays given to supply, contractor, site worker, or service partner roles.
  const deductiblesArray = cashOutArray.filter(
    (p) => DEDUCTIBLE_PARTY_ROLES.includes(p.partyRole)
  );
  const totalDeductibles = deductiblesArray.reduce((acc, p) => acc + p.amount, 0) + totalCustomOverhead;
  
  // Taxable income is Cash In minus Deductible Expenses
  const taxableIncome = Math.max(0, totalCashIn - totalDeductibles);
  const estimatedTax = taxableIncome * (taxRate / 100);

  // Sales tax (GST/VAT) estimates based on filtered payments
  // Outgoing payments are assumed to have paid GST included. Incoming payments are assumed to collect GST.
  const gstCollected = totalCashIn * (gstRate / (100 + gstRate));
  const gstPaid = totalCashOut * (gstRate / (100 + gstRate));
  const netGstOwed = Math.max(0, gstCollected - gstPaid);

  // Expense categories based on filtered payments
  const materialExpenses = filteredPayments
    .filter((p) => p.type === 'out' && p.partyRole === 'supplier')
    .reduce((acc, p) => acc + p.amount, 0);
    
  const siteWorkExpenses = filteredPayments
    .filter((p) => p.type === 'out' && ['vendor', 'contractor', 'site_worker'].includes(p.partyRole))
    .reduce((acc, p) => acc + p.amount, 0);

  const overheadExpenses = filteredPayments
    .filter((p) => p.type === 'out' && p.partyRole === 'other')
    .reduce((acc, p) => acc + p.amount, 0) + totalCustomOverhead;

  // Status breakdown helper
  const ongoingProjectsCount = projects.filter((p) => p.status === 'ongoing').length;
  const completedProjectsCount = projects.filter((p) => p.status === 'completed').length;
  const holdProjectsCount = projects.filter((p) => p.status === 'onhold').length;

  // Export tax report
  const triggerCsvDownload = () => {
    const companyName = getSetting('cc_company_name') || 'Workspace';
    const currentFyText = selectedFy === 'all' 
      ? 'All Time' 
      : `FY ${selectedFy}-${((parseInt(selectedFy, 10) + 1) % 100).toString().padStart(2, '0')} (1 April - 31 March)`;

    const defaultCsvRows = [
      [`${companyName} - Tax Report & Financial Statement`],
      [`Date Generated: ${new Date().toLocaleDateString()}`],
      [`Time Period: ${currentFyText}`],
      [''],
      ['FINANCIAL SUMMARY'],
      ['Total Active Budget Pool', totalBudget],
      ['Total Cash Inflow (Invoiced/Received)', totalCashIn],
      ['Total Cash Outflow (Expenses + Corporate Overheads)', totalCashOut],
      ['Net Financial Profit', netProfit],
      ['Profit Margin (%)', marginPercentage.toFixed(1) + '%'],
      [''],
      ['TAX REPORT METRICS'],
      ['Deductible Project Partner Expenses', totalDeductibles],
      ['Taxable Income Base', taxableIncome],
      [`Estimated Income Tax (${taxRate}%)`, estimatedTax],
      [`Sales Tax / GST Collected (${gstRate}%)`, gstCollected.toFixed(2)],
      [`Sales Tax / GST Paid (${gstRate}%)`, gstPaid.toFixed(2)],
      ['Net Sales Tax (GST/VAT) Owed', netGstOwed.toFixed(2)],
      [''],
      ['EXPENSE BREAKDOWN BY CONTRACT ROLE'],
      ['Material Suppliers Pool', materialExpenses],
      ['Contractors, Vendors & Site Workers Pool', siteWorkExpenses],
      ['Operational & Other Overhead (Includes Corporate Overheads)', overheadExpenses],
      [''],
      ['SUPPLEMENTAL OFFICE OVERHEADS BREAKDOWN']
    ];

    const staffSalaryRows = staffList.map(s => [`Staff: ${s.name} (${s.role})`, s.salary]);
    const overheadRows = customOverheads.map(x => [x.label, x.amount]);
    const finalRows = [
      ...defaultCsvRows,
      ...staffSalaryRows,
      ...overheadRows,
      ['Total Supplemental Overheads', totalCustomOverhead],
      ['']
    ];

    const csvContent = finalRows
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const fySuffix = selectedFy === 'all' 
      ? new Date().getFullYear().toString() 
      : `FY_${selectedFy}_${((parseInt(selectedFy, 10) + 1) % 100).toString().padStart(2, '0')}`;
    link.setAttribute('download', `Workspace_Tax_Report_${fySuffix}.csv`);
    
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="dashboard-container">
      {/* Prime Header Dashboard row */}
      <div className="bg-slate-950 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4" id="dashboard-hero-header">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Financial Dashboard</h2>
          <p className="text-slate-200 text-sm mt-1">
            Real-time aggregate overheads, budget utilization, and tax estimators.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/10 text-xs flex flex-col justify-center text-left" id="fy-filter-selector">
            <span className="text-slate-300 block uppercase font-mono tracking-wider text-[9px] font-semibold">Select Fiscal Period</span>
            <select
              value={selectedFy}
              onChange={(e) => {
                setSelectedFy(e.target.value);
                setSetting('cc_selected_fy', e.target.value);
                window.dispatchEvent(new Event('custom-settings-updated'));
              }}
              className="bg-transparent text-white font-extrabold outline-hidden border-none p-0 mt-0.5 cursor-pointer text-[11px] focus:ring-0 focus:outline-hidden"
              style={{ colorScheme: 'dark' }}
            >
              <option value="all" className="bg-[#003366] text-white">All Time</option>
              {availableFinancialYears.map((startYr) => (
                <option key={startYr} value={startYr.toString()} className="bg-[#003366] text-white">
                  FY {startYr}-{((startYr + 1) % 100).toString().padStart(2, '0')} (1 Apr - 31 Mar)
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={triggerCsvDownload}
            className="bg-white text-slate-950 hover:bg-slate-100 font-semibold text-xs px-4 py-2.5 rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5"
            id="download-tax-btn"
          >
            <FileText size={14} />
            Export report
          </button>
        </div>
      </div>

      {/* Main Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="stats-dashboard-bento flex">
        {/* Card 1: Budget Total */}
        <div className="bg-white p-5 rounded-2xl border border-slate-120 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-slate-100 text-slate-700">
            <Layers size={22} />
          </div>
          <div>
            <span className="text-slate-400 text-xs font-medium block">Total Project Value</span>
            <span className="text-xl font-bold text-slate-800">{formatCurrency(totalBudget)}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Across {projects.length} projects</span>
          </div>
        </div>

        {/* Card 2: Cash In / Billing */}
        <div className="bg-white p-5 rounded-2xl border border-slate-120 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-[#cce0ff] text-[#00509e]">
            <TrendingUp size={22} />
          </div>
          <div>
            <span className="text-slate-400 text-xs font-medium block">Total Receipts</span>
            <span className="text-xl font-bold text-emerald-600">{formatCurrency(totalCashIn)}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Retainers &amp; milestones</span>
          </div>
        </div>

        {/* Card 3: Outlays / Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-120 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-rose-50 text-rose-600">
            <TrendingDown size={22} />
          </div>
          <div>
            <span className="text-slate-400 text-xs font-medium block">Total Expenses</span>
            <span className="text-xl font-bold text-rose-600">{formatCurrency(totalCashOut)}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Site work &amp; material purchases</span>
          </div>
        </div>

        {/* Card 4: Net Balance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-120 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-slate-100 text-slate-700">
            <Landmark size={22} />
          </div>
          <div>
            <span className="text-slate-400 text-xs font-medium block">Net Balance</span>
            <span className={`text-xl font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {formatCurrency(netProfit)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Margin: {marginPercentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="charts-and-tax-breakdowns">
        {/* Core Expenditure Mix - Custom React SVG Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-120 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <HardHat size={18} className="text-[#00509e]" />
              Expenditure Breakdown
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Outlays distributed by supply partner roles</p>
          </div>

          <div className="relative py-6 flex justify-center items-center">
            {totalCashOut === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-slate-400 font-medium">No recorded outlays yet</p>
                <p className="text-xs text-slate-350">Add outlays in project ledgers to populate</p>
              </div>
            ) : (
              <div className="w-full flex items-center justify-around gap-2">
                {/* SVG Semi Doughnut Chart */}
                <div className="relative w-40 h-40">
                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#F1F5F9" strokeWidth="12" />
                    {/* Material Suppliers Segment */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#007acc"
                      strokeWidth="12"
                      strokeDasharray={`${(materialExpenses / totalCashOut) * 251.2} 251.2`}
                    />
                    {/* Contracting, Vendor, and Site Worker Segment */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#00509e"
                      strokeWidth="12"
                      strokeDasharray={`${(siteWorkExpenses / totalCashOut) * 251.2} 251.2`}
                      strokeDashoffset={`-${(materialExpenses / totalCashOut) * 251.2}`}
                    />
                    {/* Overhead & Others Segment */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#66a3ff"
                      strokeWidth="12"
                      strokeDasharray={`${(overheadExpenses / totalCashOut) * 251.2} 251.2`}
                      strokeDashoffset={`-${((materialExpenses + siteWorkExpenses) / totalCashOut) * 251.2}`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] text-slate-400 font-medium uppercase">Outlays</span>
                    <span className="text-base font-extrabold text-slate-800">
                      {formatCompactNumber(totalCashOut)}
                    </span>
                  </div>
                </div>

                {/* Legend panel */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-[#007acc]"></span>
                    <div className="text-left">
                      <span className="text-[10px] text-slate-400 block leading-tight">Suppliers</span>
                      <span className="text-xs font-semibold text-slate-700">{formatCurrency(materialExpenses)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-[#00509e]"></span>
                    <div className="text-left">
                      <span className="text-[10px] text-slate-400 block leading-tight">Site Work</span>
                      <span className="text-xs font-semibold text-slate-700">{formatCurrency(siteWorkExpenses)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-[#66a3ff]"></span>
                    <div className="text-left">
                      <span className="text-[10px] text-slate-400 block leading-tight">Overhead</span>
                      <span className="text-xs font-semibold text-slate-700">{formatCurrency(overheadExpenses)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-3 text-center">
            <span className="text-[11px] text-slate-400">
              Deduction estimates use supplier, vendor, contractor, and site worker classifications
            </span>
          </div>
        </div>

        {/* Documents */}
        <div className="bg-white p-5 rounded-2xl border border-slate-120 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-600" />
              Documents
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Project drawings, bills, references, and approvals.</p>
          </div>

          <div className="py-4 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
              <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                <span className="text-emerald-600 font-bold block">{documents.length}</span>
                <span className="text-[9px] text-slate-400 uppercase">Total</span>
              </div>
              <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                <span className="text-blue-600 font-bold block">{docsReady}</span>
                <span className="text-[9px] text-slate-400 uppercase">Ready</span>
              </div>
              <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                <span className="text-slate-500 font-bold block">{docsPending}</span>
                <span className="text-[9px] text-slate-400 uppercase">Pending</span>
              </div>
            </div>
          </div>

          {docsPending > 0 && (
            <div className="text-center text-[10px] text-blue-700 bg-blue-50 py-1 rounded-lg">
              Sync in progress
            </div>
          )}
        </div>

        {/* Small Business Automatic Tax Planner */}
        <div className="bg-white p-5 rounded-2xl border border-slate-120 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Percent size={18} className="text-rose-500" />
              Tax Estimate
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Calculates deductions and estimates liability</p>
          </div>

          <div className="py-4 space-y-3.5">
            {/* Input adjustment sliders */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                  Income Tax ({taxRate}%)
                </label>
                <input
                  type="range"
                  min="5"
                  max="45"
                  value={taxRate}
                  onChange={(e) => {
                    setTaxRate(Number(e.target.value));
                    setSetting('cc_tax_rate', e.target.value);
                    window.dispatchEvent(new Event('custom-settings-updated'));
                  }}
                  className="w-full accent-[#007acc] cursor-pointer"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                  Sales Tax/GST ({gstRate}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="28"
                  value={gstRate}
                  onChange={(e) => {
                    setGstRate(Number(e.target.value));
                    setSetting('cc_gst_rate', e.target.value);
                    window.dispatchEvent(new Event('custom-settings-updated'));
                  }}
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-dashed border-slate-100 text-slate-600">
                <span>Deductible Expenses</span>
                <span className="font-semibold text-emerald-600">-{formatCurrency(totalDeductibles)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-slate-100 text-slate-600">
                <span>Taxable Base Profit</span>
                <span className="font-semibold text-slate-700">{formatCurrency(taxableIncome)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-slate-100 text-slate-600">
                <span>Est. Income Tax Due</span>
                <span className="font-semibold text-rose-500">{formatCurrency(estimatedTax)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-slate-100 text-slate-600">
                <span>Estimated Net GST/VAT Owed</span>
                <span className="font-semibold text-stone-700">{formatCurrency(netGstOwed)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-100 p-2 rounded-xl">
            <AlertCircle size={14} className="text-rose-500 shrink-0" />
            <span className="text-[10px] text-rose-700 tracking-tight">
              Estimates are directional and should be reviewed before filing.
            </span>
          </div>
        </div>
      </div>

      {/* Studio & Corporate Overhead Planner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-120 shadow-xs text-left space-y-4" id="studio-overhead-planner">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3" id="overhead-header">
          <div className="space-y-0.5">
            <h3 className="font-extrabold text-slate-800 text-sm md:text-base flex items-center gap-2">
              <Briefcase size={18} className="text-[#00509e]" />
              Overhead Planner
            </h3>
            <p className="text-xs text-slate-400">
              Incorporate recurring studio, rental, software licensing, or general operational overhead expenses (non-project-specific) to refine net margins and tax forecasting.
            </p>
          </div>
          <div className="text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-150 px-3 py-1.5 rounded-lg shrink-0">
            Total Overheads: <span className="text-[#00509e] font-extrabold font-mono text-xs">{formatCurrency(totalCustomOverhead)}</span>
          </div>
        </div>

        {/* Dynamic Overhead list table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase font-mono text-[9px] tracking-wider">
                <th className="py-2.5 font-bold">Overhead Particulars</th>
                <th className="py-2.5 font-bold text-right w-36">Monthly/Annual Cost</th>
                <th className="py-2.5 font-bold text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium">
              {/* Staff Salaries (from Settings) */}
              {staffList.map((staff) => (
                <tr key={staff.id} className="bg-blue-50/15 hover:bg-blue-50/25 duration-100 animate-in fade-in">
                  <td className="py-3 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-50 text-blue-600 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border border-blue-100 tracking-wider shrink-0">
                        Staff
                      </span>
                      <div>
                        <span className="text-slate-850 font-semibold block">{staff.name}</span>
                        <span className="text-[10px] text-slate-400 block">{staff.role}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-right">
                    <span className="font-mono font-bold text-slate-700">{formatCurrency(staff.salary)}</span>
                    <span className="text-[9px] text-slate-400 block font-mono">/ Month</span>
                  </td>
                  <td className="py-3 text-center">
                    <span className="text-[10px] text-slate-400 italic font-medium">Syncs from Settings</span>
                  </td>
                </tr>
              ))}

              {customOverheads.length === 0 && staffList.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-slate-400 italic">
                    No custom overheads yet.
                  </td>
                </tr>
              ) : (
                customOverheads.map((item) => (
                  <tr key={item.id} className="group hover:bg-slate-50/40 animate-in fade-in duration-100">
                    <td className="py-3 pr-2">
                      {editingId === item.id ? (
                        <input
                          type="text"
                          value={editingLabel}
                          onChange={(e) => setEditingLabel(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-800 font-medium focus:outline-hidden"
                        />
                      ) : (
                        <span className="text-slate-800 font-semibold">{item.label}</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {editingId === item.id ? (
                        <div className="relative inline-block w-full">
                          <input
                            type="number"
                            value={editingAmount}
                            onChange={(e) => setEditingAmount(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-right font-mono font-bold text-slate-800 focus:outline-hidden"
                          />
                        </div>
                      ) : (
                        <span className="font-mono font-bold text-slate-700">{formatCurrency(item.amount)}</span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {editingId === item.id ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(item.id)}
                              className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition cursor-pointer border-none"
                              title="Save Changes"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-lg transition cursor-pointer border-none"
                              title="Cancel Edit"
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleStartEdit(item)}
                              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-lg transition cursor-pointer border-none bg-transparent"
                              title="Edit Expense"
                            >
                              <Edit size={13} className="text-slate-500" />
                            </button>
                            <button
                              onClick={() => handleDeleteOverhead(item.id)}
                              className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-600 rounded-lg transition cursor-pointer border-none bg-transparent"
                              title="Delete Expense"
                            >
                              <Trash2 size={13} className="text-rose-500" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Interactive Add Row Inline form */}
        <form onSubmit={handleAddOverhead} className="grid grid-cols-1 md:flex gap-3 pt-2 bg-slate-50 p-4.5 rounded-xl border border-slate-100">
          <div className="flex-1 text-left">
            <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Add New Particular Label
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Creative Cloud Suite, Studio Electricity, Office Stationery"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-xl text-slate-800 placeholder-slate-400 font-semibold focus:outline-hidden"
            />
          </div>
          <div className="w-full md:w-44 text-left">
            <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Operational Cost (INR)
            </label>
            <div className="relative">
              <input
                type="number"
                required
                min="1"
                placeholder="0"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-full bg-white border border-slate-250 text-xs px-3 py-2 rounded-xl text-slate-800 placeholder-slate-400 font-mono font-bold focus:outline-hidden"
              />
            </div>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-[#00509e] hover:bg-[#007acc] text-white text-xs font-bold px-4 py-2.5 rounded-xl border-none cursor-pointer shadow-xs transition-all flex items-center justify-center gap-1.5"
            >
              <Plus size={14} /> Add Particular
            </button>
          </div>
        </form>
      </div>

      {/* Quick Portfolio Selector card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-120 shadow-xs">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Quick Access Projects</h3>
            <p className="text-xs text-slate-400">Open a project ledger directly.</p>
          </div>
          <div className="flex gap-2">
            <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 font-semibold rounded-lg">
              {ongoingProjectsCount} Ongoing
            </span>
            <span className="text-xs px-2.5 py-1 bg-green-50 text-green-700 font-semibold rounded-lg">
              {completedProjectsCount} Completed
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {projects.map((proj) => {
            const projPayments = filteredPayments.filter((p) => p.projectId === proj.id);
            const inflow = projPayments.filter((p) => p.type === 'in').reduce((sum, p) => sum + p.amount, 0);
            const outflow = projPayments.filter((p) => p.type === 'out').reduce((sum, p) => sum + p.amount, 0);
            const percentUsed = proj.budget > 0 ? (outflow / proj.budget) * 100 : 0;

            let badgeColor = 'bg-blue-100 text-blue-800';
            let badgeText = 'Ongoing';
            if (proj.status === 'completed') {
              badgeColor = 'bg-emerald-100 text-emerald-800';
              badgeText = 'Completed';
            } else if (proj.status === 'onhold') {
              badgeColor = 'bg-blue-100 text-blue-800 border border-blue-200';
              badgeText = 'On Hold';
            }

            return (
              <div
                key={proj.id}
                onClick={() => onSelectProject(proj.id)}
                className="group border border-slate-100 hover:border-[#66a3ff] p-4 rounded-xl cursor-pointer hover:bg-blue-50 transition-all text-left"
              >
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-bold text-sm text-slate-800 group-hover:text-[#00509e] line-clamp-1 transition-colors">
                    {proj.name}
                  </h4>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${badgeColor}`}>
                    {badgeText}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-1 mt-1 mb-3">{proj.description}</p>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                    <span>Budget Used</span>
                    <span>{percentUsed.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#007acc] h-full"
                      style={{ width: `${Math.min(100, percentUsed)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3 border-t border-slate-100 text-[11px]">
                  <div>
                    <span className="text-slate-400 block uppercase tracking-wider text-[9px]">Receipts</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(inflow)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase tracking-wider text-[9px]">Expenses</span>
                    <span className="font-bold text-rose-500">{formatCurrency(outflow)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
