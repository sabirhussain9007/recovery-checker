import React, { useState } from "react";
import * as XLSX from "xlsx";
import { analyzeMissingData } from "./aiHelper";

function App() {
  const [missingData, setMissingData] = useState([]);
  const [generatedCode, setGeneratedCode] = useState("");

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        header: 1,
      });

      let missing = [];
      sheet.forEach((row, index) => {
        if (index === 0) return; // skip header
        const outstanding = row[1];
        const recovery = row[2];
        if (!outstanding || !recovery) {
          missing.push({ row: index + 1, outstanding, recovery });
        }
      });

      setMissingData(missing);

      if (missing.length > 0) {
        const code = await analyzeMissingData(missing);
        setGeneratedCode(code);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold text-center mb-6">
        Excel Missing Data Checker
      </h1>

      <div className="flex justify-center mb-6">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          className="file-input file-input-bordered file-input-primary"
        />
      </div>

      {missingData.length > 0 ? (
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Missing Data</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
            {JSON.stringify(missingData, null, 2)}
          </pre>
        </div>
      ) : (
        <p className="text-center text-gray-500">Upload Excel to check data</p>
      )}

      {generatedCode && (
        <div className="mt-6 bg-gray-900 text-green-400 p-4 rounded">
          <h2 className="text-lg font-semibold text-white mb-2">
            AI Generated Component
          </h2>
          <pre className="whitespace-pre-wrap">{generatedCode}</pre>
        </div>
      )}
    </div>
  );
}

export default App;

