'use client';

import React, { useState, useEffect } from 'react';
import { Package, Plus, AlertTriangle, Search, TrendingUp, Layers, Trash2 } from 'lucide-react';
import { db, type MaterialItem, type StockEntry, type MaterialUsage } from '@/lib/db';
import { syncEngine } from '@/lib/syncEngine';

export default function MaterialPage() {
  const [activeSubTab, setActiveSubTab] = useState<'items' | 'stock_in' | 'usage' | 'low_stock'>('items');
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Add Item State
  const [itemCode, setItemCode] = useState<string>('');
  const [itemName, setItemName] = useState<string>('');
  const [manufacturer, setManufacturer] = useState<string>('');
  const [lowStockLimit, setLowStockLimit] = useState<number>(5);
  const [supplier, setSupplier] = useState<string>('');
  const [supplierMobile, setSupplierMobile] = useState<string>('');
  const [unit, setUnit] = useState<string>('Pcs');

  // Stock In State
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [stockQty, setStockQty] = useState<number>(10);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [invoiceNo, setInvoiceNo] = useState<string>('');

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    const list = await db.materials.toArray();
    setMaterials(list);
    const entries = await db.stockEntries.reverse().toArray();
    setStockEntries(entries);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    const newItem: MaterialItem = {
      id: `mat_${Date.now()}`,
      code: itemCode || Math.floor(10 + Math.random() * 90).toString(),
      name: itemName.toUpperCase(),
      manufacturer: manufacturer.toUpperCase(),
      lowStockLimit: Number(lowStockLimit),
      supplier: supplier.toUpperCase(),
      supplierMobile,
      currentStock: 0,
      unit,
    };

    await db.materials.put(newItem);
    await syncEngine.logMutation('materials', 'INSERT', newItem.id, newItem);

    setItemCode('');
    setItemName('');
    setManufacturer('');
    setSupplier('');
    setSupplierMobile('');
    loadMaterials();
    alert('নতুন ডেন্টাল ম্যাটেরিয়াল যোগ করা হয়েছে!');
  };

  const handleStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterialId || stockQty <= 0) return;

    const material = materials.find((m) => m.id === selectedMaterialId);
    if (!material) return;

    const entry: StockEntry = {
      id: `stock_${Date.now()}`,
      materialId: material.id,
      materialName: material.name,
      date: new Date().toISOString().split('T')[0],
      quantity: Number(stockQty),
      unitCost: Number(unitCost),
      totalCost: Number(stockQty) * Number(unitCost),
      supplier: material.supplier,
      expiryDate,
      invoiceNo,
      createdAt: new Date().toISOString(),
    };

    await db.stockEntries.put(entry);
    await syncEngine.logMutation('stockEntries', 'INSERT', entry.id, entry);

    // Update current stock
    const newStock = (material.currentStock || 0) + Number(stockQty);
    await db.materials.update(material.id, { currentStock: newStock });
    await syncEngine.logMutation('materials', 'UPDATE', material.id, { ...material, currentStock: newStock });

    setStockQty(10);
    setUnitCost(0);
    setExpiryDate('');
    loadMaterials();
    alert('স্টক সফলভাবে ইনপুট হয়েছে!');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this material item?')) {
      await db.materials.delete(id);
      await syncEngine.logMutation('materials', 'DELETE', id, { id });
      loadMaterials();
    }
  };

  return (
    <div className="p-3 max-w-[1550px] mx-auto text-slate-800">
      <div className="bg-white rounded-lg border border-slate-300 shadow-sm p-4">
        {/* Top Header Matching meterial menu.png */}
        <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-slate-200 gap-2">
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-blue-600" />
            <h1 className="text-base font-bold text-blue-950">Dental Material & Inventory Management</h1>
          </div>

          <div className="flex space-x-1.5 text-xs">
            <button
              onClick={() => setActiveSubTab('items')}
              className={`px-3.5 py-1.5 rounded font-bold ${
                activeSubTab === 'items' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Item List ({materials.length})
            </button>
            <button
              onClick={() => setActiveSubTab('stock_in')}
              className={`px-3.5 py-1.5 rounded font-bold ${
                activeSubTab === 'stock_in' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              New Stock Entry
            </button>
            <button
              onClick={() => setActiveSubTab('low_stock')}
              className={`px-3.5 py-1.5 rounded font-bold ${
                activeSubTab === 'low_stock' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Low Stock Alert ({materials.filter((m) => (m.currentStock || 0) <= m.lowStockLimit).length})
            </button>
          </div>
        </div>

        {/* TAB 1: ADD ITEM & ITEM LIST (Matching add item.png) */}
        {activeSubTab === 'items' && (
          <div className="space-y-4">
            <form onSubmit={handleAddItem} className="bg-sky-50 border border-sky-200 rounded p-3 text-xs">
              <div className="font-bold text-blue-900 mb-2">ITEM ADD (ম্যাটেরিয়াল যোগ করুন)</div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-6 md:col-span-1">
                  <label className="block text-slate-600 font-medium mb-0.5">Code</label>
                  <input
                    type="text"
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value)}
                    placeholder="30"
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-mono"
                  />
                </div>

                <div className="col-span-6 md:col-span-3">
                  <label className="block text-slate-600 font-medium mb-0.5">Item Name *</label>
                  <input
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="e.g. UST GEL / COMPOSITE RESIN"
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                  />
                </div>

                <div className="col-span-6 md:col-span-2">
                  <label className="block text-slate-600 font-medium mb-0.5">Manufacture</label>
                  <input
                    type="text"
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    placeholder="e.g. MEDPHYSIO / 3M"
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                  />
                </div>

                <div className="col-span-6 md:col-span-1">
                  <label className="block text-slate-600 font-medium mb-0.5">Low Limit</label>
                  <input
                    type="number"
                    value={lowStockLimit}
                    onChange={(e) => setLowStockLimit(Number(e.target.value))}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-center font-bold"
                  />
                </div>

                <div className="col-span-6 md:col-span-2">
                  <label className="block text-slate-600 font-medium mb-0.5">Supplier</label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="Supplier name"
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                  />
                </div>

                <div className="col-span-6 md:col-span-2">
                  <label className="block text-slate-600 font-medium mb-0.5">Supplier Mobile</label>
                  <input
                    type="text"
                    value={supplierMobile}
                    onChange={(e) => setSupplierMobile(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                  />
                </div>

                <div className="col-span-12 md:col-span-1 flex items-end">
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded font-bold shadow"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </form>

            <div className="overflow-x-auto border border-slate-200 rounded text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="p-2 w-10 text-center">SI</th>
                    <th className="p-2 w-16 text-center">CODE</th>
                    <th className="p-2">NAME</th>
                    <th className="p-2">MANUFACTURE</th>
                    <th className="p-2 w-20 text-center">LIMIT</th>
                    <th className="p-2 w-24 text-center">STOCK</th>
                    <th className="p-2">SUPPLIER</th>
                    <th className="p-2 w-28">SUPPLIER MOBILE</th>
                    <th className="p-2 w-16 text-center">OPTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {materials.map((mat, i) => (
                    <tr key={mat.id} className="hover:bg-sky-50/40">
                      <td className="p-2 text-center text-slate-500 font-semibold">{i + 1}</td>
                      <td className="p-2 text-center font-mono font-bold text-blue-900">{mat.code}</td>
                      <td className="p-2 font-bold text-slate-900">{mat.name}</td>
                      <td className="p-2 text-slate-600">{mat.manufacturer}</td>
                      <td className="p-2 text-center font-bold text-amber-700">{mat.lowStockLimit}</td>
                      <td className="p-2 text-center">
                        <span
                          className={`font-bold px-2 py-0.5 rounded ${
                            (mat.currentStock || 0) <= mat.lowStockLimit
                              ? 'bg-red-100 text-red-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {mat.currentStock || 0} {mat.unit}
                        </span>
                      </td>
                      <td className="p-2 text-slate-700">{mat.supplier}</td>
                      <td className="p-2 font-mono text-slate-600">{mat.supplierMobile}</td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => handleDelete(mat.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: NEW STOCK ENTRY (Matching new stock entry form.png) */}
        {activeSubTab === 'stock_in' && (
          <div className="space-y-4">
            <form onSubmit={handleStockIn} className="bg-sky-50 border border-sky-200 rounded p-4 text-xs max-w-2xl">
              <div className="font-bold text-blue-900 text-sm mb-3">New Stock Purchase Entry</div>
              <div className="space-y-2.5">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Select Item *</label>
                  <select
                    required
                    value={selectedMaterialId}
                    onChange={(e) => setSelectedMaterialId(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-bold text-blue-900"
                  >
                    <option value="">-- Choose Material Item --</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        [{m.code}] {m.name} - (Current: {m.currentStock || 0} {m.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Quantity *</label>
                    <input
                      type="number"
                      required
                      value={stockQty}
                      onChange={(e) => setStockQty(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Unit Cost (TK)</label>
                    <input
                      type="number"
                      value={unitCost}
                      onChange={(e) => setUnitCost(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-bold text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Invoice / Memo No</label>
                    <input
                      type="text"
                      value={invoiceNo}
                      onChange={(e) => setInvoiceNo(e.target.value)}
                      placeholder="INV-9821"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white rounded font-bold shadow text-xs mt-2"
                >
                  Save Stock In
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: LOW STOCK ALERT (Matching expire report.png) */}
        {activeSubTab === 'low_stock' && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs">
            <h3 className="font-bold text-amber-900 text-sm mb-2 flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Low Stock & Reorder Warning</span>
            </h3>
            <div className="space-y-2">
              {materials
                .filter((m) => (m.currentStock || 0) <= m.lowStockLimit)
                .map((mat) => (
                  <div
                    key={mat.id}
                    className="p-2.5 bg-white rounded border border-amber-300 flex justify-between items-center"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-[13px]">{mat.name}</div>
                      <div className="text-slate-500 text-[11px]">
                        Supplier: {mat.supplier} ({mat.supplierMobile})
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-red-600 font-bold text-sm">
                        Stock: {mat.currentStock || 0} / Min: {mat.lowStockLimit}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

