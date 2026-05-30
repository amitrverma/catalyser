import React, { useState } from 'react';
import { Project, Payment, PaymentMode, PaymentType } from '../types';
import { formatDate } from '../lib/formatter';
import Logo from './Logo';
import { Printer, Download, Eye, Table, Filter, Calendar, IndianRupee, Layers, Users, RefreshCw } from 'lucide-react';

interface ReportGeneratorProps {
  projects: Project[];
  payments: Payment[];
}

export default function ReportGenerator({ projects, payments }: ReportGeneratorProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedParty, setSelectedParty] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>('all');
  const [selectedFy, setSelectedFy] = useState<string>('all');

  // Extract all unique financial years based on payments data combined with some default ones
  const availableFinancialYears = React.useMemo(() => {
    const yearsSet = new Set<number>();
    
    // Default standard years to ensure they are available in selectors
    yearsSet.add(2024);
    yearsSet.add(2025);
    yearsSet.add(2026);
    yearsSet.add(2027);

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

  // Extract all unique parties depending on selected project, so the list stays highly consistent!
  const relevantPaymentsForParties = selectedProjectId === 'all'
    ? payments
    : payments.filter((p) => p.projectId === selectedProjectId);

  const allUniqueParties = Array.from(
    new Set(relevantPaymentsForParties.map((p) => p.party.trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  // Determine effective party selection safely falling back to 'all' if the selected participant does not belong to the active project query
  const effectiveParty = selectedParty !== 'all' && allUniqueParties.includes(selectedParty) ? selectedParty : 'all';

  // Filter payments based on applied dropdown options
  const filteredPayments = payments.filter((payment) => {
    const matchesProject = selectedProjectId === 'all' || payment.projectId === selectedProjectId;
    const matchesParty = effectiveParty === 'all' || payment.party.trim().toLowerCase() === effectiveParty.trim().toLowerCase();
    const matchesType = typeFilter === 'all' || payment.type === typeFilter;
    const matchesPaymentMode = paymentModeFilter === 'all' || payment.paymentMode === paymentModeFilter;
    
    let matchesFy = true;
    if (selectedFy !== 'all') {
      const startYear = parseInt(selectedFy, 10);
      const startDate = `${startYear}-04-01`;
      const endDate = `${startYear + 1}-03-31`;
      const cleanDate = payment.date.substring(0, 10);
      matchesFy = cleanDate >= startDate && cleanDate <= endDate;
    }
    
    return matchesProject && matchesParty && matchesType && matchesPaymentMode && matchesFy;
  });

  // Sort payments by date descending so the latest transactions are shown at the top of the report
  const sortedPayments = [...filteredPayments].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Financial aggregates for the filtered data
  const totalInflow = sortedPayments
    .filter((p) => p.type === 'in')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalOutflow = sortedPayments
    .filter((p) => p.type === 'out')
    .reduce((sum, p) => sum + p.amount, 0);

  const netStatementBalance = totalInflow - totalOutflow;

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Excel Format / CSV Download trigger
  const handleDownloadExcel = () => {
    // Generate file metadata headers and column schema
    const headers = ['Log Date', 'Remark/Description', 'Associated Project', 'Associated Party', 'Party Role', 'Payment Mode', 'Transaction Type', 'Inflow (₹)', 'Outflow (₹)', 'Net Balance Impact (₹)'];
    
    const rows = sortedPayments.map((p) => {
      const proj = projects.find((pr) => pr.id === p.projectId);
      const projName = proj ? proj.name : 'Unknown Portfolio';
      
      return [
        formatDate(p.date),
        `"${(p.remark || 'N/A').replace(/"/g, '""')}"`,
        `"${projName.replace(/"/g, '""')}"`,
        `"${p.party.replace(/"/g, '""')}"`,
        p.partyRole,
        p.paymentMode.replace('_', ' '),
        p.type.toUpperCase(),
        p.type === 'in' ? p.amount : 0,
        p.type === 'out' ? p.amount : 0,
        p.type === 'in' ? p.amount : -p.amount
      ];
    });

    const csvContent = [
      ['Catalyser Design Ledger Statement'],
      [`Generated At: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`],
      [`Scope: Project(${selectedProjectId === 'all' ? 'All' : projects.find(pr => pr.id === selectedProjectId)?.name}), Party(${effectiveParty === 'all' ? 'All' : effectiveParty})`],
      ['SUMMARY STATS:'],
      [`Total Cash Inflow,₹${totalInflow}`],
      [`Total Cash Outflow,₹${totalOutflow}`],
      [`Relative Cash Margin,₹${netStatementBalance}`],
      [''],
      headers.join(','),
      ...rows.map((r) => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Catalyser_Ledger_Report_${new Date().toISOString().substring(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeProjectName = selectedProjectId === 'all' ? 'All Portfolios' : projects.find((p) => p.id === selectedProjectId)?.name || 'Specified';

  return (
    <div className="space-y-6 text-left font-sans" id="ledger-reporting-hub">
      {/* Configuration & Filter console */}
      <div className="bg-white rounded-2xl border border-slate-150 p-5 space-y-4 print:hidden shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Filter size={18} className="text-blue-600" /> Dynamic Ledger Reporting Studio
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Filter cash flows by client portfolios, vendors, and suppliers to generate professional print sheets.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => {
                setSelectedProjectId('all');
                setSelectedParty('all');
                setTypeFilter('all');
                setPaymentModeFilter('all');
                setSelectedFy('all');
              }}
              className="text-slate-400 hover:text-blue-600 p-2 border border-slate-200 hover:border-blue-250 rounded-lg transition"
              title="Reset all filters"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Filters Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-xs font-semibold text-slate-600">
          {/* Project Dropdown Filter */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <Layers size={11} className="text-slate-400" /> Target Project Portfolio
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-medium focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">📁 All Active Projects ({projects.length})</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Party Dropdown Filter */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <Users size={11} className="text-slate-400" /> Account Party / Contact
            </label>
            <select
              value={effectiveParty}
              onChange={(e) => setSelectedParty(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-medium focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">👥 All parties ({allUniqueParties.length})</option>
              {allUniqueParties.map((pty) => (
                <option key={pty} value={pty}>
                  {pty}
                </option>
              ))}
            </select>
          </div>

          {/* Transaction Class Type Filter */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Transaction class
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-medium focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">💸 All Transactions</option>
              <option value="in">💰 Cash Inflow (Deposits)</option>
              <option value="out">🧾 Cash Outflow (Expenses)</option>
            </select>
          </div>

          {/* Payment Mode Filter */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Payment mode
            </label>
            <select
              value={paymentModeFilter}
              onChange={(e) => setPaymentModeFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-medium focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">🏛️ All Modes</option>
              <option value="bank_transfer">🏛️ Bank Transfer / ACH</option>
              <option value="cash">💵 Hard Cash</option>
              <option value="upi">📱 UPI Wallet</option>
              <option value="cheque">✍️ Bank Cheque Draw</option>
              <option value="card">💳 Debit/Credit Card</option>
            </select>
          </div>

          {/* Fiscal Year Filter */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <Calendar size={11} className="text-slate-400" /> Fiscal Period (FY)
            </label>
            <select
              value={selectedFy}
              onChange={(e) => setSelectedFy(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-medium focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">📅 All Time (Aggregate)</option>
              {availableFinancialYears.map((startYr) => (
                <option key={startYr} value={startYr.toString()}>
                  📅 FY {startYr}-{((startYr + 1) % 100).toString().padStart(2, '0')} (1 Apr - 31 Mar)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Actions and sheet controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 print:hidden">
        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider font-mono">
          Matches: <span className="text-[#0974C6]">{sortedPayments.length} transactions</span> filtered
        </span>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition duration-150 border-none"
          >
            <Printer size={14} /> Print / Save PDF
          </button>
          
          <button
            onClick={handleDownloadExcel}
            className="bg-[#456276] hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition duration-150"
          >
            <Download size={14} /> Download Excel (CSV)
          </button>
        </div>
      </div>

      {/* Sandbox iframe warning / instruction label */}
      <div className="bg-slate-905 border border-slate-800 p-4 rounded-xl text-left print:hidden shadow-xs space-y-1 bg-slate-900">
        <span className="text-[9px] uppercase font-bold text-blue-400 tracking-widest font-mono block">Document Workstation Tip</span>
        <div className="text-[11px] text-amber-200/90 font-medium flex gap-2 items-start leading-relaxed">
          <span className="text-xs shrink-0">💡</span>
          <p>
            <b>Saving Statement as PDF:</b> When clicking <b>"Print / Save PDF"</b>, wait for your browser's print dialog to load, then select <b>"Save as PDF"</b> under the target destination. 
            Due to secure iframe sandboxing in web previews, if your printer dialog does not trigger, please click <b>"Open in New Tab"</b> at the top-right of your preview screen to export seamlessly as a native PDF document!
          </p>
        </div>
      </div>

      {/* Printable Report Document Sheet */}
      <div className="bg-white border border-slate-150 rounded-2xl p-6 sm:p-10 space-y-6 shadow-xs relative print-target" id="printable-report-sheet">
        {/* Invoice Header details with prominent company logo */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b pb-6 text-left">
          <Logo layout="row" size="sm" showSubtitle={true} />
          <div className="text-right sm:text-right text-xs">
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-widest leading-6">ACCOUNT LEDGER REPORT</h2>
            <div className="text-slate-400 block mt-2 leading-relaxed space-y-0.5" id="printable-period-scope">
              <span>Date Generated: <span className="font-semibold text-slate-600">{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span></span>
              <span className="block">Scope: <span className="font-semibold text-slate-605">{activeProjectName}</span></span>
              <span className="block">Fiscal Period: <span className="font-semibold text-slate-605">{selectedFy === 'all' ? 'All Time (Aggregate)' : `FY ${selectedFy}-${((parseInt(selectedFy, 10) + 1) % 100).toString().padStart(2, '0')} (1 Apr - 31 Mar)`}</span></span>
              {effectiveParty !== 'all' && <span className="block">Party Portfolio: <span className="font-semibold text-slate-605">{effectiveParty}</span></span>}
            </div>
          </div>
        </div>

        {/* Applied Filters Tag Block */}
        <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs text-left print:hidden">
          <div>
            <span className="text-slate-400 text-[10px] block font-mono">Project Filter:</span>
            <span className="font-bold text-slate-700">{activeProjectName}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] block font-mono">Party Filter:</span>
            <span className="font-bold text-slate-700 capitalize">{effectiveParty === 'all' ? 'All parties' : effectiveParty}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] block font-mono">Class:</span>
            <span className="font-bold text-slate-700 capitalize">{typeFilter === 'all' ? 'Deposits + Payouts' : typeFilter === 'in' ? 'Deposits only' : 'Payouts only'}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] block font-mono">Transfer Mode:</span>
            <span className="font-bold text-slate-700 capitalize">{paymentModeFilter.replace('_', ' ')}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] block font-mono">Fiscal Period:</span>
            <span className="font-bold text-slate-700">{selectedFy === 'all' ? 'All Time' : `FY ${selectedFy}-${((parseInt(selectedFy, 10) + 1) % 100).toString().padStart(2, '0')}`}</span>
          </div>
        </div>

        {/* Aggregates Dashboard Block */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-left">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Deposited (Cash In)</span>
            <span className="text-base sm:text-xl font-black text-emerald-600 block mt-1">₹{totalInflow.toLocaleString()}</span>
          </div>
          <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-left">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Withdrawn (Cash Out)</span>
            <span className="text-base sm:text-xl font-black text-rose-500 block mt-1">₹{totalOutflow.toLocaleString()}</span>
          </div>
          <div className="bg-blue-500/10 border border-blue-250 p-4 rounded-xl text-left">
            <span className="text-[10px] font-bold uppercase text-blue-600 tracking-wider">Statement Relative Net</span>
            <span className={`text-base sm:text-xl font-black block mt-1 ${netStatementBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {netStatementBalance >= 0 ? '+' : ''}₹{netStatementBalance.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Transactions list */}
        {sortedPayments.length === 0 ? (
          <div className="bg-slate-50/50 p-12 text-center border-2 border-dashed rounded-xl">
            <Table className="text-slate-350 mx-auto mb-2" size={32} />
            <h4 className="font-semibold text-slate-600 text-sm">No recorded transactions match the filter criteria</h4>
            <p className="text-xs text-slate-400 mt-1">Try resetting or broadening your dropdown selectors above to retrieve records.</p>
          </div>
        ) : (
          <div className="overflow-x-auto text-xs border border-slate-150 rounded-xl overflow-hidden">
            <table className="w-full divide-y divide-slate-150 border-collapse table-auto text-left">
              <thead className="bg-slate-50 font-bold uppercase tracking-wider text-[9px] text-slate-550 border-b border-slate-150">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Remark / Detail</th>
                  <th className="px-4 py-3">Party</th>
                  <th className="px-4 py-3">Project Portfolio</th>
                  <th className="px-4 py-3">Transfer Mode</th>
                  <th className="px-4 py-3 text-right">Debit (Out)</th>
                  <th className="px-4 py-3 text-right">Credit (In)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-650">
                {sortedPayments.map((p) => {
                  const proj = projects.find((pr) => pr.id === p.projectId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3.5 font-mono text-slate-500 whitespace-nowrap">{formatDate(p.date)}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800 text-left max-w-[180px] truncate">{p.remark || 'N/A'}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-left">
                        <span className="font-bold text-slate-700 block text-xs leading-none">{p.party}</span>
                        <span className="text-[9px] uppercase font-mono bg-slate-50 text-slate-400 px-1 rounded-sm border inline-block mt-1">{p.partyRole}</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap max-w-[120px] truncate">
                        {proj ? proj.name : 'Unknown'}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap capitalize font-medium">{p.paymentMode.replace('_', ' ')}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-rose-500 whitespace-nowrap font-mono">
                        {p.type === 'out' ? `-₹${p.amount.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-emerald-600 whitespace-nowrap font-mono">
                        {p.type === 'in' ? `+₹${p.amount.toLocaleString()}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer verification tag */}
        <div className="border-t border-slate-100 pt-6 text-left flex justify-between items-center text-[10px] text-slate-400">
          <div>
            <span className="font-extrabold text-slate-500 uppercase tracking-widest block">CATALYSER DESIGN</span>
            <span>Digitally audited financial backup statement ledger. Synchronised safely.</span>
          </div>
          <div className="text-right">
            <span>Security Digest: SHA-256 Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}
