import React, { useState } from "react";
import { api, BACKEND_URL } from "../lib/api";
import { Upload, Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";

export default function ImportExport() {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const onFile = async (file) => {
    setImporting(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post("/import", fd);
      setResult(r.data);
      toast.success(`Imported ${r.data.inserted} products`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const downloadCSV = () => window.open(`${BACKEND_URL}/api/export?format=csv`, "_blank");
  const downloadXLSX = () => window.open(`${BACKEND_URL}/api/export?format=xlsx`, "_blank");

  return (
    <div className="space-y-6 max-w-4xl" data-testid="import-export-page">
      <header>
        <div className="label-eyebrow mb-2">Data</div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight">Import / Export</h1>
        <p className="text-sm text-neutral-500 mt-2">
          Bulk add via CSV or Excel. Download your full catalog any time.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Import */}
        <section className="bg-white border border-neutral-200 p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-[#171717] text-white flex items-center justify-center">
              <Upload size={18} />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg tracking-tight">Import</h2>
              <p className="text-xs text-neutral-500">CSV or XLSX with columns: <span className="mono">item_name, category, description, price, pack_qty, pack_unit, image, status</span></p>
            </div>
          </div>

          <label className="block border border-dashed border-neutral-400 p-6 text-center cursor-pointer hover:bg-[#F5F5F5]">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              data-testid="import-file-input"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
            <div className="inline-flex flex-col items-center gap-1">
              <Upload size={20} />
              <div className="font-display font-medium text-sm tracking-tight">
                {importing ? "Importing..." : "Choose CSV / XLSX"}
              </div>
            </div>
          </label>

          {result && (
            <div className="mt-4 bg-[#F5F5F5] border border-neutral-200 p-3 text-sm space-y-1" data-testid="import-result">
              <div><span className="label-eyebrow">Inserted:</span> <span className="numeric font-semibold ml-1">{result.inserted}</span></div>
              <div><span className="label-eyebrow">Skipped:</span> <span className="numeric ml-1">{result.skipped}</span></div>
              <div><span className="label-eyebrow">New Categories:</span> <span className="numeric ml-1">{result.new_categories}</span></div>
            </div>
          )}
        </section>

        {/* Export */}
        <section className="bg-white border border-neutral-200 p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-[#0055FF] text-white flex items-center justify-center">
              <Download size={18} />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg tracking-tight">Export</h2>
              <p className="text-xs text-neutral-500">Download your full product catalog.</p>
            </div>
          </div>
          <div className="space-y-2">
            <button
              onClick={downloadCSV}
              data-testid="export-csv-btn"
              className="w-full flex items-center justify-between px-4 py-3 border border-neutral-300 hover:border-black"
            >
              <div className="flex items-center gap-2">
                <FileText size={16} /> <span className="text-sm font-medium">Download CSV</span>
              </div>
              <span className="label-eyebrow">.csv</span>
            </button>
            <button
              onClick={downloadXLSX}
              data-testid="export-xlsx-btn"
              className="w-full flex items-center justify-between px-4 py-3 border border-neutral-300 hover:border-black"
            >
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={16} /> <span className="text-sm font-medium">Download Excel</span>
              </div>
              <span className="label-eyebrow">.xlsx</span>
            </button>
          </div>
        </section>
      </div>

      <section className="bg-white border border-neutral-200 p-6">
        <h2 className="font-display font-semibold text-lg tracking-tight mb-2">Sample CSV Format</h2>
        <pre className="mono text-xs bg-[#FAFAFA] border border-neutral-200 p-3 overflow-x-auto">
{`item_name,category,description,price,pack_qty,pack_unit,image,status
Tissue Paper Box (6000 pcs),Paper,Premium 2-ply,250.00,6000,pcs,,active
A4 Sheets (500 pkt),Stationery,80 GSM,320.50,500,pkt,,active
Cling Film Roll (10 roll),Packaging,30m roll,180.00,10,roll,,active`}
        </pre>
      </section>
    </div>
  );
}
