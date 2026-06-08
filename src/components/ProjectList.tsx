import React, { useState } from 'react';
import { Project, ProjectStatus, Payment } from '../types';
import { formatCurrency, formatDate } from '../lib/formatter';
import { Plus, FolderPlus, MapPin, Calendar, User, Search, Layers, ArrowRight, Check } from 'lucide-react';

interface ProjectListProps {
  projects: Project[];
  payments: Payment[];
  onAddProject?: (name: string, description: string, budget: number, clientName: string, address: string) => void;
  onUpdateStatus?: (projectId: string, status: ProjectStatus) => void;
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
  const [statusFilters, setStatusFilters] = useState<ProjectStatus[]>(['ongoing', 'completed', 'onhold']);
  const [showStatusFilters, setShowStatusFilters] = useState(false);
  const [openStatusMenuId, setOpenStatusMenuId] = useState<string | null>(null);
  const statusFilterOptions: Array<{ value: ProjectStatus; label: string }> = [
    { value: 'ongoing', label: 'Ongoing' },
    { value: 'completed', label: 'Completed' },
    { value: 'onhold', label: 'On Hold' },
  ];
  const allStatusesSelected = statusFilters.length === statusFilterOptions.length;
  const statusFilterLabel = allStatusesSelected
    ? 'All Projects'
    : statusFilterOptions
        .filter((status) => statusFilters.includes(status.value))
        .map((status) => status.label)
        .join(', ') || 'No Status';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddProject) return;
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

    if (statusFilters.length === 0) return false;
    return matchesSearch && statusFilters.includes(proj.status);
  });

  const toggleStatusFilter = (status: ProjectStatus) => {
    setStatusFilters((current) =>
      current.includes(status)
        ? current.filter((item) => item !== status)
        : [...current, status],
    );
  };

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
            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-11 pr-4 text-sm shadow-xs focus:outline-none"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-0 shrink-0">
            <button
              type="button"
              onClick={() => setShowStatusFilters((current) => !current)}
              className="flex h-full w-[132px] sm:w-[190px] items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-xs font-semibold text-slate-600 shadow-xs focus:outline-none cursor-pointer"
              aria-haspopup="menu"
              aria-expanded={showStatusFilters}
            >
              <span className="truncate">{statusFilterLabel}</span>
              <span className="text-[10px] leading-none">v</span>
            </button>
            {showStatusFilters && (
              <div className="absolute left-0 top-11 z-30 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg sm:left-auto sm:right-0 sm:w-44">
                <button
                  type="button"
                  onClick={() =>
                    setStatusFilters(allStatusesSelected ? [] : statusFilterOptions.map((status) => status.value))
                  }
                  className="flex w-full items-center justify-between border-none bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-blue-50 cursor-pointer"
                  role="menuitemcheckbox"
                  aria-checked={allStatusesSelected}
                >
                  <span>All Projects</span>
                  {allStatusesSelected && <Check size={13} className="text-[#00509e]" />}
                </button>
                <div className="my-1 h-px bg-slate-100" />
                {statusFilterOptions.map((status) => {
                  const isSelected = statusFilters.includes(status.value);
                  return (
                    <button
                      key={status.value}
                      type="button"
                      onClick={() => toggleStatusFilter(status.value)}
                      className="flex w-full items-center justify-between border-none bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-blue-50 cursor-pointer"
                      role="menuitemcheckbox"
                      aria-checked={isSelected}
                    >
                      <span>{status.label}</span>
                      {isSelected && <Check size={13} className="text-[#00509e]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          
          {onAddProject && (
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-slate-950 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all duration-150 cursor-pointer text-center border-none"
              id="open-add-project-modal-btn"
            >
              <Plus size={16} />
              Add Project
            </button>
          )}
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
                <h3 className="font-bold text-base">Create Project</h3>
              </div>
              <button
                onClick={() => setShowAddForm(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border-none bg-white/10 text-white/80 hover:bg-white/15 hover:text-white font-bold text-sm cursor-pointer"
                aria-label="Close create project form"
              >
                X
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Project name *</label>
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
                  <label className="text-xs font-semibold text-slate-700 block">Client name *</label>
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
                  <label className="text-xs font-semibold text-slate-700 block">Total budget</label>
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
                <label className="text-xs font-semibold text-slate-700 block">Job site address</label>
                <input
                  type="text"
                  placeholder="e.g. 104 Oak Dr, Santa Monica, CA"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Brief specifications / scope of work</label>
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
                  Create Project
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
          <h3 className="font-bold text-slate-700 text-lg">No matching projects</h3>
          <p className="text-slate-400 text-xs max-w-sm mx-auto mt-1">
            Refine the filters or create a project to start tracking budgets, payments, and documents.
          </p>
          {onAddProject && (
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-blue-650 font-bold text-xs rounded-lg inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus size={14} /> Add First Project
            </button>
          )}
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
            const statusOptions: Array<{ value: ProjectStatus; label: string; className: string }> = [
              { value: 'ongoing', label: 'Ongoing', className: 'bg-[#cce0ff] text-[#00509e] border-[#66a3ff]' },
              { value: 'completed', label: 'Complete', className: 'bg-green-50 text-green-700 border-green-200' },
              { value: 'onhold', label: 'On Hold', className: 'bg-amber-50 text-amber-700 border-amber-200' },
            ];
            const activeStatus = statusOptions.find((status) => status.value === proj.status) || statusOptions[0];

            return (
              <div
                key={proj.id}
                className="group bg-white rounded-xl border border-slate-150 shadow-xs hover:border-[#66a3ff] hover:shadow-md transition-all duration-150 flex flex-col justify-between overflow-hidden"
                id={`project-${proj.id}`}
              >
                {/* Upper portion: click on contents to open detail */}
                <div className="p-5 space-y-4">
                  {/* Title & Rapid Status Toggle option directly on the card */}
                  <div className="flex justify-between items-start gap-3">
                    <div className="cursor-pointer flex-1" onClick={() => onSelectProject(proj.id)}>
                      <h4 className="font-bold text-base text-slate-950 group-hover:text-[#00509e] transition-colors leading-tight line-clamp-1">
                        {proj.name}
                      </h4>
                      <span className="text-[11px] text-[#00509e] font-semibold flex items-center gap-1.5 mt-1">
                        <User size={12} /> {proj.clientName}
                      </span>
                    </div>

                    {/* Highly accessible direct-interactive status select */}
                    <div className="relative flex flex-col items-end shrink-0">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (onUpdateStatus) {
                            setOpenStatusMenuId(openStatusMenuId === proj.id ? null : proj.id);
                          }
                        }}
                        className={`inline-flex min-w-28 items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition hover:shadow-xs ${onUpdateStatus ? 'cursor-pointer' : 'cursor-default'} ${activeStatus.className}`}
                        aria-haspopup={onUpdateStatus ? 'menu' : undefined}
                        aria-expanded={onUpdateStatus ? openStatusMenuId === proj.id : undefined}
                      >
                        <span>{activeStatus.label}</span>
                        {onUpdateStatus && <span className="text-[10px] leading-none">v</span>}
                      </button>
                      {onUpdateStatus && openStatusMenuId === proj.id && (
                        <div className="absolute right-0 top-9 z-30 w-32 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                          {statusOptions.map((status) => (
                            <button
                              key={status.value}
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onUpdateStatus(proj.id, status.value);
                                setOpenStatusMenuId(null);
                              }}
                              className={`flex w-full items-center justify-between border-none bg-white px-3 py-2 text-left text-xs font-semibold hover:bg-blue-50 cursor-pointer ${
                                proj.status === status.value ? 'text-[#00509e]' : 'text-slate-700'
                              }`}
                              role="menuitem"
                            >
                              <span>{status.label}</span>
                              {proj.status === status.value && <span className="text-[#00509e]">✓</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Divider line */}
                  <div className="h-[1px] bg-slate-100" />

                  {/* Body elements */}
                  <div className="space-y-2.5 cursor-pointer text-xs text-slate-600" onClick={() => onSelectProject(proj.id)}>
                    <p className="line-clamp-2 min-h-[2.7em] text-slate-500 mt-1 leading-relaxed">{proj.description || 'No project scope added yet.'}</p>
                    
                    {proj.address && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin size={14} className="text-[#66a3ff] shrink-0" />
                        <span className="line-clamp-1 text-[12px]">{proj.address}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center bg-blue-50 p-2.5 rounded-lg text-[11px] border border-blue-100">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Calendar size={13} className="text-[#66a3ff]" />
                        <span>Registered:</span>
                      </div>
                      <span className="font-mono text-slate-700 font-semibold">{formatDate(proj.createdAt)}</span>
                    </div>
                  </div>

                  {/* Budget usage representation */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                      <span>Budget used</span>
                      <span>{formatCurrency(totalOut)} <span className="text-slate-400">/ {formatCurrency(proj.budget)}</span></span>
                    </div>
                    <div className="w-full bg-blue-50 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          utilizationRate > 100
                            ? 'bg-rose-500'
                            : 'bg-[#003366]'
                        }`}
                        style={{ width: `${Math.min(100, utilizationRate)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>{utilizationRate.toFixed(0)}% utilized</span>
                      <span>{formatCurrency(Math.max(0, proj.budget - totalOut))} remaining</span>
                    </div>
                  </div>
                </div>

                {/* Lower Action bar */}
                <div className="bg-blue-50/70 px-5 py-3 border-t border-blue-100 flex justify-between items-center text-xs">
                  <div className="text-left">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Net Balance</span>
                    <span className={`font-bold ${activeBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {formatCurrency(activeBalance)}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => onSelectProject(proj.id)}
                    className="text-[#003366] hover:text-[#007acc] font-bold tracking-tight inline-flex items-center gap-1.5 cursor-pointer py-1.5 px-2.5 rounded-lg hover:bg-white transition"
                  >
                    Open ledger <ArrowRight size={13} />
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
