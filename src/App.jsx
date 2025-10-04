

// import React, { useState } from "react";
// import * as XLSX from "xlsx";
// import {
//   findCombinations,
//   findClosestCombination,
//   generateAIExplanationPrompt,
//   formatPKR,
//   formatDate,
// } from "./utils/findCombinations.js"; // ✅ added formatDate

// function App() {
//   const [rows, setRows] = useState([]);
//   const [matches, setMatches] = useState([]);
//   const [overallMissing, setOverallMissing] = useState(0);
//   const [aiExplanation, setAIExplanation] = useState(""); // ✅ added for AI response

//   // 🔹 Simulated AI response function (replace with Gemini API)
//   const getAIResponse = async (prompt) => {
//     console.log("Sending prompt to AI service:\n", prompt);
//     // Simulate an API delay
//     await new Promise((res) => setTimeout(res, 1000));
//     return "AI suggests the missing amounts are linked to March recoveries delay. Please verify outstanding from 10-03-2025.";
//   };

//   // 🔹 Handle Excel upload
//   const handleFileUpload = (e) => {
//     const file = e.target.files[0];
//     if (!file) return;

//     const reader = new FileReader();
//     reader.onload = (event) => {
//       const data = new Uint8Array(event.target.result);
//       const workbook = XLSX.read(data, { type: "array" });
//       const sheetName = workbook.SheetNames[0];
//       const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
//         header: 1,
//       });

//       // Convert Excel rows into objects
//       const parsedRows = sheet.slice(1).map((row) => ({
//         date: row[0],
//         outstanding: Number(row[1]) || 0,
//         recovery: Number(row[2]) || 0,
//       }));

//       processData(parsedRows);
//     };

//     reader.readAsArrayBuffer(file);
//   };

//   // 🔹 Process rows
//   const processData = async (data) => {
//     setRows(data);

//     const totalOutstanding = data.reduce((sum, r) => sum + r.outstanding, 0);
//     const totalRecovery = data.reduce((sum, r) => sum + r.recovery, 0);
//     const missing = totalOutstanding - totalRecovery;

//     setOverallMissing(missing);

//     let combos = findCombinations(data, missing);
//     if (combos.length === 0 && missing !== 0 ) {
//       const closest = findClosestCombination(data, missing);
//       if (closest) combos = [closest];
//       else combos = [];
//     }
//     setMatches(combos);

//     // Generate AI Gemini explanation prompt
//     if (combos.length > 0 && missing !== 0) {
//       const prompt = generateAIExplanationPrompt(combos, missing, "english");
//       console.log("AI Explanation Prompt:\n", prompt);

//       // Simulate getting AI response
//       const aiResponse = await getAIResponse(prompt);
//       setAIExplanation(aiResponse);
//     } else {
//       setAIExplanation("");
//     }

//     // find closest if no exact combos
//     if (combos.length === 0 && missing !== 0) {
//       const closest = findClosestCombination(data, missing);
//       if (closest) setMatches([closest]);
//       else setMatches([]);
//     }

 

//     // Reset if no missing
//     if (missing === 0) {
//       setMatches([]);
//     }
//   };

//   return (
//     <div className="p-6 max-w-xl mx-auto">
//       <h2 className="text-2xl font-bold mb-4">Missing Amount Analyzer</h2>

//       {/* 🔹 Excel Upload */}
//       <div className="mb-4">
//         <input
//           type="file"
//           accept=".xlsx,.xls"
//           onChange={handleFileUpload}
//           className="file-input file-input-bordered file-input-primary"
//         />
//       </div>

//       {/* 🔹 Show overall missing */}
//       {overallMissing !== 0 && (
//         <div className="bg-white shadow p-4 rounded mb-6">
//           <p className="mb-2">
//             <strong>Overall Missing:</strong>{" "}
//             <span className="text-red-600">{formatPKR(overallMissing)}</span>
//           </p>
//         </div>
//       )}

//       {/* 🔹 Show matches */}
//       {matches.length > 0 ? (
//         <div className="space-y-4">
//           {matches.map((combo, idx) => (
//             <div key={idx} className="mb-3 p-2 border rounded bg-white">
//               <p className="text-sm font-bold">
//                 Combination {idx + 1} → Sum: {formatPKR(combo.sum)}
//               </p>
//               {combo.rows.map((r, i) => (
//                 <p
//                   key={i}
//                   className="text-gray-800 text-sm flex justify-between"
//                 >
//                   <span>{formatDate(r.date)}</span>
//                   <span>{formatPKR(r.outstanding)}</span>
//                 </p>
//               ))}
//             </div>
//           ))}
//         </div>
//       ) : (
//         <p className="text-gray-500">No matching combinations found.</p>
//       )}

//       {/* 🔹 AI Explanation */}
//       {aiExplanation && (
//         <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
//           <h3 className="font-semibold mb-2 text-blue-800">
//             🤖 AI Explanation
//           </h3>
//           <p className="text-gray-700 whitespace-pre-line">{aiExplanation}</p>
//         </div>
//       )}
//     </div>
//   );
// }

// export default App;



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
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState("");

  const getAIResponse = async (prompt) => {
    console.log("Sending prompt to AI service:\n", prompt);
    await new Promise((res) => setTimeout(res, 1000));
    return "AI suggests the missing amounts are linked to March recoveries delay. Please verify outstanding from 10-03-2025.";
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setAIExplanation("");
    setMatches([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
          header: 1,
        });

        const parsedRows = sheet.slice(1).map((row) => ({
          date: row[0],
          outstanding: Number(row[1]) || 0,
          recovery: Number(row[2]) || 0,
        }));

        processData(parsedRows);
      } catch (error) {
        console.error("Error processing file:", error);
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const processData = async (data) => {
    setRows(data);

    const totalOutstanding = data.reduce((sum, r) => sum + r.outstanding, 0);
    const totalRecovery = data.reduce((sum, r) => sum + r.recovery, 0);
    const missing = totalOutstanding - totalRecovery;

    setOverallMissing(missing);

    let combos = findCombinations(data, missing);
    if (combos.length === 0 && missing !== 0) {
      const closest = findClosestCombination(data, missing);
      if (closest) combos = [closest];
      else combos = [];
    }
    setMatches(combos);

    if (combos.length > 0 && missing !== 0) {
      const prompt = generateAIExplanationPrompt(combos, missing, "english");
      const aiResponse = await getAIResponse(prompt);
      setAIExplanation(aiResponse);
    } else {
      setAIExplanation("");
    }

    if (combos.length === 0 && missing !== 0) {
      const closest = findClosestCombination(data, missing);
      if (closest) setMatches([closest]);
      else setMatches([]);
    }

    if (missing === 0) {
      setMatches([]);
    }

    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Missing Amount Analyzer
          </h1>
          <p className="text-gray-600">
            Upload your Excel file to analyze outstanding amounts and recoveries
          </p>
        </div>

        {/* Upload Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Upload Excel File
            </h2>
            {fileName && (
              <span className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                ✓ {fileName}
              </span>
            )}
          </div>
          
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer block"
            >
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-gray-700 mb-1">
                <span className="text-blue-600 font-medium">Click to upload</span> or drag and drop
              </p>
              <p className="text-gray-500 text-sm">.xlsx or .xls files only</p>
            </label>
          </div>
        </div>

        {/* Loading State */}
        {isProcessing && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Processing your file...</p>
          </div>
        )}

        {/* Results Section */}
        {!isProcessing && (overallMissing !== 0 || matches.length > 0) && (
          <div className="space-y-6">
            {/* Missing Amount Card */}
            {overallMissing !== 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">
                      Overall Missing Amount
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Difference between total outstanding and recovery amounts
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-600">
                      {formatPKR(overallMissing)}
                    </div>
                    <div className="text-sm text-gray-500">Missing</div>
                  </div>
                </div>
              </div>
            )}

            {/* Matches Section */}
            {matches.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Potential Matches ({matches.length} found)
                </h3>
                <div className="space-y-4">
                  {matches.map((combo, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-gray-700">
                          Combination {idx + 1}
                        </span>
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                          Sum: {formatPKR(combo.sum)}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {combo.rows.map((r, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-gray-700 font-medium">
                                {formatDate(r.date)}
                              </span>
                            </div>
                            <span className="text-gray-900 font-semibold">
                              {formatPKR(r.outstanding)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : overallMissing !== 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  No Matching Combinations Found
                </h3>
                <p className="text-gray-600">
                  We couldn't find any combinations that match the missing amount exactly.
                </p>
              </div>
            )}

            {/* AI Explanation */}
            {aiExplanation && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-lg p-6 border border-blue-200">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-blue-800">
                    AI Analysis
                  </h3>
                </div>
                <div className="bg-white rounded-xl p-4 border border-blue-100">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {aiExplanation}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!isProcessing && overallMissing === 0 && matches.length === 0 && fileName && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              All Amounts Accounted For
            </h3>
            <p className="text-gray-600">
              No missing amounts detected in your data.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;