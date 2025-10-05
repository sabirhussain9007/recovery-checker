
import React, { useState } from "react";
import * as XLSX from "xlsx";
import {
  findCombinations,
  findClosestCombination,
  generateAIExplanationPrompt,
  formatPKR,
  formatDate,
} from "./utils/findCombinations.js";

function App() {
  const [rows, setRows] = useState([]);
  const [matches, setMatches] = useState([]);
  const [overallMissing, setOverallMissing] = useState(0);
  const [aiExplanation, setAIExplanation] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔹 Get API key from environment variables
  const getApiKey = () => {
    return import.meta.env?.VITE_GEMINI_API_KEY || 
           import.meta.env?.REACT_APP_GEMINI_API_KEY;
  };

  // 🔹 Real AI response function using fetch
  const getAIResponse = async (prompt, currentMatches, currentMissing) => {
    try {
      const API_KEY = getApiKey();
      
      if (!API_KEY) {
        throw new Error("Please add your Gemini API key to the .env file");
      }

      // Try the most common working model
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }]
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
      } else {
        const errorData = await response.json();
        throw new Error(`API Error: ${errorData.error?.message || 'Please enable Gemini API'}`);
      }

    } catch (error) {
      console.error("AI API Error:", error);
      
      // Create a helpful manual analysis
      const matchCount = currentMatches?.length || 0;
      const missingAmount = formatPKR(currentMissing);
      
      let manualAnalysis = `🤖 AI Service Temporarily Unavailable\n\n`;
      manualAnalysis += `📊 Manual Analysis Results:\n`;
      manualAnalysis += `• Missing Amount: ${missingAmount}\n`;
      manualAnalysis += `• Combinations Found: ${matchCount}\n\n`;

      if (matchCount > 0) {
        currentMatches.forEach((combo, idx) => {
          const dates = combo.rows.map(r => formatDate(r.date)).join(', ');
          const difference = combo.sum - currentMissing;
          manualAnalysis += `Option ${idx + 1}:\n`;
          manualAnalysis += `  Dates: ${dates}\n`;
          manualAnalysis += `  Total: ${formatPKR(combo.sum)}\n`;
          manualAnalysis += `  Difference: ${formatPKR(difference)} ${difference > 0 ? '(over)' : '(under)'}\n\n`;
        });

        // Add insights
        const bestMatch = currentMatches[0];
        const bestDifference = bestMatch.sum - currentMissing;
        
        if (Math.abs(bestDifference) < 1) {
          manualAnalysis += `💡 Insight: Found exact match!`;
        } else if (bestDifference > 0) {
          manualAnalysis += `💡 Insight: Closest match is ${formatPKR(bestDifference)} over the target.`;
        } else {
          manualAnalysis += `💡 Insight: Closest match is ${formatPKR(Math.abs(bestDifference))} under the target.`;
        }
      } else {
        manualAnalysis += `💡 Insight: No combinations found. The missing amount might be composed of multiple smaller transactions or there may be data inconsistencies.`;
      }

      return manualAnalysis;
    }
  };

  // 🔹 Handle Excel upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
          header: 1,
        });

        // Convert Excel rows into objects with validation
        const parsedRows = sheet.slice(1)
          .filter(row => row.length >= 3)
          .map((row, index) => ({
            id: index + 1,
            date: row[0],
            outstanding: Math.abs(Number(row[1]) || 0), // Ensure positive numbers
            recovery: Math.abs(Number(row[2]) || 0),
          }))
          .filter(row => row.outstanding > 0); // Only rows with outstanding amounts

        console.log("Processed rows:", parsedRows);
        processData(parsedRows);
      } catch (error) {
        console.error("Error processing file:", error);
        alert("Error processing Excel file. Please check the format.");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // 🔹 Process rows with better validation
  const processData = async (data) => {
    setRows(data);
    setLoading(true);
    setAIExplanation("");

    try {
      const totalOutstanding = data.reduce((sum, r) => sum + r.outstanding, 0);
      const totalRecovery = data.reduce((sum, r) => sum + r.recovery, 0);
      const missing = totalOutstanding - totalRecovery;

      console.log("Calculation:", { totalOutstanding, totalRecovery, missing, data });

      setOverallMissing(missing);

      let combos = [];

      if (missing > 0) { // Only look for combinations if missing amount is positive
        console.log("Looking for combinations for missing amount:", missing);
        
        // First try to find exact combinations
        combos = findCombinations(data, missing);
        console.log("Exact combinations found:", combos);
        
        // If no exact matches, find closest
        if (combos.length === 0) {
          console.log("No exact matches, looking for closest...");
          const closest = findClosestCombination(data, missing);
          if (closest) {
            combos = [closest];
            console.log("Closest combination:", closest);
          }
        }

        // Generate AI explanation if we have combinations
        if (combos.length > 0) {
          const prompt = generateAIExplanationPrompt(combos, missing, "english");
          console.log("AI Explanation Prompt:\n", prompt);

          const aiResponse = await getAIResponse(prompt, combos, missing);
          setAIExplanation(aiResponse);
        } else {
          // No combinations found
          setAIExplanation(`📊 Analysis Complete\n\nNo matching combinations found for the missing amount of ${formatPKR(missing)}.\n\nPossible reasons:\n• The missing amount might be spread across multiple smaller transactions\n• There could be data entry issues\n• No single transaction matches the missing amount exactly\n\nTotal Outstanding: ${formatPKR(totalOutstanding)}\nTotal Recovery: ${formatPKR(totalRecovery)}\nDifference: ${formatPKR(missing)}`);
        }
      } else if (missing < 0) {
        // Recovery exceeds outstanding
        setAIExplanation(`⚠️ Data Anomaly\n\nRecovery amount (${formatPKR(totalRecovery)}) exceeds outstanding amount (${formatPKR(totalOutstanding)}) by ${formatPKR(Math.abs(missing))}.\n\nThis could indicate:\n• Overpayment\n• Data entry errors\n• Advance payments included`);
      } else {
        // Perfect match
        setAIExplanation(`✅ Perfect Match!\n\nNo missing amount detected. All outstanding amounts are perfectly accounted for.\n\nTotal Outstanding: ${formatPKR(totalOutstanding)}\nTotal Recovery: ${formatPKR(totalRecovery)}\nDifference: ${formatPKR(missing)}`);
      }

      setMatches(combos);

    } catch (error) {
      console.error("Error processing data:", error);
      alert("Error analyzing data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Check if API key is configured
  const isApiKeyConfigured = () => {
    const apiKey = getApiKey();
    return !!apiKey;
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Missing Amount Analyzer</h2>

      {/* 🔹 API Key Status */}
      {!isApiKeyConfigured() && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          <p className="text-red-800 text-sm">
            <strong>⚠️ API Key Missing:</strong> Add your Gemini API key to <code>.env</code> as <code>VITE_GEMINI_API_KEY=your_key</code>
          </p>
        </div>
      )}

      {/* 🔹 Excel Upload */}
      <div className="mb-4">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          className="file-input file-input-bordered file-input-primary w-full"
          disabled={loading}
        />
      </div>

      {/* 🔹 Loading Indicator */}
      {loading && (
        <div className="text-center py-4">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-2 text-gray-600">Analyzing data...</p>
        </div>
      )}

      {/* 🔹 Data Summary */}
      {!loading && rows.length > 0 && (
        <div className="bg-gray-50 p-4 rounded mb-4">
          <h3 className="font-semibold mb-2">Data Summary</h3>
          <p>Records Loaded: {rows.length}</p>
          <p>Total Outstanding: {formatPKR(rows.reduce((sum, r) => sum + r.outstanding, 0))}</p>
          <p>Total Recovery: {formatPKR(rows.reduce((sum, r) => sum + r.recovery, 0))}</p>
        </div>
      )}

      {/* 🔹 Show overall missing */}
      {!loading && overallMissing !== 0 && (
        <div className="bg-white shadow p-4 rounded mb-6">
          <p className="mb-2">
            <strong>Missing Amount to Find:</strong>{" "}
            <span className="text-red-600 font-bold text-lg">{formatPKR(overallMissing)}</span>
          </p>
        </div>
      )}

      {/* 🔹 Show matches */}
      {!loading && matches.length > 0 && (
        <div className="space-y-4 mb-6">
          <h3 className="font-semibold text-lg">Found Combinations:</h3>
          {matches.map((combo, idx) => (
            <div key={idx} className="border rounded bg-white shadow-sm">
              <div className="p-4 border-b">
                <p className="font-bold">
                  Option {idx + 1} → Total: {formatPKR(combo.sum)}
                  {combo.sum !== overallMissing && (
                    <span className={`ml-2 text-sm ${combo.sum > overallMissing ? 'text-orange-600' : 'text-blue-600'}`}>
                      ({formatPKR(combo.sum - overallMissing)} {combo.sum > overallMissing ? 'over' : 'under'})
                    </span>
                  )}
                </p>
              </div>
              <div className="p-4">
                {combo.rows.map((r, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center py-1"
                  >
                    <span className="font-medium">{formatDate(r.date)}</span>
                    <span className="bg-blue-50 px-2 py-1 rounded">
                      {formatPKR(r.outstanding)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🔹 AI Explanation */}
      {!loading && aiExplanation && (
        <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
          <h3 className="font-semibold mb-2 text-blue-800">
            📊 Analysis Results
          </h3>
          <p className="text-gray-700 whitespace-pre-line">{aiExplanation}</p>
        </div>
      )}
    </div>
  );
}

export default App;