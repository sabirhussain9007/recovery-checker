// src/components/ExcelUploader.jsx
import React from "react";
import * as XLSX from "xlsx";

const ExcelUploader = ({ onDataLoaded }) => {
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);

      const rows = json.map((row) => ({
        date: row["Date"],
        outstanding: Number(row["Outstanding"]) || 0,
        recovery: Number(row["Recovery"]) || 0,
      }));

      onDataLoaded(rows);
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div>
      <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} />
    </div>
  );
};

export default ExcelUploader;








