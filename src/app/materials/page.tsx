'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Minus,
  ShoppingCart,
  AlertTriangle,
  Search,
  TrendingUp,
  Layers,
  Trash2,
  History,
  DollarSign,
  User,
  Calendar,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  X,
  RotateCcw,
  FileText,
  Sparkles,
  Filter,
  Stethoscope,
  Activity,
  Tag,
  Edit3
} from 'lucide-react';
import { db, type MaterialItem, type StockEntry, type MaterialUsage } from '@/lib/db';
import { syncEngine } from '@/lib/syncEngine';
import { useAuth } from '@/context/AuthContext';
import { logActivity } from '@/lib/activityLogger';

export default function MaterialPage() {
  const { user } = useAuth();

  const userRole = (user?.role || '').toLowerCase();
  const isReceptionistOrCashier = userRole.includes('receptionist') || userRole.includes('cashier');

  const [activeSubTab, setActiveSubTab] = useState<'items' | 'stock_out' | 'stock_in' | 'usage_ledger' | 'low_stock'>('items');
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [materialUsages, setMaterialUsages] = useState<MaterialUsage[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  // Add Item State
  const [itemCode, setItemCode] = useState<string>('');
  const [itemName, setItemName] = useState<string>('');
  const [manufacturer, setManufacturer] = useState<string>('');
  const [category, setCategory] = useState<string>('Dental Material');
  const [lowStockLimit, setLowStockLimit] = useState<number>(5);
  const [supplier, setSupplier] = useState<string>('');
  const [supplierMobile, setSupplierMobile] = useState<string>('');
  const [unit, setUnit] = useState<string>('Pcs');
  const [defaultCost, setDefaultCost] = useState<number>(0);
  const [defaultPrice, setDefaultPrice] = useState<number>(0);

  // Edit Item Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<{
    id: string;
    code: string;
    name: string;
    manufacturer: string;
    category: string;
    lowStockLimit: number;
    supplier: string;
    supplierMobile: string;
    unit: string;
    unitCost: number;
    sellingPrice: number;
    currentStock: number;
  } | null>(null);

  // Stock In State
  const [selectedStockInId, setSelectedStockInId] = useState<string>('');
  const [stockInQty, setStockInQty] = useState<number>(10);
  const [stockInUnitCost, setStockInUnitCost] = useState<number>(0);
  const [stockInExpiryDate, setStockInExpiryDate] = useState<string>('');
  const [stockInInvoiceNo, setStockInInvoiceNo] = useState<string>('');
  const [stockInDate, setStockInDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Stock Out / Sale / Usage State
  const [selectedStockOutId, setSelectedStockOutId] = useState<string>('');
  const [stockOutType, setStockOutType] = useState<'usage' | 'sale' | 'damage'>('usage');
  const [stockOutQty, setStockOutQty] = useState<number>(1);
  const [stockOutUnitPrice, setStockOutUnitPrice] = useState<number>(0);
  const [stockOutPatientRegNo, setStockOutPatientRegNo] = useState<string>('');
  const [stockOutPatientName, setStockOutPatientName] = useState<string>('');
  const [stockOutProcedure, setStockOutProcedure] = useState<string>('');
  const [stockOutNote, setStockOutNote] = useState<string>('');
  const [stockOutDate, setStockOutDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Quick Modal States
  const [quickActionModal, setQuickActionModal] = useState<{
    isOpen: boolean;
    type: 'stock_in' | 'stock_out';
    material: MaterialItem | null;
  }>({
    isOpen: false,
    type: 'stock_out',
    material: null,
  });
  const [quickQty, setQuickQty] = useState<number>(1);
  const [quickUnitPrice, setQuickUnitPrice] = useState<number>(0);
  const [quickOutType, setQuickOutType] = useState<'usage' | 'sale' | 'damage'>('usage');
  const [quickPatientName, setQuickPatientName] = useState<string>('');
  const [quickPatientRegNo, setQuickPatientRegNo] = useState<string>('');
  const [quickProcedure, setQuickProcedure] = useState<string>('');
  const [quickNote, setQuickNote] = useState<string>('');

  // Ledger Filter State
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<string>('All');
  const [ledgerSearch, setLedgerSearch] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [matList, sEntries, usages] = await Promise.all([
        db.materials.toArray(),
        db.stockEntries.reverse().toArray(),
        db.materialUsages.reverse().toArray(),
      ]);
      setMaterials(matList);
      setStockEntries(sEntries);
      setMaterialUsages(usages);
    } catch (e) {
      console.error('Failed to load inventory data:', e);
    }
  };

  // Auto-fill price when selecting item in Stock Out
  const handleStockOutMaterialChange = (matId: string) => {
    setSelectedStockOutId(matId);
    const mat = materials.find((m) => m.id === matId);
    if (mat) {
      if (mat.sellingPrice && mat.sellingPrice > 0) {
        setStockOutUnitPrice(mat.sellingPrice);
      } else if (mat.unitCost && mat.unitCost > 0) {
        setStockOutUnitPrice(mat.unitCost);
      } else {
        setStockOutUnitPrice(0);
      }
    }
  };

  // Add New Item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    const newItem: MaterialItem = {
      id: `mat_${Date.now()}`,
      code: itemCode.trim() || Math.floor(10 + Math.random() * 90).toString(),
      name: itemName.trim().toUpperCase(),
      manufacturer: manufacturer.trim().toUpperCase(),
      category: category.trim(),
      lowStockLimit: Number(lowStockLimit) || 5,
      supplier: supplier.trim().toUpperCase(),
      supplierMobile: supplierMobile.trim(),
      currentStock: 0,
      unit: unit.trim() || 'Pcs',
      unitCost: Number(defaultCost) || 0,
      sellingPrice: Number(defaultPrice) || 0,
    };

    await db.materials.put(newItem);
    await syncEngine.logMutation('materials', 'INSERT', newItem.id, newItem);

    logActivity({
      action: 'CREATE_MATERIAL',
      module: 'Material',
      description: `নতুন ডেন্টাল ম্যাটেরিয়াল যোগ করা হয়েছে: ${newItem.name} (কোড: ${newItem.code}, ক্যাটাগরি: ${newItem.category})`,
      metadata: { id: newItem.id, name: newItem.name, code: newItem.code, category: newItem.category },
      user: user || undefined,
    });

    setItemCode('');
    setItemName('');
    setManufacturer('');
    setSupplier('');
    setSupplierMobile('');
    setDefaultCost(0);
    setDefaultPrice(0);
    await loadData();
    alert(`নতুন আইটেম "${newItem.name}" সফলভাবে যোগ করা হয়েছে!`);
  };

  // Stock In (Purchase / Refill)
  const handleStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockInId || stockInQty <= 0) {
      alert('অনুগ্রহ করে আইটেম ও সঠিক পরিমাণ নির্বাচন করুন।');
      return;
    }

    const material = materials.find((m) => m.id === selectedStockInId);
    if (!material) return;

    const entry: StockEntry = {
      id: `stock_${Date.now()}`,
      materialId: material.id,
      materialName: material.name,
      date: stockInDate || new Date().toISOString().split('T')[0],
      quantity: Number(stockInQty),
      unitCost: Number(stockInUnitCost) || 0,
      totalCost: Number(stockInQty) * (Number(stockInUnitCost) || 0),
      supplier: material.supplier || '',
      expiryDate: stockInExpiryDate,
      invoiceNo: stockInInvoiceNo,
      createdAt: new Date().toISOString(),
    };

    await db.stockEntries.put(entry);
    await syncEngine.logMutation('stockEntries', 'INSERT', entry.id, entry);

    // Update current stock
    const newStock = (material.currentStock || 0) + Number(stockInQty);
    const updatedMaterial: MaterialItem = {
      ...material,
      currentStock: newStock,
      unitCost: Number(stockInUnitCost) > 0 ? Number(stockInUnitCost) : material.unitCost,
    };
    await db.materials.put(updatedMaterial);
    await syncEngine.logMutation('materials', 'UPDATE', material.id, updatedMaterial);

    logActivity({
      action: 'STOCK_ENTRY',
      module: 'Material',
      description: `${material.name} - ${stockInQty} ${material.unit} স্টক ইন করা হয়েছে (মোট মূল্য: ৳${entry.totalCost.toLocaleString()})`,
      metadata: { materialId: material.id, materialName: material.name, quantity: stockInQty, totalCost: entry.totalCost },
      user: user || undefined,
    });

    setSelectedStockInId('');
    setStockInQty(10);
    setStockInUnitCost(0);
    setStockInExpiryDate('');
    setStockInInvoiceNo('');
    await loadData();
    alert(`সফলভাবে ${stockInQty} ${material.unit} স্টক ইনপুট হয়েছে! বর্তমান মোট স্টক: ${newStock} ${material.unit}`);
  };

  // Stock Out / Sale / Clinical Usage Execution
  const handleStockOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockOutId || stockOutQty <= 0) {
      alert('অনুগ্রহ করে আইটেম ও সঠিক পরিমাণ নির্বাচন করুন।');
      return;
    }

    const material = materials.find((m) => m.id === selectedStockOutId);
    if (!material) {
      alert('আইটেমটি খুঁজে পাওয়া যায়নি!');
      return;
    }

    const currentStock = material.currentStock || 0;
    if (stockOutQty > currentStock) {
      const confirmExceed = confirm(
        `সতর্কবার্তা: বর্তমান স্টক (${currentStock} ${material.unit}) এর চেয়ে খরচের পরিমাণ (${stockOutQty} ${material.unit}) বেশি!\n\nআপনি কি স্টক মাইনাস করে এই এন্ট্রি সংরক্ষণ করতে চান?`
      );
      if (!confirmExceed) return;
    }

    const unitPr = Number(stockOutUnitPrice) || 0;
    const totalPr = stockOutType === 'sale' ? Number(stockOutQty) * unitPr : 0;

    const usageRecord: MaterialUsage = {
      id: `usage_${Date.now()}`,
      materialId: material.id,
      materialName: material.name,
      date: stockOutDate || new Date().toISOString().split('T')[0],
      quantity: Number(stockOutQty),
      type: stockOutType,
      unitPrice: unitPr,
      totalPrice: totalPr,
      patientRegNo: stockOutPatientRegNo ? Number(stockOutPatientRegNo) : undefined,
      patientName: stockOutPatientName.trim() || undefined,
      procedure: stockOutProcedure.trim() || undefined,
      note: stockOutNote.trim() || undefined,
      createdBy: user?.name || 'Staff',
      createdAt: new Date().toISOString(),
    };

    await db.materialUsages.put(usageRecord);
    await syncEngine.logMutation('materialUsages', 'INSERT', usageRecord.id, usageRecord);

    // DEDUCT FROM INVENTORY STOCK
    const newStock = Math.max(0, currentStock - Number(stockOutQty));
    const updatedMaterial: MaterialItem = {
      ...material,
      currentStock: newStock,
    };
    await db.materials.put(updatedMaterial);
    await syncEngine.logMutation('materials', 'UPDATE', material.id, updatedMaterial);

    logActivity({
      action: 'MATERIAL_USAGE',
      module: 'Material',
      description: `${material.name} - ${stockOutQty} ${material.unit} ব্যবহার/খরচ করা হয়েছে (${stockOutType === 'sale' ? 'বিক্রয়' : 'ক্লিনিক্যাল ট্রিটমেন্ট'})`,
      metadata: {
        materialId: material.id,
        materialName: material.name,
        quantity: stockOutQty,
        patientRegNo: stockOutPatientRegNo,
        patientName: stockOutPatientName,
      },
      user: user || undefined,
    });

    setSelectedStockOutId('');
    setStockOutQty(1);
    setStockOutUnitPrice(0);
    setStockOutPatientRegNo('');
    setStockOutPatientName('');
    setStockOutProcedure('');
    setStockOutNote('');
    await loadData();

    const typeLabel =
      stockOutType === 'sale'
        ? 'বিক্রয় (Sale)'
        : stockOutType === 'damage'
        ? 'ড্যামেজ (Damage)'
        : 'চিকিৎসায় খরচ (Clinical Usage)';

    alert(`সফলভাবে ${stockOutQty} ${material.unit} [${typeLabel}] এন্ট্রি সম্পন্ন হয়েছে!\n\nস্টক থেকে কমে বর্তমান ব্যালেন্স: ${newStock} ${material.unit}`);
  };

  // Quick Action Modal Submit
  const handleQuickModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickActionModal.material || quickQty <= 0) return;

    const material = quickActionModal.material;

    if (quickActionModal.type === 'stock_out') {
      const currentStock = material.currentStock || 0;
      if (quickQty > currentStock) {
        const ok = confirm(`বর্তমান স্টক (${currentStock}) এর চেয়ে বেশি দিতে চাচ্ছেন। নিশ্চিত?`);
        if (!ok) return;
      }

      const unitPr = Number(quickUnitPrice) || 0;
      const totalPr = quickOutType === 'sale' ? Number(quickQty) * unitPr : 0;

      const usageRecord: MaterialUsage = {
        id: `usage_${Date.now()}`,
        materialId: material.id,
        materialName: material.name,
        date: new Date().toISOString().split('T')[0],
        quantity: Number(quickQty),
        type: quickOutType,
        unitPrice: unitPr,
        totalPrice: totalPr,
        patientRegNo: quickPatientRegNo ? Number(quickPatientRegNo) : undefined,
        patientName: quickPatientName.trim() || undefined,
        procedure: quickProcedure.trim() || undefined,
        note: quickNote.trim() || undefined,
        createdBy: user?.name || 'Staff',
        createdAt: new Date().toISOString(),
      };

      await db.materialUsages.put(usageRecord);
      await syncEngine.logMutation('materialUsages', 'INSERT', usageRecord.id, usageRecord);

      const newStock = Math.max(0, currentStock - Number(quickQty));
      await db.materials.update(material.id, { currentStock: newStock });
      await syncEngine.logMutation('materials', 'UPDATE', material.id, { ...material, currentStock: newStock });

      alert(`সফলভাবে ${quickQty} ${material.unit} খরচ/বিক্রয় হয়েছে! অবশিষ্ট স্টক: ${newStock} ${material.unit}`);
    } else {
      // Stock In
      const entry: StockEntry = {
        id: `stock_${Date.now()}`,
        materialId: material.id,
        materialName: material.name,
        date: new Date().toISOString().split('T')[0],
        quantity: Number(quickQty),
        unitCost: Number(quickUnitPrice) || 0,
        totalCost: Number(quickQty) * (Number(quickUnitPrice) || 0),
        supplier: material.supplier || '',
        expiryDate: '',
        invoiceNo: '',
        createdAt: new Date().toISOString(),
      };

      await db.stockEntries.put(entry);
      await syncEngine.logMutation('stockEntries', 'INSERT', entry.id, entry);

      const newStock = (material.currentStock || 0) + Number(quickQty);
      await db.materials.update(material.id, { currentStock: newStock });
      await syncEngine.logMutation('materials', 'UPDATE', material.id, { ...material, currentStock: newStock });

      alert(`সফলভাবে ${quickQty} ${material.unit} যোগ করা হয়েছে! নতুন মোট স্টক: ${newStock} ${material.unit}`);
    }

    setQuickActionModal({ isOpen: false, type: 'stock_out', material: null });
    await loadData();
  };

  // Open Quick Modal
  const openQuickModal = (mat: MaterialItem, type: 'stock_in' | 'stock_out') => {
    setQuickActionModal({ isOpen: true, type, material: mat });
    setQuickQty(1);
    setQuickOutType('usage');
    setQuickUnitPrice(type === 'stock_out' ? mat.sellingPrice || mat.unitCost || 0 : mat.unitCost || 0);
    setQuickPatientName('');
    setQuickPatientRegNo('');
    setQuickProcedure('');
    setQuickNote('');
  };

  // Open Edit Material Modal
  const openEditModal = (mat: MaterialItem) => {
    setEditingItem({
      id: mat.id,
      code: mat.code || '',
      name: mat.name,
      manufacturer: mat.manufacturer || '',
      category: mat.category || 'Dental Material',
      lowStockLimit: mat.lowStockLimit ?? 5,
      supplier: mat.supplier || '',
      supplierMobile: mat.supplierMobile || '',
      unit: mat.unit || 'Pcs',
      unitCost: mat.unitCost || 0,
      sellingPrice: mat.sellingPrice || 0,
      currentStock: mat.currentStock || 0,
    });
    setIsEditModalOpen(true);
  };

  // Save Edited Material Item
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name.trim()) return;

    const updatedMat: MaterialItem = {
      id: editingItem.id,
      code: editingItem.code.trim() || Math.floor(10 + Math.random() * 90).toString(),
      name: editingItem.name.trim().toUpperCase(),
      manufacturer: editingItem.manufacturer.trim().toUpperCase(),
      category: editingItem.category.trim(),
      lowStockLimit: Number(editingItem.lowStockLimit) || 5,
      supplier: editingItem.supplier.trim().toUpperCase(),
      supplierMobile: editingItem.supplierMobile.trim(),
      unit: editingItem.unit.trim() || 'Pcs',
      unitCost: Number(editingItem.unitCost) || 0,
      sellingPrice: Number(editingItem.sellingPrice) || 0,
      currentStock: editingItem.currentStock,
    };

    await db.materials.put(updatedMat);
    await syncEngine.logMutation('materials', 'UPDATE', updatedMat.id, updatedMat);
    await loadData();
    setIsEditModalOpen(false);
    setEditingItem(null);
    alert(`ম্যাটেরিয়াল "${updatedMat.name}" সফলভাবে আপডেট করা হয়েছে!`);
  };

  // Delete Material Item
  const handleDeleteItem = async (id: string) => {
    if (isReceptionistOrCashier) {
      alert('ম্যাটেরিয়াল মুছে ফেলার অনুমতি আপনার রোলে সংরক্ষিত নেই।');
      return;
    }
    if (confirm('এই ম্যাটেরিয়াল আইটেমটি কি স্থায়ীভাবে মুছে ফেলতে চান?')) {
      await db.materials.delete(id);
      await syncEngine.logMutation('materials', 'DELETE', id, { id });
      await loadData();
    }
  };

  // Delete Usage Record with option to restore stock
  const handleDeleteUsage = async (usage: MaterialUsage) => {
    if (isReceptionistOrCashier) {
      alert('রেকর্ড মুছে ফেলার অনুমতি আপনার রোলে সংরক্ষিত নেই।');
      return;
    }
    const restore = confirm(
      `এই খরচ/বিক্রয় রেকর্ডটি মুছে ফেলতে চান?\n\n'OK' চাপলে ${usage.quantity} টি আইটেম পুনরায় ইনভেন্টরি স্টকে যোগ (Restore) হবে।`
    );
    if (!restore) return;

    await db.materialUsages.delete(usage.id);
    await syncEngine.logMutation('materialUsages', 'DELETE', usage.id, { id: usage.id });

    // Restore stock
    const mat = materials.find((m) => m.id === usage.materialId);
    if (mat) {
      const restoredStock = (mat.currentStock || 0) + usage.quantity;
      await db.materials.update(mat.id, { currentStock: restoredStock });
      await syncEngine.logMutation('materials', 'UPDATE', mat.id, { ...mat, currentStock: restoredStock });
    }

    await loadData();
    alert('রেকর্ড মুছে ফেলা হয়েছে এবং স্টক পুনর্স্থাপন করা হয়েছে!');
  };

  // Filtered Materials
  const filteredMaterials = useMemo(() => {
    return materials.filter((mat) => {
      if (filterCategory !== 'All' && mat.category !== filterCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = mat.name.toLowerCase().includes(q);
        const matchCode = (mat.code || '').toLowerCase().includes(q);
        const matchMan = (mat.manufacturer || '').toLowerCase().includes(q);
        const matchSup = (mat.supplier || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchMan && !matchSup) return false;
      }
      return true;
    });
  }, [materials, searchQuery, filterCategory]);

  // Filtered Usages Ledger
  const filteredUsages = useMemo(() => {
    return materialUsages.filter((u) => {
      if (ledgerTypeFilter !== 'All' && u.type !== ledgerTypeFilter) {
        return false;
      }
      if (ledgerSearch.trim()) {
        const q = ledgerSearch.toLowerCase();
        const matchMat = (u.materialName || '').toLowerCase().includes(q);
        const matchPat = (u.patientName || '').toLowerCase().includes(q);
        const matchReg = u.patientRegNo?.toString().includes(q);
        const matchProc = (u.procedure || '').toLowerCase().includes(q);
        const matchNote = (u.note || '').toLowerCase().includes(q);
        if (!matchMat && !matchPat && !matchReg && !matchProc && !matchNote) return false;
      }
      return true;
    });
  }, [materialUsages, ledgerTypeFilter, ledgerSearch]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalItems = materials.length;
    const totalStockUnits = materials.reduce((acc, m) => acc + (m.currentStock || 0), 0);
    const lowStockCount = materials.filter((m) => (m.currentStock || 0) <= m.lowStockLimit).length;
    const totalSalesValue = materialUsages
      .filter((u) => u.type === 'sale')
      .reduce((acc, u) => acc + (u.totalPrice || 0), 0);
    const totalUsageUnits = materialUsages
      .filter((u) => u.type === 'usage' || !u.type)
      .reduce((acc, u) => acc + u.quantity, 0);
    const totalSoldUnits = materialUsages
      .filter((u) => u.type === 'sale')
      .reduce((acc, u) => acc + u.quantity, 0);

    return {
      totalItems,
      totalStockUnits,
      lowStockCount,
      totalSalesValue,
      totalUsageUnits,
      totalSoldUnits,
    };
  }, [materials, materialUsages]);

  return (
    <div className="p-3 sm:p-5 max-w-[1550px] mx-auto text-slate-800 space-y-4 font-sans text-xs">
      {/* 1. TOP HEADER BANNER */}
      <div className="bg-white rounded-xl border border-slate-300 shadow-xs p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-md">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Dental Material & Stock Management
              </h1>
              <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded text-[11px]">
                ইনভেন্টরি, খরচ ও বিক্রয়
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              ম্যাটেরিয়াল স্টক এন্ট্রি, রোগীর চিকিৎসায় খরচ বা সরাসরি বিক্রয় করলে স্বয়ংক্রিয় স্টক হ্রাস ও খতিয়ান
            </p>
          </div>
        </div>

        {/* TOP TABS */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveSubTab('items')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
              activeSubTab === 'items'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Item List ({materials.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('stock_out')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
              activeSubTab === 'stock_out'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Minus className="w-3.5 h-3.5" />
            <span>Stock Out / খরচ বা বিক্রি</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('stock_in')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
              activeSubTab === 'stock_in'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Stock In (ক্রয়)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('usage_ledger')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
              activeSubTab === 'usage_ledger'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Sales & Usage Ledger ({materialUsages.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('low_stock')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
              activeSubTab === 'low_stock'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock ({metrics.lowStockCount})</span>
          </button>
        </div>
      </div>

      {/* 2. STATS KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-semibold uppercase">
            <span>Total Items</span>
            <Layers className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-black text-slate-900">{metrics.totalItems}</span>
          </div>
          <span className="text-[9px] text-slate-400 block mt-0.5">মোট রেজিস্টার্ড পণ্য</span>
        </div>

        <div className="bg-sky-50/80 p-3 rounded-xl border border-sky-200 shadow-xs">
          <div className="flex items-center justify-between text-sky-700 text-[10px] font-semibold uppercase">
            <span>Current Stock</span>
            <Package className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-black text-sky-950">{metrics.totalStockUnits}</span>
          </div>
          <span className="text-[9px] text-sky-600 block mt-0.5">মোট বর্তমান ইউনিট মজুদ</span>
        </div>

        <div className="bg-indigo-50/80 p-3 rounded-xl border border-indigo-200 shadow-xs">
          <div className="flex items-center justify-between text-indigo-700 text-[10px] font-semibold uppercase">
            <span>Clinical Usage</span>
            <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-black text-indigo-950">{metrics.totalUsageUnits}</span>
          </div>
          <span className="text-[9px] text-indigo-600 block mt-0.5">চিকিৎসায় ব্যবহৃত ইউনিট</span>
        </div>

        <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 text-[10px] font-semibold uppercase">
            <span>Direct Sales</span>
            <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-black text-emerald-950">{metrics.totalSoldUnits}</span>
          </div>
          <span className="text-[9px] text-emerald-600 block mt-0.5">মোট বিক্রিত ইউনিট</span>
        </div>

        <div className="bg-purple-50/80 p-3 rounded-xl border border-purple-200 shadow-xs">
          <div className="flex items-center justify-between text-purple-700 text-[10px] font-semibold uppercase">
            <span>Total Sales (৳)</span>
            <DollarSign className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-black text-purple-950">৳ {metrics.totalSalesValue.toLocaleString()}</span>
          </div>
          <span className="text-[9px] text-purple-600 block mt-0.5">পণ্য বিক্রয় থেকে মোট আয়</span>
        </div>

        <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 text-[10px] font-semibold uppercase">
            <span>Low Stock Alert</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="mt-1">
            <span className="text-xl font-black text-amber-950">{metrics.lowStockCount}</span>
          </div>
          <span className="text-[9px] text-amber-600 block mt-0.5">রি-অর্ডার করতে হবে</span>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: ITEM LIST & QUICK ACTIONS
          ========================================================================= */}
      {activeSubTab === 'items' && (
        <div className="space-y-4">
          {/* ADD ITEM ACCORDION / FORM */}
          <form onSubmit={handleAddItem} className="bg-white border border-sky-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-sky-100">
              <div className="flex items-center space-x-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-slate-900 text-xs">
                  ITEM ADD (নতুন ডেন্টাল ম্যাটেরিয়াল বা পণ্য যোগ করুন)
                </span>
              </div>
              <span className="text-[11px] text-slate-400">স্টক ইনপুট বা বিক্রির আগে আইটেম নিবন্ধন করুন</span>
            </div>

            <div className="grid grid-cols-12 gap-2.5">
              <div className="col-span-6 sm:col-span-1">
                <label className="block text-slate-600 font-semibold mb-1">Code</label>
                <input
                  type="text"
                  value={itemCode}
                  onChange={(e) => setItemCode(e.target.value)}
                  placeholder="30"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white font-mono font-bold"
                />
              </div>

              <div className="col-span-12 sm:col-span-3">
                <label className="block text-slate-600 font-semibold mb-1">
                  Item Name * <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. COMPOSITE RESIN / SENSODYNE"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white font-semibold"
                />
              </div>

              <div className="col-span-6 sm:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">Manufacturer / Brand</label>
                <input
                  type="text"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  placeholder="e.g. 3M ESPE / MEDPHYSIO"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="col-span-6 sm:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">Category (ক্যাটাগরি)</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white font-medium"
                >
                  <option value="Dental Material">Dental Material (চিকিৎসা সামগ্রী)</option>
                  <option value="Oral Care Product">Oral Care (টুথপেস্ট/ব্রাশ/মাউথওয়াশ)</option>
                  <option value="Medicine">Medicine / Drug (ওষুধ)</option>
                  <option value="Disposable">Disposable (গ্লাভস/মাস্ক/কটন)</option>
                  <option value="Orthodontic Kit">Orthodontic Kit (অর্থো কিট)</option>
                  <option value="Other">Other Equipment (অন্যান্য)</option>
                </select>
              </div>

              <div className="col-span-4 sm:col-span-1">
                <label className="block text-slate-600 font-semibold mb-1">Unit</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="Pcs/Set"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white text-center font-bold"
                />
              </div>

              <div className="col-span-4 sm:col-span-1">
                <label className="block text-slate-600 font-semibold mb-1">Low Limit</label>
                <input
                  type="number"
                  value={lowStockLimit}
                  onChange={(e) => setLowStockLimit(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white text-center font-bold text-amber-700"
                />
              </div>

              <div className="col-span-4 sm:col-span-1">
                <label className="block text-slate-600 font-semibold mb-1">Cost (TK)</label>
                <input
                  type="number"
                  value={defaultCost || ''}
                  onChange={(e) => setDefaultCost(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white font-mono text-right"
                />
              </div>

              <div className="col-span-6 sm:col-span-1">
                <label className="block text-slate-600 font-semibold mb-1">Sale (TK)</label>
                <input
                  type="number"
                  value={defaultPrice || ''}
                  onChange={(e) => setDefaultPrice(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white font-mono text-right font-bold text-emerald-700"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label className="block text-slate-600 font-semibold mb-1">Supplier Name</label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="e.g. DENTAL ZONE / IBRAHIM"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label className="block text-slate-600 font-semibold mb-1">Supplier Mobile</label>
                <input
                  type="text"
                  value={supplierMobile}
                  onChange={(e) => setSupplierMobile(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white font-mono"
                />
              </div>

              <div className="col-span-12 sm:col-span-6 flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-bold shadow-sm transition flex items-center justify-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Save Material Item (আইটেম সংরক্ষণ করুন)</span>
                </button>
              </div>
            </div>
          </form>

          {/* ITEM LIST TABLE & SEARCH */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2.5">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ম্যাটেরিয়ালের নাম, কোড, ব্রান্ড বা সাপ্লায়ার দিয়ে খুঁজুন..."
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:border-blue-600 font-medium"
                />
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold text-slate-700 focus:outline-none focus:border-blue-600 text-xs shadow-2xs"
                >
                  <option value="All">All Categories (সকল ক্যাটাগরি)</option>
                  <option value="Dental Material">Dental Material</option>
                  <option value="Oral Care Product">Oral Care</option>
                  <option value="Medicine">Medicine / Drug</option>
                  <option value="Disposable">Disposable</option>
                  <option value="Orthodontic Kit">Orthodontic Kit</option>
                  <option value="Other">Other Equipment</option>
                </select>

                <span className="text-slate-500 font-semibold bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg">
                  আইটেম: {filteredMaterials.length} টি
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 text-[11px] font-bold border-b border-slate-200 uppercase tracking-wider">
                  <tr>
                    <th className="p-2.5 w-10 text-center">SI</th>
                    <th className="p-2.5 w-16 text-center">Code</th>
                    <th className="p-2.5">Material Name & Category</th>
                    <th className="p-2.5">Manufacturer</th>
                    <th className="p-2.5 w-24 text-center">Current Stock</th>
                    <th className="p-2.5 w-20 text-center">Low Limit</th>
                    <th className="p-2.5 w-28 text-right">Cost / Sale (৳)</th>
                    <th className="p-2.5">Supplier & Mobile</th>
                    <th className="p-2.5 w-52 text-center">Action & Quick Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMaterials.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                        কোনো ম্যাটেরিয়াল পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredMaterials.map((mat, i) => {
                      const isLow = (mat.currentStock || 0) <= mat.lowStockLimit;
                      return (
                        <tr key={mat.id} className="hover:bg-blue-50/40 transition-colors">
                          <td className="p-2.5 text-center text-slate-400 font-bold">{i + 1}</td>
                          <td className="p-2.5 text-center font-mono font-bold text-blue-900 bg-slate-50/50">
                            {mat.code}
                          </td>
                          <td className="p-2.5">
                            <div className="font-bold text-slate-900">{mat.name}</div>
                            {mat.category && (
                              <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-0.5">
                                {mat.category}
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-slate-600 font-medium">{mat.manufacturer || '-'}</td>
                          <td className="p-2.5 text-center">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full font-bold text-xs shadow-2xs ${
                                isLow
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {mat.currentStock || 0} {mat.unit}
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-bold text-amber-700 bg-amber-50/30">
                            {mat.lowStockLimit} {mat.unit}
                          </td>
                          <td className="p-2.5 text-right font-mono">
                            <div className="text-slate-500 text-[11px]">ক্রয়: ৳{mat.unitCost || 0}</div>
                            <div className="text-emerald-700 font-bold text-xs">বিক্রি: ৳{mat.sellingPrice || 0}</div>
                          </td>
                          <td className="p-2.5">
                            <div className="font-semibold text-slate-800">{mat.supplier || '-'}</div>
                            {mat.supplierMobile && (
                              <div className="text-[11px] font-mono text-slate-500">{mat.supplierMobile}</div>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              {/* EDIT ITEM (Allowed for all including Receptionist/Cashier) */}
                              <button
                                type="button"
                                onClick={() => openEditModal(mat)}
                                title="ম্যাটেরিয়াল তথ্য পরিবর্তন করুন (Edit)"
                                className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded font-bold text-[11px] flex items-center space-x-1 shadow-2xs transition"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>এডিট</span>
                              </button>

                              {/* QUICK STOCK OUT */}
                              <button
                                type="button"
                                onClick={() => openQuickModal(mat, 'stock_out')}
                                title="ম্যাটেরিয়াল খরচ বা বিক্রি এন্ট্রি (Stock Out)"
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-bold text-[11px] flex items-center space-x-1 shadow-2xs transition"
                              >
                                <Minus className="w-3 h-3" />
                                <span>খরচ/বিক্রি</span>
                              </button>

                              {/* QUICK STOCK IN */}
                              <button
                                type="button"
                                onClick={() => openQuickModal(mat, 'stock_in')}
                                title="নতুন স্টক ইনপুট (Stock In)"
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-bold text-[11px] flex items-center space-x-1 shadow-2xs transition"
                              >
                                <Plus className="w-3 h-3" />
                                <span>+স্টক</span>
                              </button>

                              {/* DELETE (Hidden for Receptionist / Cashier) */}
                              {!isReceptionistOrCashier && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(mat.id)}
                                  title="আইটেম মুছে ফেলুন (Delete)"
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: STOCK OUT / SALE & CLINICAL USAGE (DEDUCT FROM INVENTORY)
          ========================================================================= */}
      {activeSubTab === 'stock_out' && (
        <div className="grid grid-cols-12 gap-4">
          {/* Form Column */}
          <div className="col-span-12 lg:col-span-7 space-y-4">
            <form onSubmit={handleStockOut} className="bg-white border border-rose-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-rose-100">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
                    <Minus className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-slate-900">
                      Material Consumption & Sale Entry (ম্যাটেরিয়াল খরচ বা বিক্রয়)
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      এখানে এন্ট্রি করলে ইনভেন্টরি স্টক থেকে স্বয়ংক্রিয়ভাবে পরিমাণ কমে যাবে
                    </p>
                  </div>
                </div>
              </div>

              {/* 1. TYPE SELECTOR CHIPS */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  Stock Out Type (খরচ বা বিক্রির ধরন নির্বাচন করুন) <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'usage', label: 'Clinical Usage', labelBn: 'চিকিৎসায় খরচ (রোগীর ট্রিটমেন্ট)', icon: <Stethoscope className="w-4 h-4" />, color: 'blue' },
                    { id: 'sale', label: 'Direct Sale', labelBn: 'রোগীর নিকট বিক্রয় (Sales)', icon: <ShoppingCart className="w-4 h-4" />, color: 'emerald' },
                    { id: 'damage', label: 'Damage / Expired', labelBn: 'নষ্ট বা মেয়াদোত্তীর্ণ', icon: <AlertTriangle className="w-4 h-4" />, color: 'amber' },
                  ].map((t) => {
                    const isSelected = stockOutType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setStockOutType(t.id as any)}
                        className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`p-1.5 rounded-lg ${isSelected ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                            {t.icon}
                          </span>
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-rose-600 bg-rose-600' : 'border-slate-300'}`}>
                            {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                          </span>
                        </div>
                        <div>
                          <div className={`font-bold text-xs ${isSelected ? 'text-rose-950' : 'text-slate-800'}`}>
                            {t.label}
                          </div>
                          <div className="text-[10px] text-slate-500">{t.labelBn}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. ITEM SELECTOR */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Select Material Item (পণ্য বা ম্যাটেরিয়াল নির্বাচন করুন) <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedStockOutId}
                  onChange={(e) => handleStockOutMaterialChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white text-xs font-bold text-blue-950 focus:border-rose-500 focus:outline-none"
                >
                  <option value="">-- Choose Item from Inventory --</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.code}] {m.name} — (বর্তমান মজুদ: {m.currentStock || 0} {m.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. QUANTITY & PRICING */}
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 sm:col-span-4">
                  <label className="block text-slate-700 font-bold mb-1">
                    Quantity (পরিমাণ) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={stockOutQty}
                    onChange={(e) => setStockOutQty(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-rose-700 focus:border-rose-500 focus:outline-none"
                  />
                </div>

                {stockOutType === 'sale' && (
                  <>
                    <div className="col-span-6 sm:col-span-4">
                      <label className="block text-slate-700 font-bold mb-1">
                        Unit Price (প্রতি ইউনিট বিক্রয়মূল্য ৳)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={stockOutUnitPrice}
                        onChange={(e) => setStockOutUnitPrice(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-right text-emerald-700 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-4">
                      <label className="block text-slate-700 font-bold mb-1">
                        Total Price (মোট বিক্রয় ৳)
                      </label>
                      <div className="w-full px-3 py-2 border border-emerald-300 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-mono font-bold text-right flex items-center justify-end">
                        ৳ {(stockOutQty * stockOutUnitPrice).toLocaleString()}
                      </div>
                    </div>
                  </>
                )}

                <div className="col-span-12 sm:col-span-4">
                  <label className="block text-slate-700 font-bold mb-1">
                    Date (তারিখ) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={stockOutDate}
                    onChange={(e) => setStockOutDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 4. PATIENT & PROCEDURE DETAILS */}
              <div className="grid grid-cols-12 gap-3 pt-2 border-t border-slate-100">
                <div className="col-span-12 sm:col-span-4">
                  <label className="block text-slate-600 font-semibold mb-1">Patient Reg No (রেজি নং)</label>
                  <input
                    type="number"
                    value={stockOutPatientRegNo}
                    onChange={(e) => setStockOutPatientRegNo(e.target.value)}
                    placeholder="e.g. 4201"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>

                <div className="col-span-12 sm:col-span-4">
                  <label className="block text-slate-600 font-semibold mb-1">Patient Name (রোগীর নাম)</label>
                  <input
                    type="text"
                    value={stockOutPatientName}
                    onChange={(e) => setStockOutPatientName(e.target.value)}
                    placeholder="e.g. রোগীর নাম"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div className="col-span-12 sm:col-span-4">
                  <label className="block text-slate-600 font-semibold mb-1">Procedure / Purpose</label>
                  <input
                    type="text"
                    value={stockOutProcedure}
                    onChange={(e) => setStockOutProcedure(e.target.value)}
                    placeholder="e.g. RCT, Scaling, Filling"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div className="col-span-12">
                  <label className="block text-slate-600 font-semibold mb-1">Note / Remarks (অতিরিক্ত নোট)</label>
                  <input
                    type="text"
                    value={stockOutNote}
                    onChange={(e) => setStockOutNote(e.target.value)}
                    placeholder="খরচ বা বিক্রির বিশেষ কোনো মন্তব্য..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-lg font-bold text-xs shadow-md transition flex items-center justify-center space-x-1.5"
              >
                <Minus className="w-4 h-4" />
                <span>Save Stock Out (স্টক থেকে বাদ দিন ও সংরক্ষণ করুন)</span>
              </button>
            </form>
          </div>

          {/* Real-Time Preview & Quick Help Box */}
          <div className="col-span-12 lg:col-span-5 space-y-4">
            <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white p-5 rounded-xl shadow-sm space-y-3.5">
              <h3 className="font-bold text-sm text-sky-300 flex items-center space-x-1.5">
                <Activity className="w-4 h-4" />
                <span>Live Stock Impact Preview</span>
              </h3>

              {(() => {
                const selMat = materials.find((m) => m.id === selectedStockOutId);
                if (!selMat) {
                  return (
                    <div className="p-4 bg-white/10 rounded-lg text-center text-sky-200 text-xs">
                      ম্যাটেরিয়াল নির্বাচন করলে তার বর্তমান মজুদ ও খরচের পরবর্তী স্টক এখানে প্রদর্শিত হবে।
                    </div>
                  );
                }

                const curStock = selMat.currentStock || 0;
                const afterStock = curStock - stockOutQty;
                const isInsufficient = afterStock < 0;

                return (
                  <div className="space-y-3 bg-white/10 p-3.5 rounded-xl border border-white/15">
                    <div className="flex justify-between items-center border-b border-white/15 pb-2">
                      <span className="text-sky-200">নির্বাচিত আইটেম:</span>
                      <span className="font-bold text-white text-sm">{selMat.name}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300">বর্তমান স্টক (Current):</span>
                      <span className="font-bold text-sky-300 text-sm">
                        {curStock} {selMat.unit}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300">খরচ / বিক্রির পরিমাণ:</span>
                      <span className="font-bold text-rose-300 text-sm">
                        - {stockOutQty} {selMat.unit}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-white/15 text-xs">
                      <span className="text-slate-200 font-bold">খরচান্তে অবশিষ্ট স্টক:</span>
                      <span
                        className={`font-black text-base px-2.5 py-0.5 rounded ${
                          isInsufficient ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                        }`}
                      >
                        {afterStock} {selMat.unit}
                      </span>
                    </div>

                    {isInsufficient && (
                      <div className="p-2 bg-red-500/30 border border-red-400 rounded text-[11px] text-red-200 flex items-center space-x-1.5">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-300" />
                        <span>সতর্কতা: বর্তমান স্টকের চেয়ে খরচের পরিমাণ বেশি!</span>
                      </div>
                    )}

                    {stockOutType === 'sale' && (
                      <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-lg flex justify-between items-center text-emerald-200">
                        <span className="font-semibold">মোট বিক্রয় মূল্য:</span>
                        <span className="font-bold text-white text-sm">
                          ৳ {(stockOutQty * stockOutUnitPrice).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="text-[11px] text-sky-200/80 leading-relaxed pt-1">
                💡 <span className="font-semibold text-sky-100">টিপস:</span> যখনই কোনো রোগীকে মাউথওয়াশ বা টুথপেস্ট
                বিক্রি করবেন তখন <span className="text-yellow-300">"Direct Sale"</span> সিলেক্ট করুন, এবং চিকিৎসার সময়
                ব্যবহৃত সামগ্রীর ক্ষেত্রে <span className="text-yellow-300">"Clinical Usage"</span> সিলেক্ট করুন।
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: NEW STOCK IN (PURCHASE ENTRY)
          ========================================================================= */}
      {activeSubTab === 'stock_in' && (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-7 space-y-4">
            <form onSubmit={handleStockIn} className="bg-white border border-emerald-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 pb-3 border-b border-emerald-100">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-slate-900">
                    New Stock Purchase Entry (নতুন স্টক ক্রয় বা ইনপুট)
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    সরবরাহকারীর কাছ থেকে মালামাল আসলে এখানে এন্ট্রি করুন, স্টক স্বয়ংক্রিয়ভাবে বৃদ্ধি পাবে
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Select Material Item * <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedStockInId}
                  onChange={(e) => {
                    setSelectedStockInId(e.target.value);
                    const mat = materials.find((m) => m.id === e.target.value);
                    if (mat && mat.unitCost) setStockInUnitCost(mat.unitCost);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white text-xs font-bold text-blue-950 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">-- Choose Material Item --</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.code}] {m.name} — (বর্তমান মজুদ: {m.currentStock || 0} {m.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 sm:col-span-6">
                  <label className="block text-slate-700 font-bold mb-1">
                    Quantity to Add (নতুন ক্রয়ের পরিমাণ) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={stockInQty}
                    onChange={(e) => setStockInQty(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-emerald-700 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="col-span-12 sm:col-span-6">
                  <label className="block text-slate-700 font-bold mb-1">
                    Unit Cost (প্রতি ইউনিট ক্রয়মূল্য ৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stockInUnitCost}
                    onChange={(e) => setStockInUnitCost(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-right"
                  />
                </div>

                <div className="col-span-12 sm:col-span-4">
                  <label className="block text-slate-600 font-semibold mb-1">Purchase Date (ক্রয় তারিখ)</label>
                  <input
                    type="date"
                    required
                    value={stockInDate}
                    onChange={(e) => setStockInDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div className="col-span-12 sm:col-span-4">
                  <label className="block text-slate-600 font-semibold mb-1">Expiry Date (মেয়াদোত্তীর্ণ)</label>
                  <input
                    type="date"
                    value={stockInExpiryDate}
                    onChange={(e) => setStockInExpiryDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div className="col-span-12 sm:col-span-4">
                  <label className="block text-slate-600 font-semibold mb-1">Invoice / Memo No</label>
                  <input
                    type="text"
                    value={stockInInvoiceNo}
                    onChange={(e) => setStockInInvoiceNo(e.target.value)}
                    placeholder="INV-1092"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg font-bold text-xs shadow-md transition flex items-center justify-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Save Stock In (স্টক যোগ করুন)</span>
              </button>
            </form>
          </div>

          {/* Recent Stock In Entries */}
          <div className="col-span-12 lg:col-span-5 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <h3 className="font-bold text-xs text-slate-900 mb-3 flex items-center space-x-1.5 border-b border-slate-100 pb-2">
              <History className="w-4 h-4 text-emerald-600" />
              <span>Recent Stock In Entries (সাম্প্রতিক ক্রয় রেকর্ড)</span>
            </h3>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {stockEntries.length === 0 ? (
                <div className="text-center py-8 text-slate-400">কোনো ক্রয়ের রেকর্ড পাওয়া যায়নি।</div>
              ) : (
                stockEntries.slice(0, 8).map((entry) => (
                  <div key={entry.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{entry.materialName}</div>
                      <div className="text-[11px] text-slate-500">
                        তারিখ: {entry.date} {entry.invoiceNo && `| মেমো: ${entry.invoiceNo}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                        +{entry.quantity}
                      </span>
                      {entry.totalCost > 0 && (
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">৳ {entry.totalCost}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: SALES & USAGE HISTORY LEDGER
          ========================================================================= */}
      {activeSubTab === 'usage_ledger' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-1.5 overflow-x-auto">
              {[
                { id: 'All', label: 'All Records (সকল)' },
                { id: 'usage', label: 'Clinical Usage (চিকিৎসায় খরচ)' },
                { id: 'sale', label: 'Direct Sales (বিক্রয়)' },
                { id: 'damage', label: 'Damage (নষ্ট)' },
              ].map((tab) => {
                const isSel = ledgerTypeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setLedgerTypeFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      isSel ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                placeholder="আইটেম, রোগী, রেজি নং দিয়ে খুঁজুন..."
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 text-[11px] font-bold border-b border-slate-200 uppercase tracking-wider">
                  <tr>
                    <th className="p-2.5 w-10 text-center">SI</th>
                    <th className="p-2.5 w-24">Date</th>
                    <th className="p-2.5 w-28 text-center">Type</th>
                    <th className="p-2.5">Material Item</th>
                    <th className="p-2.5 w-20 text-center">Qty</th>
                    <th className="p-2.5">Patient Details</th>
                    <th className="p-2.5">Procedure / Note</th>
                    <th className="p-2.5 w-24 text-right">Amount (৳)</th>
                    <th className="p-2.5 w-24 text-center">Logged By</th>
                    <th className="p-2.5 w-16 text-center">Option</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredUsages.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400 font-medium">
                        কোনো খরচ বা বিক্রয়ের রেকর্ড পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredUsages.map((usage, idx) => (
                      <tr key={usage.id} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="p-2.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-2.5 font-mono text-slate-600">{usage.date}</td>
                        <td className="p-2.5 text-center">
                          {usage.type === 'sale' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <ShoppingCart className="w-3 h-3 mr-1" />
                              বিক্রয় (Sale)
                            </span>
                          ) : usage.type === 'damage' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              নষ্ট (Damage)
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              <Stethoscope className="w-3 h-3 mr-1" />
                              চিকিৎসায় খরচ
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 font-bold text-slate-900">{usage.materialName}</td>
                        <td className="p-2.5 text-center font-mono font-bold text-rose-700 bg-rose-50/30">
                          -{usage.quantity}
                        </td>
                        <td className="p-2.5">
                          {usage.patientName || usage.patientRegNo ? (
                            <div>
                              <span className="font-semibold text-slate-800">{usage.patientName || 'রোগী'}</span>
                              {usage.patientRegNo && (
                                <span className="text-[10px] font-mono text-slate-500 block">
                                  Reg: {usage.patientRegNo}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-2.5">
                          <div className="text-slate-800">{usage.procedure || '-'}</div>
                          {usage.note && <div className="text-[10px] text-slate-500 italic">{usage.note}</div>}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                          {usage.totalPrice && usage.totalPrice > 0 ? `৳ ${usage.totalPrice.toLocaleString()}` : '-'}
                        </td>
                        <td className="p-2.5 text-center text-slate-500 text-[11px]">{usage.createdBy || 'Staff'}</td>
                        <td className="p-2.5 text-center">
                          {!isReceptionistOrCashier ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteUsage(usage)}
                              title="মুছে ফেলুন ও স্টক রিস্টোর করুন"
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-slate-400 font-mono">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: LOW STOCK ALERTS & REORDER
          ========================================================================= */}
      {activeSubTab === 'low_stock' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <h3 className="font-bold text-amber-900 text-sm mb-1 flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Low Stock & Reorder Warning (পুনরায় ক্রয়ের তাগাদা)</span>
            </h3>
            <p className="text-amber-800 text-xs">
              নিচের পণ্যগুলোর মজুদ নির্ধারিত সর্বনিম্ন সীমার (Low Limit) নিচে নেমে গেছে। জরুরি ভিত্তিতে স্টক রিস্টক করুন।
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {materials
              .filter((m) => (m.currentStock || 0) <= m.lowStockLimit)
              .map((mat) => (
                <div
                  key={mat.id}
                  className="bg-white rounded-xl border border-amber-300 p-4 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-slate-500">[{mat.code}]</span>
                      <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded text-[10px] border border-rose-200">
                        জরুরি রিস্টক
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{mat.name}</h4>
                    <p className="text-slate-500 text-xs">{mat.manufacturer || 'General'}</p>

                    <div className="mt-3 p-2.5 bg-amber-50 rounded-lg border border-amber-200 flex justify-between items-center text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px]">বর্তমান স্টক</span>
                        <span className="font-black text-rose-600 text-sm">
                          {mat.currentStock || 0} {mat.unit}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 block text-[10px]">সর্বনিম্ন লিমিট</span>
                        <span className="font-bold text-amber-800 text-xs">
                          {mat.lowStockLimit} {mat.unit}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 text-slate-600 text-xs">
                      <span className="font-semibold">সাপ্লায়ার:</span> {mat.supplier || 'N/A'}{' '}
                      {mat.supplierMobile && `(${mat.supplierMobile})`}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openQuickModal(mat, 'stock_in')}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition flex items-center justify-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ দ্রুত স্টক যোগ করুন (Refill)</span>
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          QUICK ACTION MODAL (POPUP FOR STOCK IN / STOCK OUT)
          ========================================================================= */}
      {quickActionModal.isOpen && quickActionModal.material && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div
              className={`p-4 text-white flex items-center justify-between ${
                quickActionModal.type === 'stock_out'
                  ? 'bg-gradient-to-r from-rose-700 to-red-600'
                  : 'bg-gradient-to-r from-emerald-700 to-teal-600'
              }`}
            >
              <div className="flex items-center space-x-2">
                {quickActionModal.type === 'stock_out' ? (
                  <Minus className="w-5 h-5 text-rose-200" />
                ) : (
                  <Plus className="w-5 h-5 text-emerald-200" />
                )}
                <div>
                  <h3 className="font-bold text-sm">
                    {quickActionModal.type === 'stock_out'
                      ? 'Stock Out / খরচ বা বিক্রয় এন্ট্রি'
                      : 'Stock In / স্টক বৃদ্ধি করুন'}
                  </h3>
                  <p className="text-[11px] text-white/80">{quickActionModal.material.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickActionModal({ isOpen: false, type: 'stock_out', material: null })}
                className="p-1 hover:bg-white/20 rounded-lg text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickModalSubmit} className="p-4 space-y-3 text-xs">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center">
                <span className="text-slate-600 font-semibold">বর্তমান ইনভেন্টরি স্টক:</span>
                <span className="font-bold text-blue-900 text-sm">
                  {quickActionModal.material.currentStock || 0} {quickActionModal.material.unit}
                </span>
              </div>

              {quickActionModal.type === 'stock_out' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">খরচ / বিক্রির ধরন</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'usage', label: 'চিকিৎসায় খরচ' },
                      { id: 'sale', label: 'রোগীর নিকট বিক্রি' },
                      { id: 'damage', label: 'নষ্ট/ড্যামেজ' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setQuickOutType(t.id as any)}
                        className={`py-1.5 px-2 rounded-lg font-bold text-[11px] border transition ${
                          quickOutType === t.id
                            ? 'bg-rose-50 border-rose-500 text-rose-700 ring-1 ring-rose-500/30'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    পরিমাণ ({quickActionModal.material.unit}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quickQty}
                    onChange={(e) => setQuickQty(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {quickActionModal.type === 'stock_out' ? 'বিক্রয়মূল্য (ঐচ্ছিক ৳)' : 'ক্রয়মূল্য (ঐচ্ছিক ৳)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={quickUnitPrice}
                    onChange={(e) => setQuickUnitPrice(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold text-right"
                  />
                </div>
              </div>

              {quickActionModal.type === 'stock_out' && (
                <>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">রোগীর রেজি নং</label>
                      <input
                        type="number"
                        value={quickPatientRegNo}
                        onChange={(e) => setQuickPatientRegNo(e.target.value)}
                        placeholder="e.g. 4201"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">রোগীর নাম</label>
                      <input
                        type="text"
                        value={quickPatientName}
                        onChange={(e) => setQuickPatientName(e.target.value)}
                        placeholder="রোগীর নাম"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">চিকিৎসা / মন্তব্য</label>
                    <input
                      type="text"
                      value={quickProcedure}
                      onChange={(e) => setQuickProcedure(e.target.value)}
                      placeholder="e.g. RCT / Scaling / Direct Purchase"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                    />
                  </div>
                </>
              )}

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setQuickActionModal({ isOpen: false, type: 'stock_out', material: null })}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2 text-white font-bold rounded-lg shadow-sm transition ${
                    quickActionModal.type === 'stock_out'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          EDIT MATERIAL ITEM MODAL (POPUP FOR EDITING MATERIAL DETAILS)
          ========================================================================= */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-white/10 rounded-lg">
                  <Edit3 className="w-5 h-5 text-sky-200" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Edit Material Item (ম্যাটেরিয়াল সম্পাদনা)</h3>
                  <p className="text-[11px] text-sky-100/90">{editingItem.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingItem(null);
                }}
                className="p-1 hover:bg-white/20 rounded-lg text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-4 sm:col-span-3">
                  <label className="block text-slate-700 font-bold mb-1">Item Code</label>
                  <input
                    type="text"
                    value={editingItem.code}
                    onChange={(e) => setEditingItem({ ...editingItem, code: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold bg-slate-50 focus:bg-white"
                  />
                </div>

                <div className="col-span-8 sm:col-span-9">
                  <label className="block text-slate-700 font-bold mb-1">
                    Material Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold"
                  />
                </div>

                <div className="col-span-12 sm:col-span-6">
                  <label className="block text-slate-700 font-semibold mb-1">Manufacturer / Brand</label>
                  <input
                    type="text"
                    value={editingItem.manufacturer}
                    onChange={(e) => setEditingItem({ ...editingItem, manufacturer: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="col-span-12 sm:col-span-6">
                  <label className="block text-slate-700 font-semibold mb-1">Category (ক্যাটাগরি)</label>
                  <select
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Dental Material">Dental Material (চিকিৎসা সামগ্রী)</option>
                    <option value="Oral Care Product">Oral Care (টুথপেস্ট/ব্রাশ/মাউথওয়াশ)</option>
                    <option value="Medicine">Medicine / Drug (ওষুধ)</option>
                    <option value="Disposable">Disposable (গ্লাভস/মাস্ক/কটন)</option>
                    <option value="Orthodontic Kit">Orthodontic Kit (অর্থো কিট)</option>
                    <option value="Other">Other Equipment (অন্যান্য)</option>
                  </select>
                </div>

                <div className="col-span-4 sm:col-span-4">
                  <label className="block text-slate-700 font-semibold mb-1">Unit (একক)</label>
                  <input
                    type="text"
                    value={editingItem.unit}
                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-center font-bold"
                  />
                </div>

                <div className="col-span-4 sm:col-span-4">
                  <label className="block text-slate-700 font-semibold mb-1">Low Stock Limit</label>
                  <input
                    type="number"
                    value={editingItem.lowStockLimit}
                    onChange={(e) => setEditingItem({ ...editingItem, lowStockLimit: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-center font-bold text-amber-700"
                  />
                </div>

                <div className="col-span-4 sm:col-span-4">
                  <label className="block text-slate-700 font-semibold mb-1">Current Stock</label>
                  <div className="w-full px-2.5 py-1.5 border border-slate-200 bg-slate-100 rounded-lg text-center font-black text-blue-900">
                    {editingItem.currentStock} {editingItem.unit}
                  </div>
                </div>

                <div className="col-span-6 sm:col-span-6">
                  <label className="block text-slate-700 font-semibold mb-1">Unit Cost / ক্রয়মূল্য (৳)</label>
                  <input
                    type="number"
                    value={editingItem.unitCost || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, unitCost: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono text-right"
                  />
                </div>

                <div className="col-span-6 sm:col-span-6">
                  <label className="block text-slate-700 font-semibold mb-1">Selling Price / বিক্রয়মূল্য (৳)</label>
                  <input
                    type="number"
                    value={editingItem.sellingPrice || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, sellingPrice: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono text-right font-bold text-emerald-700"
                  />
                </div>

                <div className="col-span-12 sm:col-span-6">
                  <label className="block text-slate-700 font-semibold mb-1">Supplier Name</label>
                  <input
                    type="text"
                    value={editingItem.supplier}
                    onChange={(e) => setEditingItem({ ...editingItem, supplier: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="col-span-12 sm:col-span-6">
                  <label className="block text-slate-700 font-semibold mb-1">Supplier Mobile</label>
                  <input
                    type="text"
                    value={editingItem.supplierMobile}
                    onChange={(e) => setEditingItem({ ...editingItem, supplierMobile: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                >
                  বাতিল (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>সংরক্ষণ করুন (Save Changes)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
