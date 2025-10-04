

import React, { useState } from "react";
import * as XLSX from "xlsx";
import {
  findCombinations,
  findClosestCombination,
  generateAIExplanationPrompt,
  formatPKR,
  formatDate,
} from "./utils/findCombinations.js"; // ✅ added formatDate

function App() {
  const [rows, setRows] = useState([]);
  const [matches, setMatches] = useState([]);
  const [overallMissing, setOverallMissing] = useState(0);
  const [aiExplanation, setAIExplanation] = useState(""); // ✅ added for AI response

  // 🔹 Simulated AI response function (replace with Gemini API)
  const getAIResponse = async (prompt) => {
    console.log("Sending prompt to AI service:\n", prompt);
    // Simulate an API delay
    await new Promise((res) => setTimeout(res, 1000));
    return "AI suggests the missing amounts are linked to March recoveries delay. Please verify outstanding from 10-03-2025.";
  };

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
  const processData = async (data) => {
    setRows(data);

    const totalOutstanding = data.reduce((sum, r) => sum + r.outstanding, 0);
    const totalRecovery = data.reduce((sum, r) => sum + r.recovery, 0);
    const missing = totalOutstanding - totalRecovery;

    setOverallMissing(missing);

    let combos = findCombinations(data, missing);
    if (combos.length === 0 && missing !== 0 ) {
      const closest = findClosestCombination(data, missing);
      if (closest) combos = [closest];
      else combos = [];
    }
    setMatches(combos);

    // Generate AI Gemini explanation prompt
    if (combos.length > 0 && missing !== 0) {
      const prompt = generateAIExplanationPrompt(combos, missing, "english");
      console.log("AI Explanation Prompt:\n", prompt);

      // Simulate getting AI response
      const aiResponse = await getAIResponse(prompt);
      setAIExplanation(aiResponse);
    } else {
      setAIExplanation("");
    }

    // find closest if no exact combos
    if (combos.length === 0 && missing !== 0) {
      const closest = findClosestCombination(data, missing);
      if (closest) setMatches([closest]);
      else setMatches([]);
    }

 

    // Reset if no missing
    if (missing === 0) {
      setMatches([]);
    }
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

      {/* 🔹 AI Explanation */}
      {aiExplanation && (
        <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
          <h3 className="font-semibold mb-2 text-blue-800">
            🤖 AI Explanation
          </h3>
          <p className="text-gray-700 whitespace-pre-line">{aiExplanation}</p>
        </div>
      )}
    </div>
  );
}

export default App;
