import React, { useState, useRef } from 'react';
import { CloudDocument, DocumentCategory } from '../types';
import { formatDate } from '../lib/formatter';
import { validateWorkspaceDocumentFile } from '../lib/fileStorage';
import { UploadCloud, File, FileText, Check, AlertCircle, RefreshCcw, Download, Trash2, Tag, Search, CornerDownRight } from 'lucide-react';

interface DocumentManagerProps {
  projectId: string;
  documents: CloudDocument[];
  onAddDocument?: (file: File, category: DocumentCategory) => void;
  onDeleteDocument?: (docId: string) => void;
  onDownloadDocument: (doc: CloudDocument) => void;
}

export default function DocumentManager({
  projectId,
  documents,
  onAddDocument,
  onDeleteDocument,
  onDownloadDocument,
}: DocumentManagerProps) {
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('invoice');
  const [dragOver, setDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter project documents
  const projectDocs = documents.filter((d) => d.projectId === projectId);
  
  const filteredDocs = projectDocs.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (categoryFilter === 'all') return matchesSearch;
    return matchesSearch && d.category === categoryFilter;
  });

  // Handle manual select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      uploadFile(file);
    }
  };

  // Drag and drop mechanics
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      uploadFile(file);
    }
  };

  const uploadFile = (file: File) => {
    if (!onAddDocument) return;
    const error = validateWorkspaceDocumentFile(file);
    if (error) {
      setUploadError(error);
      return;
    }
    setUploadError('');
    onAddDocument(file, selectedCategory);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getDocIcon = (category: DocumentCategory) => {
    switch (category) {
      case 'blueprint':
        return <FileText className="text-blue-500" size={24} />;
      case 'invoice':
        return <File className="text-slate-800" size={24} />;
      case 'receipt':
        return <File className="text-emerald-600" size={24} />;
      case 'contract':
        return <FileText className="text-stone-700" size={24} />;
      case 'estimate':
        return <FileText className="text-blue-600" size={24} />;
      default:
        return <File className="text-slate-400" size={24} />;
    }
  };

  return (
    <div className="space-y-6" id="document-manager-component">
      {/* Upload Zone */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {onAddDocument && (
        <div className="lg:col-span-1 space-y-4 text-left">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-slate-550 uppercase tracking-wider">
              Document Classification
            </h4>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {(['invoice', 'receipt', 'blueprint', 'estimate', 'contract', 'other'] as DocumentCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`py-1.5 px-2.5 rounded-lg border text-left font-medium capitalize cursor-pointer transition ${
                    selectedCategory === cat
                      ? 'bg-blue-100/60 text-blue-800 border-blue-300 shadow-xs font-bold'
                      : 'bg-white text-slate-600 border-slate-205 hover:bg-slate-50'
                  }`}
                >
                  • {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Core Dropbox */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition flex flex-col items-center justify-center gap-3 relative overflow-hidden ${
              dragOver
                ? 'border-blue-500 bg-blue-50/30'
                : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
            }`}
          >
            {/* Native input hidden */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            
            <UploadCloud size={32} className={dragOver ? 'text-blue-500 animate-bounce' : 'text-slate-400'} />
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                {dragOver ? 'Drop file here to upload' : 'Upload job site document'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Drag &amp; drop, or tap to choose file (PDF, image, spreadsheet, Word up to 10MB)
              </span>
              {uploadError && (
                <span className="mt-1 block text-[10px] font-bold text-rose-600">{uploadError}</span>
              )}
            </div>
            <span className="text-[10px] mt-1 bg-slate-900 text-white px-2.5 py-0.5 rounded-full font-bold">
              Target Cat: {selectedCategory}
            </span>
          </div>
        </div>
        )}

        {/* Sync List */}
        <div className={`${onAddDocument ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white rounded-xl border border-slate-150 p-5 space-y-4`}>
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center border-b border-slate-100 pb-3 text-left">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Documents</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Project files, drawings, bills, and reference documents.</p>
            </div>

            <div className="flex gap-2 text-xs">
              <input
                type="text"
                placeholder="Find synced files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-100 rounded-lg px-1 text-slate-600 focus:outline-none"
              >
                <option value="all">Filters</option>
                <option value="blueprint">Blueprint</option>
                <option value="invoice">Invoice</option>
                <option value="receipt">Receipt</option>
                <option value="estimate">Estimate</option>
                <option value="contract">Contract</option>
              </select>
            </div>
          </div>

          {filteredDocs.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <UploadCloud size={30} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-medium">No documents uploaded for this project</p>
              <p className="text-[10px] text-slate-350">Categorize and drag files into the active zone</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100" id="documents-synced-rows">
              {filteredDocs.map((doc) => (
                <div key={doc.id} className="py-3 flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    {getDocIcon(doc.category)}
                    <div className="text-left">
                      <span className="text-xs font-bold text-slate-800 block truncate max-w-xs sm:max-w-md">
                        {doc.name}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                        <span className="uppercase font-mono bg-slate-100 text-slate-500 font-semibold px-1 rounded">
                          {doc.category}
                        </span>
                        <span className="text-slate-400">{formatFileSize(doc.size)}</span>
                        <span className="text-slate-350">•</span>
                        <span className="text-slate-400 font-semibold">Uploaded {formatDate(doc.uploadedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Status badge */}
                    {doc.syncStatus === 'syncing' ? (
                      <span className="text-blue-600 font-semibold text-[10px] flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full animate-pulse border border-blue-200">
                        <RefreshCcw size={10} className="animate-spin" /> Syncing
                      </span>
                    ) : doc.syncStatus === 'failed' ? (
                      <span className="text-rose-700 font-semibold text-[10px] flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                        <AlertCircle size={11} /> Failed
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-semibold text-[10px] flex items-center gap-0.5 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        <Check size={11} className="text-emerald-600" /> Synced
                      </span>
                    )}

                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => onDownloadDocument(doc)}
                        className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-slate-50 border-none bg-transparent cursor-pointer"
                        title="Download file"
                      >
                        <Download size={13} />
                      </button>
                      {onDeleteDocument && (
                        <button
                          onClick={() => onDeleteDocument(doc.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
                          title="Delete document"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
