import React, { useState } from 'react';
import { Project, ProjectStatus, Payment } from '../types';
import { formatDate } from '../lib/formatter';
import { Plus, FolderPlus, MapPin, DollarSign, Calendar, User, Search, RefreshCw, Layers } from 'lucide-react';

interface ProjectListProps {
  projects: Project[];
  payments: Payment[];
  onAddProject: (name: string, description: string, budget: number, clientName: string, address: string) => void;
  onUpdateStatus: (projectId: string, status: ProjectStatus) => void;
  onSelectProject: (projectId: string) => void;
}

export default function ProjectList({
  projects,
  payments,
  onAddProject,
  onUpdateStatus,
  onSelectProject,
}: ProjectListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [clientName, setClientName] = useState('');
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !clientName.trim()) return;
    onAddProject(
      name,
      description,
      Number(budget) || 0,
      clientName,
      address
    );
    // Reset form
    setName('');
    setDescription('');
    setBudget('');
    setClientName('');
    setAddress('');
    setShowAddForm(false);
  };

  // Filter projects based on query and state filter
  const filteredProjects = projects.filter((proj) => {
    const matchesSearch =
      proj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proj.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (proj.address && proj.address.toLowerCase().includes(searchQuery.toLowerCase()));

    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && proj.status === statusFilter;
  });

  return (
    <div className="space-y-6" id="projects-view">
      {/* Floating Action / Mobile search and add block */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center" id="project-list-actions">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search projects, clients or sites..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex gap-2">
          {/* Status Quick Filter toggling */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Portfolios</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="onhold">On Hold</option>
          </select>
          
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all duration-150 cursor-pointer text-center border-none"
            id="open-add-project-modal-btn"
          >
            <Plus size={16} />
            Add Project
          </button>
        </div>
      </div>

      {/* Rapid Add Project Slide-over drawer / Modal Overlay */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-xs" id="add-project-modal">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FolderPlus size={18} />
                <h3 className="font-bold text-base">Register New Project Cargo</h3>
              </div>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-white/80 hover:text-white font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-550 uppercase tracking-widest block">Project Alias *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Modern Hills Mansion, Beverly office suite"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Primary Client Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Jenkins"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Total Budget Allocation (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 50000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Job Site Address</label>
                <input
                  type="text"
                  placeholder="e.g. 104 Oak Dr, Santa Monica, CA"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Brief Specifications / Scope of Work</label>
                <textarea
                  placeholder="Briefly detail materials, target timelines or custom cabinetry details"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-550 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg cursor-pointer border-none"
                >
                  Create Portfolio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Portfolio Projects Cards list or Empty state */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-150 p-12 text-center" id="empty-projects-state">
          <Layers size={40} className="text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 text-lg">No Matching Projects Found</h3>
          <p className="text-slate-400 text-xs max-w-sm mx-auto mt-1">
            Either refine your filters or add a new construction, interior design, or remodel project to begin tracking transactions.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-blue-650 font-bold text-xs rounded-lg inline-flex items-center gap-1 cursor-pointer"
          >
            <Plus size={14} /> Add First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="projects-grid">
          {filteredProjects.map((proj) => {
            // Calculations per project
            const projPayments = payments.filter((p) => p.projectId === proj.id);
            const totalIn = projPayments
              .filter((p) => p.type === 'in')
              .reduce((sum, p) => sum + p.amount, 0);
            
            const totalOut = projPayments
              .filter((p) => p.type === 'out')
              .reduce((sum, p) => sum + p.amount, 0);

            const activeBalance = totalIn - totalOut;
            const utilizationRate = proj.budget > 0 ? (totalOut / proj.budget) * 100 : 0;

            return (
              <div
                key={proj.id}
                className="bg-white rounded-xl border border-slate-150 shadow-xs hover:shadow-md transition-all duration-150 flex flex-col justify-between overflow-hidden"
                id={`project-${proj.id}`}
              >
                {/* Upper portion: click on contents to open detail */}
                <div className="p-5 space-y-4">
                  {/* Title & Rapid Status Toggle option directly on the card */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="cursor-pointer flex-1" onClick={() => onSelectProject(proj.id)}>
                      <h4 className="font-bold text-base text-slate-800 hover:text-blue-600 transition-colors leading-tight line-clamp-1">
                        {proj.name}
                      </h4>
                      <span className="text-[10px] text-[#456276] font-semibold flex items-center gap-1.5 mt-1">
                        <User size={10} /> Client: {proj.clientName}
                      </span>
                    </div>

                    {/* Highly accessible direct-interactive status select */}
                    <div className="flex flex-col items-end shrink-0">
                      <select
                        value={proj.status}
                        onChange={(e) => onUpdateStatus(proj.id, e.target.value as ProjectStatus)}
                        className={`text-xs font-bold px-2 py-1.5 rounded cursor-pointer border-0 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          proj.status === 'ongoing'
                            ? 'bg-emerald-100 text-emerald-700 ring-emerald-200'
                            : proj.status === 'completed'
                            ? 'bg-slate-150 text-slate-600 ring-slate-200'
                            : 'bg-blue-100 text-blue-800 ring-blue-200'
                        }`}
                      >
                        <option value="ongoing">🟢 Ongoing</option>
                        <option value="completed">✅ Complete</option>
                        <option value="onhold">🟡 On Hold</option>
                      </select>
                    </div>
                  </div>

                  {/* Divider line */}
                  <div className="h-[1px] bg-slate-100" />

                  {/* Body elements */}
                  <div className="space-y-2.5 cursor-pointer text-xs text-slate-500" onClick={() => onSelectProject(proj.id)}>
                    <p className="line-clamp-2 text-slate-400 mt-1">{proj.description}</p>
                    
                    {proj.address && (
                      <div className="flex items-center gap-1.5">
                        <MapPin size={13} className="text-slate-400 shrink-0" />
                        <span className="line-clamp-1 text-[11px]">{proj.address}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg text-[11px]">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} className="text-slate-400" />
                        <span>Registered:</span>
                      </div>
                      <span className="font-mono text-slate-700 font-semibold">{formatDate(proj.createdAt)}</span>
                    </div>
                  </div>

                  {/* Budget usage representation */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                      <span>Outlays utilization</span>
                      <span>₹{totalOut.toLocaleString()} / <span className="text-slate-400">₹{proj.budget.toLocaleString()}</span></span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          utilizationRate > 100
                            ? 'bg-rose-500'
                            : 'bg-blue-600'
                        }`}
                        style={{ width: `${Math.min(100, utilizationRate)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Lower Action bar */}
                <div className="bg-slate-50/80 px-5 py-3 border-t border-slate-100 flex justify-between items-center text-xs">
                  <div className="text-left">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Wallet Margin</span>
                    <span className={`font-bold ${activeBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      ₹{activeBalance.toLocaleString()}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => onSelectProject(proj.id)}
                    className="text-blue-600 hover:text-blue-500 font-bold tracking-tight inline-flex items-center gap-1 cursor-pointer py-1 px-2.5 rounded-lg hover:bg-blue-50 transition"
                  >
                    Open Ledger →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
