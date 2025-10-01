

import React, { useState } from "react";
import * as XLSX from "xlsx";
//import { findCombinations, formatUSD, formatDate } from "./utils/findCombinations"; // ✅ added formatDate
import { findCombinations, formatPKR, formatDate } from "./utils/findCombinations";



function App() {
  const [rows, setRows] = useState([]);
  const [matches, setMatches] = useState([]);
  const [overallMissing, setOverallMissing] = useState(0);

  // 🔹 Handle Excel upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        header: 1,
      });

      // Convert Excel rows into objects
      const parsedRows = sheet.slice(1).map((row) => ({
        date: row[0],
        outstanding: Number(row[1]) || 0,
        recovery: Number(row[2]) || 0,
      }));

      processData(parsedRows);
    };

    reader.readAsArrayBuffer(file);
  };

  // 🔹 Process rows
  const processData = (data) => {
    setRows(data);

    const totalOutstanding = data.reduce((sum, r) => sum + r.outstanding, 0);
    const totalRecovery = data.reduce((sum, r) => sum + r.recovery, 0);
    const missing = totalOutstanding - totalRecovery;

    setOverallMissing(missing);

    const combos = findCombinations(data, missing);
    setMatches(combos);
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Missing Amount Analyzer</h2>

      {/* 🔹 Excel Upload */}
      <div className="mb-4">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          className="file-input file-input-bordered file-input-primary"
        />
      </div>

      {/* 🔹 Show overall missing */}
      {overallMissing !== 0 && (
        <div className="bg-white shadow p-4 rounded mb-6">
          <p className="mb-2">
            <strong>Overall Missing:</strong>{" "}
            <span className="text-red-600">{formatPKR(overallMissing)}</span>
          </p>
        </div>
      )}

      {/* 🔹 Show matches */}
      {matches.length > 0 ? (
        <div className="space-y-4">
          {matches.map((combo, idx) => (
            <div key={idx} className="mb-3 p-2 border rounded bg-white">
              <p className="text-sm font-bold">
                Combination {idx + 1} → Sum: {formatPKR(combo.sum)}
              </p>
              {combo.rows.map((r, i) => (
                <p
                  key={i}
                  className="text-gray-800 text-sm flex justify-between"
                >
                  <span>{formatDate(r.date)}</span>
                  <span>{formatPKR(r.outstanding)}</span>
                </p>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No matching combinations found.</p>
      )}
    </div>
  );
}

export default App;
