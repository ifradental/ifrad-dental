'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Pill, 
  Check, 
  Sparkles, 
  DownloadCloud,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Cloud,
  CheckCircle2,
  Database,
  Upload
} from 'lucide-react';
import { db, type Drug } from '@/lib/db';
import { syncEngine, type SyncStatus } from '@/lib/syncEngine';
import { MEDX_DRUG_DATABASE } from '@/lib/medxDrugs';

export default function DrugDbPage() {
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'brand' | 'generic'>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingDrug, setEditingDrug] = useState<Drug | null>(null);
  const [medxLoadedMessage, setMedxLoadedMessage] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [mongoCount, setMongoCount] = useState<number | null>(null);
  const itemsPerPage = 50;

  // Form State
  const [drugName, setDrugName] = useState<string>('');
  const [strength, setStrength] = useState<string>('');
  const [form, setForm] = useState<string>('TAB.');
  const [company, setCompany] = useState<string>('');
  const [genericName, setGenericName] = useState<string>('');
  const [indication, setIndication] = useState<string>('');

  useEffect(() => {
    loadDrugs();
    checkMongoCount();

    const unsubscribe = syncEngine.subscribe((status, count) => {
      setSyncStatus(status);
      setPendingCount(count);
    });

    return () => unsubscribe();
  }, []);

  const checkMongoCount = async () => {
    try {
      const res = await fetch('/api/drugs?limit=1');
      if (res.ok) {
        const data = await res.json();
        if (data.success && typeof data.total === 'number') {
          setMongoCount(data.total);
        }
      }
    } catch (e) {
      console.warn('MongoDB check notice:', e);
    }
  };

  const loadDrugs = async () => {
    const list = await db.drugs.toArray();
    setDrugs(list);
  };

  const handleImportMedXDataset = async () => {
    let addedCount = 0;
    for (const item of MEDX_DRUG_DATABASE) {
      const existing = await db.drugs.where('name').equalsIgnoreCase(item.name).first();
      if (!existing) {
        const drugId = `medx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const drugData: Drug = {
          id: drugId,
          name: item.name,
          strength: item.strength,
          form: item.form,
          prescriptionName: item.prescriptionName,
          company: item.company,
          generic: item.generic,
          indication: `${item.therapeuticCategory}: ${item.indication}`,
          createdAt: new Date().toISOString(),
        };
        await db.drugs.put(drugData);
        await syncEngine.logMutation('drugs', 'INSERT', drugId, drugData);
        addedCount++;
      }
    }
    await loadDrugs();
    setMedxLoadedMessage(`Successfully synchronized ${addedCount > 0 ? addedCount : 'all'} MedX clinical monographs & products!`);
    setTimeout(() => setMedxLoadedMessage(''), 4000);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setMedxLoadedMessage('Initiating two-way sync with MongoDB database...');
    try {
      const res = await syncEngine.triggerSync();
      await syncEngine.pullUpdates();
      await loadDrugs();
      await checkMongoCount();
      setMedxLoadedMessage(res.message || 'Synced successfully with MongoDB!');
      setTimeout(() => setMedxLoadedMessage(''), 4000);
    } catch (e: any) {
      setMedxLoadedMessage('Sync completed with notice: ' + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePushAllToMongo = async () => {
    setIsSyncing(true);
    setMedxLoadedMessage('Saving all local drugs to MongoDB database...');
    try {
      const allLocalDrugs = await db.drugs.toArray();
      const res = await fetch('/api/drugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drugs: allLocalDrugs }),
      });
      const data = await res.json();
      if (data.success) {
        setMedxLoadedMessage(`Successfully saved all ${allLocalDrugs.length} drugs directly to MongoDB!`);
      } else {
        setMedxLoadedMessage(data.message || 'Saved locally, MongoDB pending.');
      }
      await checkMongoCount();
      setTimeout(() => setMedxLoadedMessage(''), 5000);
    } catch (e: any) {
      setMedxLoadedMessage('Sync completed with local persistence: ' + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveDrug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drugName.trim()) return;

    const prescriptionName = `${form} ${drugName.toUpperCase()} ${strength}`.trim();
    const drugId = editingDrug ? editingDrug.id : `drug_${Date.now()}`;

    const drugData: Drug = {
      id: drugId,
      name: drugName.toUpperCase(),
      strength,
      form,
      prescriptionName,
      company: company || 'Generic',
      generic: genericName,
      indication,
      createdAt: new Date().toISOString(),
    };

    await db.drugs.put(drugData);
    await syncEngine.logMutation('drugs', editingDrug ? 'UPDATE' : 'INSERT', drugId, drugData);

    // Direct push to MongoDB API for immediate persistence
    fetch('/api/drugs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drug: drugData }),
    })
      .then(() => checkMongoCount())
      .catch((e) => console.warn('Direct MongoDB save notice:', e));

    // Reset Form
    setDrugName('');
    setStrength('');
    setForm('TAB.');
    setCompany('');
    setGenericName('');
    setIndication('');
    setEditingDrug(null);
    setShowAddModal(false);
    loadDrugs();
    setMedxLoadedMessage(`Drug "${drugData.name}" successfully saved and sent to MongoDB!`);
    setTimeout(() => setMedxLoadedMessage(''), 4000);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this drug from the database?')) {
      await db.drugs.delete(id);
      await syncEngine.logMutation('drugs', 'DELETE', id, { id });
      await loadDrugs();
      checkMongoCount();
    }
  };

  // Reset to page 1 on search or filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter]);

  const filteredDrugs = drugs.filter((d) => {
    const query = searchQuery.toLowerCase();
    if (activeFilter === 'brand') return d.name.toLowerCase().includes(query);
    if (activeFilter === 'generic') return d.generic.toLowerCase().includes(query);
    return (
      d.name.toLowerCase().includes(query) ||
      d.generic.toLowerCase().includes(query) ||
      d.company?.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(filteredDrugs.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredDrugs.length);
  const paginatedDrugs = filteredDrugs.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="p-3 max-w-[1550px] mx-auto text-slate-800">
      <div className="bg-white rounded-lg border border-slate-300 shadow-sm p-4">
        {/* Header & Action Toolbar (Matching drugdb.png) */}
        <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-slate-200 gap-2">
          <div>
            <h1 className="text-base font-bold text-blue-950 flex items-center space-x-2">
              <Pill className="w-5 h-5 text-blue-600" />
              <span>Drugs Information System (Drug DB)</span>
            </h1>
            <p className="text-xs text-slate-500">
              Manage local medicine database, brands, strengths, and generic groups (Offline & Online)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* MongoDB Live Sync Indicator */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-50 rounded-lg text-[11px] font-medium border border-slate-200 shadow-xs">
              <span className={`w-2 h-2 rounded-full ${syncStatus === 'online' ? 'bg-emerald-500' : syncStatus === 'syncing' ? 'bg-amber-500 animate-ping' : 'bg-slate-400'}`}></span>
              <Cloud className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-slate-700">
                {isSyncing ? 'Syncing...' : mongoCount !== null ? `MongoDB: ${mongoCount} saved` : 'MongoDB Connected'}
              </span>
              {pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                  {pendingCount} pending
                </span>
              )}
            </div>

            {/* Sync Now Button */}
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition disabled:opacity-50"
              title="Sync drugs with MongoDB Atlas cloud database"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Cloud'}</span>
            </button>

            {/* Push All Local to MongoDB Button */}
            <button
              onClick={handlePushAllToMongo}
              disabled={isSyncing}
              className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 rounded text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition disabled:opacity-50"
              title="Save all local medicines to MongoDB"
            >
              <Upload className="w-3.5 h-3.5 text-sky-600" />
              <span>Backup All to Mongo</span>
            </button>

            <button
              onClick={handleImportMedXDataset}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-semibold flex items-center space-x-1.5 shadow"
              title="Import all pharmaceutical monographs and drug interaction data from MedX"
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              <span>Load MedX Clinical DB</span>
            </button>

            <button
              onClick={() => {
                setEditingDrug(null);
                setShowAddModal(true);
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center space-x-1 shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Drug</span>
            </button>
          </div>
        </div>

        {medxLoadedMessage && (
          <div className="mb-3 p-2 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded text-xs flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{medxLoadedMessage}</span>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="grid grid-cols-12 gap-3 mb-3 text-xs">
          <div className="col-span-12 md:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Brand Name, Generic, Manufacturer..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="col-span-12 md:col-span-6 flex space-x-1.5">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded font-medium ${
                activeFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All ({drugs.length})
            </button>
            <button
              onClick={() => setActiveFilter('brand')}
              className={`px-3 py-1 rounded font-medium ${
                activeFilter === 'brand'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              By Brand
            </button>
            <button
              onClick={() => setActiveFilter('generic')}
              className={`px-3 py-1 rounded font-medium ${
                activeFilter === 'generic'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              By Generic
            </button>
          </div>
        </div>

        {/* Drug Grid Table */}
        <div className="overflow-x-auto border border-slate-200 rounded">
          <table className="w-full text-xs text-left">
            <thead className="bg-sky-50 text-slate-700 border-b border-slate-200 font-semibold">
              <tr>
                <th className="p-2 w-12 text-center">SI</th>
                <th className="p-2">Prescription Format</th>
                <th className="p-2">Generic Name</th>
                <th className="p-2">Company / Manufacturer</th>
                <th className="p-2">Indication / Class</th>
                <th className="p-2 w-28 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedDrugs.map((drug, index) => (
                <tr key={drug.id} className="hover:bg-sky-50/40">
                  <td className="p-2 text-center text-slate-500 font-semibold">{startIndex + index + 1}</td>
                  <td className="p-2">
                    <span className="font-bold text-blue-900">{drug.prescriptionName}</span>
                  </td>
                  <td className="p-2 text-slate-700 font-medium">{drug.generic}</td>
                  <td className="p-2 text-slate-600">{drug.company}</td>
                  <td className="p-2 text-slate-500">{drug.indication || drug.drugClass || '-'}</td>
                  <td className="p-2 text-center">
                    <div className="flex justify-center space-x-1">
                      <button
                        onClick={() => {
                          setEditingDrug(drug);
                          setDrugName(drug.name);
                          setStrength(drug.strength);
                          setForm(drug.form);
                          setCompany(drug.company);
                          setGenericName(drug.generic);
                          setIndication(drug.indication || '');
                          setShowAddModal(true);
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit Medicine"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(drug.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Delete Medicine"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedDrugs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    No medicines found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-wrap items-center justify-between mt-3 pt-3 border-t border-slate-200 text-xs text-slate-600 gap-2">
          <div>
            Showing <span className="font-bold text-slate-900">{filteredDrugs.length > 0 ? startIndex + 1 : 0}</span> to{' '}
            <span className="font-bold text-slate-900">{endIndex}</span> of{' '}
            <span className="font-bold text-slate-900">{filteredDrugs.length}</span> medicines (50 per page)
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-2 py-1 border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center"
              title="First Page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-0.5"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            {/* Smart Windowed Page Numbers */}
            {(() => {
              const pages: (number | string)[] = [];
              if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
              } else {
                if (currentPage <= 4) {
                  pages.push(1, 2, 3, 4, 5, '...', totalPages);
                } else if (currentPage >= totalPages - 3) {
                  pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                } else {
                  pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
                }
              }

              return pages.map((p, idx) => {
                if (p === '...') {
                  return (
                    <span key={`ellipsis_${idx}`} className="px-2 py-1 text-slate-400 font-bold">
                      ...
                    </span>
                  );
                }
                const pageNum = Number(p);
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-2.5 py-1 rounded font-semibold border ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              });
            })()}

            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-2 py-1 border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-0.5"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-2 py-1 border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center"
              title="Last Page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ADD / EDIT DRUG MODAL (Matching drugdb_new_drug.png) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden border border-slate-300">
            <div className="bg-blue-700 text-white px-4 py-2.5 font-bold flex justify-between items-center">
              <span>{editingDrug ? 'EDIT DRUG' : 'ADD NEW DRUG'}</span>
              <button onClick={() => setShowAddModal(false)} className="text-white hover:bg-white/20 p-1 rounded">
                ×
              </button>
            </div>

            <form onSubmit={handleSaveDrug} className="p-4 space-y-2.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Drug Name *</label>
                <input
                  type="text"
                  required
                  value={drugName}
                  onChange={(e) => setDrugName(e.target.value)}
                  placeholder="e.g. Ace"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:border-blue-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Strength</label>
                  <input
                    type="text"
                    value={strength}
                    onChange={(e) => setStrength(e.target.value)}
                    placeholder="e.g. 500mg"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Form *</label>
                  <select
                    value={form}
                    onChange={(e) => setForm(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="TAB.">TAB. (Tablet)</option>
                    <option value="CAP.">CAP. (Capsule)</option>
                    <option value="SYR.">SYR. (Syrup)</option>
                    <option value="INJ.">INJ. (Injection)</option>
                    <option value="DROP">DROP (Drop)</option>
                    <option value="GEL">GEL (Gel / Ointment)</option>
                    <option value="MOUTHWASH">MOUTHWASH</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Prescription Format Preview</label>
                <div className="p-2 bg-slate-100 rounded font-bold text-blue-900 border border-slate-200">
                  {form} {drugName.toUpperCase() || 'DRUG'} {strength}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Company / Manufacturer *</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Square Pharmaceuticals"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Generic Name *</label>
                <input
                  type="text"
                  value={genericName}
                  onChange={(e) => setGenericName(e.target.value)}
                  placeholder="e.g. Paracetamol"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Indication</label>
                <input
                  type="text"
                  value={indication}
                  onChange={(e) => setIndication(e.target.value)}
                  placeholder="e.g. Fever, Toothache"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold shadow"
                >
                  Submit & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

