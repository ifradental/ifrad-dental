'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  Search, 
  LayoutTemplate, 
  Sparkles, 
  FileText, 
  Pill, 
  Clock, 
  Utensils, 
  DollarSign, 
  Building2, 
  Share2, 
  Activity, 
  Stethoscope, 
  ClipboardList, 
  MessageSquare, 
  ListChecks, 
  RefreshCw,
  CheckCircle2,
  Edit2
} from 'lucide-react';
import { db, type TemplateItem } from '@/lib/db';
import { syncEngine } from '@/lib/syncEngine';

type CategoryKey = 
  | 'treatment' 
  | 'advice' 
  | 'drug' 
  | 'dose' 
  | 'food' 
  | 'duration' 
  | 'cost' 
  | 'company_priority' 
  | 'refer_to' 
  | 'cc_auto' 
  | 'dx_auto' 
  | 'ix_auto' 
  | 'advice_auto' 
  | 'note_auto' 
  | 'plan_auto' 
  | 'drug_auto'
  | 'drughistory_auto';

interface CategoryMeta {
  key: CategoryKey;
  label: string;
  icon: React.ReactNode;
  col: 1 | 2 | 3;
  description: string;
}

const CATEGORIES: CategoryMeta[] = [
  // Column 1
  { key: 'treatment', label: 'Treatment Template', icon: <FileText className="w-3.5 h-3.5" />, col: 1, description: 'Predefined clinical treatment bundles & procedures' },
  { key: 'advice', label: 'Advice Template', icon: <MessageSquare className="w-3.5 h-3.5" />, col: 1, description: 'Standard post-treatment patient advice' },
  { key: 'drug', label: 'Drug Template', icon: <Pill className="w-3.5 h-3.5" />, col: 1, description: 'Standard medication bundles & prescriptions' },
  { key: 'dose', label: 'Dose Template', icon: <Clock className="w-3.5 h-3.5" />, col: 1, description: 'Dose timing formulas (e.g. ১+০+১)' },
  { key: 'food', label: 'Food Template', icon: <Utensils className="w-3.5 h-3.5" />, col: 1, description: 'Food relationship instructions (e.g. খাবার পর)' },
  { key: 'duration', label: 'Duration Template', icon: <Clock className="w-3.5 h-3.5" />, col: 1, description: 'Treatment duration rules (e.g. ০৫ দিন)' },

  // Column 2
  { key: 'cost', label: 'Treatment Cost', icon: <DollarSign className="w-3.5 h-3.5" />, col: 2, description: 'Dental clinical procedure fees and rates (TK)' },
  { key: 'company_priority', label: 'Company Priority', icon: <Building2 className="w-3.5 h-3.5" />, col: 2, description: 'Pharmaceutical company search prioritization' },
  { key: 'refer_to', label: 'Refer to', icon: <Share2 className="w-3.5 h-3.5" />, col: 2, description: 'Specialist doctors & hospital referral directory' },

  // Column 3
  { key: 'cc_auto', label: 'C/C Autosave', icon: <Activity className="w-3.5 h-3.5" />, col: 3, description: 'Chief complaint auto-complete frequencies' },
  { key: 'dx_auto', label: 'D/X Autosave', icon: <Stethoscope className="w-3.5 h-3.5" />, col: 3, description: 'Diagnosis auto-complete frequencies' },
  { key: 'ix_auto', label: 'I/X Autosave', icon: <ClipboardList className="w-3.5 h-3.5" />, col: 3, description: 'Investigation auto-complete frequencies' },
  { key: 'advice_auto', label: 'Advice Autosave', icon: <MessageSquare className="w-3.5 h-3.5" />, col: 3, description: 'Frequent advice auto-complete frequencies' },
  { key: 'note_auto', label: 'Note Autosave', icon: <FileText className="w-3.5 h-3.5" />, col: 3, description: 'Doctor special note auto-complete frequencies' },
  { key: 'plan_auto', label: 'Plan Autosave', icon: <ListChecks className="w-3.5 h-3.5" />, col: 3, description: 'Treatment plan auto-complete frequencies' },
  { key: 'drug_auto', label: 'Drug Autosave', icon: <Pill className="w-3.5 h-3.5" />, col: 3, description: 'Frequent drug prescription frequencies' },
  { key: 'drughistory_auto', label: 'Drug History Autosave', icon: <Pill className="w-3.5 h-3.5" />, col: 3, description: 'Patient previous medication & drug history auto-complete frequencies' },
];

export default function TemplatesPage() {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('treatment');
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Form State
  const [newName, setNewName] = useState<string>('');
  const [newPrice, setNewPrice] = useState<number | ''>('');
  const [newPriority, setNewPriority] = useState<number | ''>('');
  const [newContent, setNewContent] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const list = await db.templates.toArray();
    setTemplates(list);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    if (editingId) {
      // Update existing
      const updateData: Partial<TemplateItem> = {
        name: newName.trim(),
        price: activeCategory === 'cost' ? (Number(newPrice) || 0) : undefined,
        priority: activeCategory === 'company_priority' ? (Number(newPriority) || 1) : undefined,
        content: newContent.trim() || undefined,
      };
      await db.templates.update(editingId, updateData);
      const updated = await db.templates.get(editingId);
      if (updated) {
        await syncEngine.logMutation('templates', 'UPDATE', editingId, updated);
      }
      setEditingId(null);
    } else {
      // Add new
      const item: TemplateItem = {
        id: `tmpl_${Date.now()}`,
        type: activeCategory,
        name: newName.trim(),
        price: activeCategory === 'cost' ? (Number(newPrice) || 0) : undefined,
        priority: activeCategory === 'company_priority' ? (Number(newPriority) || 1) : undefined,
        content: newContent.trim() || undefined,
        count: 1,
      };
      await db.templates.put(item);
      await syncEngine.logMutation('templates', 'INSERT', item.id, item);
    }

    setNewName('');
    setNewPrice('');
    setNewPriority('');
    setNewContent('');
    loadTemplates();
  };

  const handleEdit = (item: TemplateItem) => {
    setEditingId(item.id);
    setNewName(item.name);
    setNewPrice(item.price !== undefined ? item.price : '');
    setNewPriority(item.priority !== undefined ? item.priority : '');
    setNewContent(item.content || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewName('');
    setNewPrice('');
    setNewPriority('');
    setNewContent('');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this template entry?')) {
      await db.templates.delete(id);
      await syncEngine.logMutation('templates', 'DELETE', id, { id });
      loadTemplates();
    }
  };

  const handleInlinePriceChange = async (id: string, price: number) => {
    await db.templates.update(id, { price });
    const updated = await db.templates.get(id);
    if (updated) {
      await syncEngine.logMutation('templates', 'UPDATE', id, updated);
    }
    loadTemplates();
  };

  const handleInlinePriorityChange = async (id: string, priority: number) => {
    await db.templates.update(id, { priority });
    const updated = await db.templates.get(id);
    if (updated) {
      await syncEngine.logMutation('templates', 'UPDATE', id, updated);
    }
    loadTemplates();
  };

  const handleInlineCountChange = async (id: string, count: number) => {
    await db.templates.update(id, { count });
    const updated = await db.templates.get(id);
    if (updated) {
      await syncEngine.logMutation('templates', 'UPDATE', id, updated);
    }
    loadTemplates();
  };

  const currentMeta = CATEGORIES.find((c) => c.key === activeCategory)!;
  const currentList = templates
    .filter((t) => t.type === activeCategory)
    .filter((t) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        (t.content && t.content.toLowerCase().includes(q))
      );
    });

  // Calculate count badges for each category
  const countByCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat.key] = templates.filter((t) => t.type === cat.key).length;
    return acc;
  }, {} as Record<CategoryKey, number>);

  return (
    <div className="p-3 max-w-[1500px] mx-auto text-slate-800 space-y-3">
      {/* Top Banner Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-700 to-sky-500 text-white rounded-xl flex items-center justify-center shadow-md">
            <LayoutTemplate className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <span>টেমপ্লেট ও অটো-সেভ ম্যানেজমেন্ট (Templates Hub)</span>
              <span className="bg-sky-100 text-sky-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                Dentist PRO 7.0
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              ১৬টি ক্যাটাগরির ক্লিনিক্যাল ট্রিটমেন্ট, খরচ, ড্রাগ বান্ডেল, পরামর্শ এবং অটো-লার্নিং ফ্রিকোয়েন্সি কনফিগার করুন
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => loadTemplates()}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>রিফ্রেশ</span>
          </button>
        </div>
      </div>

      {/* 3-COLUMN CATEGORY NAVIGATION GRID (Matching Dentist PRO Screenshot) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
          টেমপ্লেট ক্যাটাগরি তালিকা (Select Template Group)
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Column 1: Clinical Protocols & Prescriptions */}
          <div className="space-y-1.5 bg-slate-50/60 p-2.5 rounded-xl border border-slate-200/80">
            <div className="text-[10px] font-bold text-blue-900 uppercase tracking-wider px-1 mb-1">
              ১. প্রেসক্রিপশন ও প্রটোকল
            </div>
            {CATEGORIES.filter((c) => c.col === 1).map((cat) => {
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => {
                    setActiveCategory(cat.key);
                    handleCancelEdit();
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition ${
                    isActive
                      ? 'bg-blue-700 text-white shadow-sm font-bold'
                      : 'bg-white hover:bg-sky-50 text-slate-700 border border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    {cat.icon}
                    <span className="truncate">{cat.label}</span>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {countByCategory[cat.key]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Column 2: Financials & Hospital Referrals */}
          <div className="space-y-1.5 bg-slate-50/60 p-2.5 rounded-xl border border-slate-200/80">
            <div className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider px-1 mb-1">
              ২. খরচ, কোম্পানি ও রেফারেল
            </div>
            {CATEGORIES.filter((c) => c.col === 2).map((cat) => {
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => {
                    setActiveCategory(cat.key);
                    handleCancelEdit();
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-sm font-bold'
                      : 'bg-white hover:bg-emerald-50 text-slate-700 border border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    {cat.icon}
                    <span className="truncate">{cat.label}</span>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {countByCategory[cat.key]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Column 3: Auto-Save Smart Learning Hub */}
          <div className="space-y-1.5 bg-slate-50/60 p-2.5 rounded-xl border border-slate-200/80">
            <div className="text-[10px] font-bold text-purple-900 uppercase tracking-wider px-1 mb-1">
              ৩. অটো-সেভ স্মার্ট লার্নিং
            </div>
            {CATEGORIES.filter((c) => c.col === 3).map((cat) => {
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => {
                    setActiveCategory(cat.key);
                    handleCancelEdit();
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition ${
                    isActive
                      ? 'bg-purple-700 text-white shadow-sm font-bold'
                      : 'bg-white hover:bg-purple-50 text-slate-700 border border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    {cat.icon}
                    <span className="truncate">{cat.label}</span>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {countByCategory[cat.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Action & Data Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
        {/* Active Tab Subheader */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                {currentMeta.icon}
              </div>
              <h2 className="text-sm font-bold text-slate-900">{currentMeta.label}</h2>
              <span className="bg-slate-100 text-slate-700 text-[11px] font-mono px-2 py-0.5 rounded font-bold">
                {currentList.length} Items
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{currentMeta.description}</p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search in ${currentMeta.label}...`}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Add / Edit Form Card */}
        <form onSubmit={handleSaveTemplate} className="bg-sky-50/70 border border-sky-200/90 rounded-xl p-3.5 text-xs">
          <div className="font-bold text-blue-900 mb-2 flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>{editingId ? `Edit ${currentMeta.label} Entry` : `Add New ${currentMeta.label} Entry`}</span>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-[11px] text-slate-500 hover:text-slate-800 underline"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-12 gap-2.5 items-end">
            {/* 1. Name Input */}
            <div className={activeCategory === 'cost' ? 'col-span-12 sm:col-span-6' : activeCategory === 'company_priority' ? 'col-span-12 sm:col-span-7' : 'col-span-12 sm:col-span-5'}>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Name / Title / Drug / Particular <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Anterior Composite Splinting / ১+০+১ / Advice Title..."
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* 2. Price Input (Treatment Cost) */}
            {activeCategory === 'cost' && (
              <div className="col-span-12 sm:col-span-4">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Default Fee / Price (BDT ৳) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 2500"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            )}

            {/* 3. Priority Input (Company Priority) */}
            {activeCategory === 'company_priority' && (
              <div className="col-span-12 sm:col-span-3">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Priority Rank (1 = Top)
                </label>
                <input
                  type="number"
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 1"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}

            {/* 4. Content / Description Input (for Treatment, Advice, Drug, Referral, Notes) */}
            {activeCategory !== 'cost' && activeCategory !== 'company_priority' && (
              <div className="col-span-12 sm:col-span-5">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Details / Content / Rule Instruction
                </label>
                <input
                  type="text"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Bengali / English instruction, dosage or clinical notes..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}

            {/* 5. Submit Button */}
            <div className="col-span-12 sm:col-span-2">
              <button
                type="submit"
                className="w-full py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow transition flex items-center justify-center space-x-1"
              >
                {editingId ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{editingId ? 'Update' : 'Add Item'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Templates Data Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="p-3 w-12 text-center">SI</th>
                <th className="p-3">Name / Title</th>
                {activeCategory !== 'cost' && activeCategory !== 'company_priority' && (
                  <th className="p-3">Content / Clinical Rule</th>
                )}
                {activeCategory === 'cost' && <th className="p-3 w-48">Default Price (TK ৳)</th>}
                {activeCategory === 'company_priority' && <th className="p-3 w-36">Priority Rank</th>}
                {activeCategory.endsWith('_auto') && <th className="p-3 w-36">Usage Count</th>}
                <th className="p-3 w-32 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    কোনো ডাটা পাওয়া যায়নি। উপরে ফরম থেকে নতুন এন্ট্রি যোগ করুন।
                  </td>
                </tr>
              ) : (
                currentList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-sky-50/50 transition">
                    <td className="p-3 text-center text-slate-400 font-mono font-semibold">{idx + 1}</td>
                    
                    {/* Name */}
                    <td className="p-3 font-semibold text-slate-900">
                      <div className="flex items-center space-x-2">
                        <span>{item.name}</span>
                      </div>
                    </td>

                    {/* Content */}
                    {activeCategory !== 'cost' && activeCategory !== 'company_priority' && (
                      <td className="p-3 text-slate-600 max-w-md">
                        <div className="line-clamp-2 leading-relaxed font-sans">{item.content || '—'}</div>
                      </td>
                    )}

                    {/* Price with Inline Edit */}
                    {activeCategory === 'cost' && (
                      <td className="p-3">
                        <div className="flex items-center space-x-1">
                          <span className="text-slate-400 font-mono">৳</span>
                          <input
                            type="number"
                            defaultValue={item.price}
                            onBlur={(e) => handleInlinePriceChange(item.id, Number(e.target.value) || 0)}
                            className="w-32 px-2.5 py-1 bg-white border border-slate-300 focus:border-emerald-600 rounded-md font-bold text-emerald-800 text-xs focus:outline-none"
                          />
                        </div>
                      </td>
                    )}

                    {/* Priority with Inline Edit */}
                    {activeCategory === 'company_priority' && (
                      <td className="p-3">
                        <input
                          type="number"
                          defaultValue={item.priority || 1}
                          onBlur={(e) => handleInlinePriorityChange(item.id, Number(e.target.value) || 1)}
                          className="w-24 px-2 py-1 bg-white border border-slate-300 focus:border-blue-600 rounded-md font-bold text-blue-900 text-xs focus:outline-none"
                        />
                      </td>
                    )}

                    {/* Autosave Count with Inline Edit */}
                    {activeCategory.endsWith('_auto') && (
                      <td className="p-3">
                        <input
                          type="number"
                          defaultValue={item.count || 1}
                          onBlur={(e) => handleInlineCountChange(item.id, Number(e.target.value) || 1)}
                          className="w-24 px-2 py-1 bg-white border border-slate-300 focus:border-purple-600 rounded-md font-bold text-purple-900 text-xs font-mono focus:outline-none"
                        />
                      </td>
                    )}

                    {/* Actions */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

