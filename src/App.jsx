


// import React, { useState } from "react";
// import * as XLSX from "xlsx";
// import {
//   findCombinations,
//   findClosestCombination,
//   generateAIExplanationPrompt,
//   formatPKR,
//   formatDate,
// } from "./utils/findCombinations.js";

// function App() {
//   const [rows, setRows] = useState([]);
//   const [matches, setMatches] = useState([]);
//   const [overallMissing, setOverallMissing] = useState(0);
//   const [aiExplanation, setAIExplanation] = useState("");
//   const [loading, setLoading] = useState(false);

//   // 🔹 Get API key from environment variables
//   const getApiKey = () => {
//     return import.meta.env?.VITE_GEMINI_API_KEY || 
//            import.meta.env?.REACT_APP_GEMINI_API_KEY;
//   };

//   // 🔹 Real AI response function using fetch
//   const getAIResponse = async (prompt, currentMatches, currentMissing) => {
//     try {
//       const API_KEY = getApiKey();
      
//       if (!API_KEY) {
//         throw new Error("Please add your Gemini API key to the .env file");
//       }

//       // Try the most common working model
//       const response = await fetch(
//         `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent?key=${API_KEY}`,
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify({
//             contents: [{
//               parts: [{
//                 text: prompt
//               }]
//             }]
//           }),
//         }
//       );

//       if (response.ok) {
//         const data = await response.json();
//         return data.candidates[0].content.parts[0].text;
//       } else {
//         const errorData = await response.json();
//         throw new Error(`API Error: ${errorData.error?.message || 'Please enable Gemini API'}`);
//       }

//     } catch (error) {
//       console.error("AI API Error:", error);
      
//       // Create a helpful manual analysis
//       const matchCount = currentMatches?.length || 0;
//       const missingAmount = formatPKR(currentMissing);
      
//       let manualAnalysis = `🤖 AI Service Temporarily Unavailable\n\n`;
//       manualAnalysis += `📊 Manual Analysis Results:\n`;
//       manualAnalysis += `• Missing Amount: ${missingAmount}\n`;
//       manualAnalysis += `• Combinations Found: ${matchCount}\n\n`;

//       if (matchCount > 0) {
//         currentMatches.forEach((combo, idx) => {
//           const dates = combo.rows.map(r => formatDate(r.date)).join(', ');
//           const difference = combo.sum - currentMissing;
//           manualAnalysis += `Option ${idx + 1}:\n`;
//           manualAnalysis += `  Dates: ${dates}\n`;
//           manualAnalysis += `  Total: ${formatPKR(combo.sum)}\n`;
//           manualAnalysis += `  Difference: ${formatPKR(difference)} ${difference > 0 ? '(over)' : '(under)'}\n\n`;
//         });

//         // Add insights
//         const bestMatch = currentMatches[0];
//         const bestDifference = bestMatch.sum - currentMissing;
        
//         if (Math.abs(bestDifference) < 1) {
//           manualAnalysis += `💡 Insight: Found exact match!`;
//         } else if (bestDifference > 0) {
//           manualAnalysis += `💡 Insight: Closest match is ${formatPKR(bestDifference)} over the target.`;
//         } else {
//           manualAnalysis += `💡 Insight: Closest match is ${formatPKR(Math.abs(bestDifference))} under the target.`;
//         }
//       } else {
//         manualAnalysis += `💡 Insight: No combinations found. The missing amount might be composed of multiple smaller transactions or there may be data inconsistencies.`;
//       }

//       return manualAnalysis;
//     }
//   };

//   // 🔹 FIXED: Handle Excel upload with better empty cell handling
//   const handleFileUpload = (e) => {
//     const file = e.target.files[0];
//     if (!file) return;

//     const reader = new FileReader();
//     reader.onload = (event) => {
//       try {
//         const data = new Uint8Array(event.target.result);
//         const workbook = XLSX.read(data, { type: "array" });
//         const sheetName = workbook.SheetNames[0];
        
//         // Use sheet_to_json with header: "A" to preserve empty cells
//         const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
//           header: "A", // This preserves empty cells as undefined
//           defval: "", // Default value for empty cells
//         });

//         console.log("Raw Excel data:", sheetData);

//         // Convert Excel rows into objects with better empty cell handling
//         const parsedRows = sheetData
//           .filter((row, index) => {
//             // Skip empty rows and header row
//             if (index === 0) return false; // Skip header
//             if (!row || Object.keys(row).length === 0) return false; // Skip completely empty rows
            
//             // Check if row has at least one non-empty value in first 3 columns
//             const hasData = Object.values(row).slice(0, 3).some(cell => 
//               cell !== undefined && cell !== null && cell !== ''
//             );
//             return hasData;
//           })
//           .map((row, index) => {
//             // Handle different column structures
//             const date = row.A || row[0] || '';
//             const outstanding = Math.abs(Number(row.B || row[1] || 0));
//             const recovery = Math.abs(Number(row.C || row[2] || 0));

//             return {
//               id: index + 1,
//               date: date,
//               outstanding: outstanding,
//               recovery: recovery,
//             };
//           })
//           .filter(row => row.outstanding > 0 || row.recovery > 0); // Keep rows with either outstanding or recovery

//         console.log("Processed rows with empty cells handled:", parsedRows);
//         processData(parsedRows);
//       } catch (error) {
//         console.error("Error processing file:", error);
//         alert("Error processing Excel file. Please check the format.");
//       }
//     };

//     reader.readAsArrayBuffer(file);
//   };

//   // 🔹 Process rows with better validation
//   const processData = async (data) => {
//     setRows(data);
//     setLoading(true);
//     setAIExplanation("");

//     try {
//       const totalOutstanding = data.reduce((sum, r) => sum + (r.outstanding || 0), 0);
//       const totalRecovery = data.reduce((sum, r) => sum + (r.recovery || 0), 0);
//       const missing = totalOutstanding - totalRecovery;

//       console.log("Calculation:", { 
//         totalOutstanding, 
//         totalRecovery, 
//         missing, 
//         rowCount: data.length,
//         data 
//       });

//       setOverallMissing(missing);

//       let combos = [];

//       if (missing > 0) { // Only look for combinations if missing amount is positive
//         console.log("Looking for combinations for missing amount:", missing);
        
//         // First try to find exact combinations
//         combos = findCombinations(data, missing);
//         console.log("Exact combinations found:", combos);
        
//         // If no exact matches, find closest
//         if (combos.length === 0) {
//           console.log("No exact matches, looking for closest...");
//           const closest = findClosestCombination(data, missing);
//           if (closest) {
//             combos = [closest];
//             console.log("Closest combination:", closest);
//           }
//         }

//         // Generate AI explanation if we have combinations
//         if (combos.length > 0) {
//           const prompt = generateAIExplanationPrompt(combos, missing, "english");
//           console.log("AI Explanation Prompt:\n", prompt);

//           const aiResponse = await getAIResponse(prompt, combos, missing);
//           setAIExplanation(aiResponse);
//         } else {
//           // No combinations found
//           setAIExplanation(`📊 Analysis Complete\n\nNo matching combinations found for the missing amount of ${formatPKR(missing)}.\n\nPossible reasons:\n• The missing amount might be spread across multiple smaller transactions\n• There could be data entry issues\n• No single transaction matches the missing amount exactly\n\nTotal Outstanding: ${formatPKR(totalOutstanding)}\nTotal Recovery: ${formatPKR(totalRecovery)}\nDifference: ${formatPKR(missing)}`);
//         }
//       } else if (missing < 0) {
//         // Recovery exceeds outstanding
//         setAIExplanation(`⚠️ Data Anomaly\n\nRecovery amount (${formatPKR(totalRecovery)}) exceeds outstanding amount (${formatPKR(totalOutstanding)}) by ${formatPKR(Math.abs(missing))}.\n\nThis could indicate:\n• Overpayment\n• Data entry errors\n• Advance payments included`);
//       } else {
//         // Perfect match
//         setAIExplanation(`✅ Perfect Match!\n\nNo missing amount detected. All outstanding amounts are perfectly accounted for.\n\nTotal Outstanding: ${formatPKR(totalOutstanding)}\nTotal Recovery: ${formatPKR(totalRecovery)}\nDifference: ${formatPKR(missing)}`);
//       }

//       setMatches(combos);

//     } catch (error) {
//       console.error("Error processing data:", error);
//       alert("Error analyzing data. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Check if API key is configured
//   const isApiKeyConfigured = () => {
//     const apiKey = getApiKey();
//     return !!apiKey;
//   };

//   return (
//     <div className="p-6 max-w-xl mx-auto">
//       <h2 className="text-2xl font-bold mb-4">Missing Amount Analyzer</h2>

//       {/* 🔹 API Key Status */}
//       {!isApiKeyConfigured() && (
//         <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
//           <p className="text-red-800 text-sm">
//             <strong>⚠️ API Key Missing:</strong> Add your Gemini API key to <code>.env</code> as <code>VITE_GEMINI_API_KEY=your_key</code>
//           </p>
//         </div>
//       )}

//       {/* 🔹 Excel Upload */}
//       <div className="mb-4">
//         <input
//           type="file"
//           accept=".xlsx,.xls"
//           onChange={handleFileUpload}
//           className="file-input file-input-bordered file-input-primary w-full"
//           disabled={loading}
//         />
//         <p className="text-sm text-gray-600 mt-2">
//           Expected Excel format: Date | Outstanding Amount | Recovery Amount (empty cells are now handled)
//         </p>
//       </div>

//       {/* 🔹 Loading Indicator */}
//       {loading && (
//         <div className="text-center py-4">
//           <div className="loading loading-spinner loading-lg"></div>
//           <p className="mt-2 text-gray-600">Analyzing data...</p>
//         </div>
//       )}

//       {/* 🔹 Data Summary */}
//       {!loading && rows.length > 0 && (
//         <div className="bg-gray-50 p-4 rounded mb-4">
//           <h3 className="font-semibold mb-2">Data Summary</h3>
//           <p>Records Loaded: {rows.length}</p>
//           <p>Total Outstanding: {formatPKR(rows.reduce((sum, r) => sum + (r.outstanding || 0), 0))}</p>
//           <p>Total Recovery: {formatPKR(rows.reduce((sum, r) => sum + (r.recovery || 0), 0))}</p>
//         </div>
//       )}

//       {/* 🔹 Show overall missing */}
//       {!loading && overallMissing !== 0 && (
//         <div className="bg-white shadow p-4 rounded mb-6">
//           <p className="mb-2">
//             <strong>Missing Amount to Find:</strong>{" "}
//             <span className="text-red-600 font-bold text-lg">{formatPKR(overallMissing)}</span>
//           </p>
//         </div>
//       )}

//       {/* 🔹 Show matches */}
//       {!loading && matches.length > 0 && (
//         <div className="space-y-4 mb-6">
//           <h3 className="font-semibold text-lg">Found Combinations:</h3>
//           {matches.map((combo, idx) => (
//             <div key={idx} className="border rounded bg-white shadow-sm">
//               <div className="p-4 border-b">
//                 <p className="font-bold">
//                   Option {idx + 1} → Total: {formatPKR(combo.sum)}
//                   {combo.sum !== overallMissing && (
//                     <span className={`ml-2 text-sm ${combo.sum > overallMissing ? 'text-orange-600' : 'text-blue-600'}`}>
//                       ({formatPKR(combo.sum - overallMissing)} {combo.sum > overallMissing ? 'over' : 'under'})
//                     </span>
//                   )}
//                 </p>
//               </div>
//               <div className="p-4">
//                 {combo.rows.map((r, i) => (
//                   <div
//                     key={i}
//                     className="flex justify-between items-center py-1"
//                   >
//                     <span className="font-medium">{formatDate(r.date)}</span>
//                     <span className="bg-blue-50 px-2 py-1 rounded">
//                       {formatPKR(r.outstanding)}
//                     </span>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           ))}
//         </div>
//       )}

//       {/* 🔹 AI Explanation */}
//       {!loading && aiExplanation && (
//         <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
//           <h3 className="font-semibold mb-2 text-blue-800">
//             📊 Analysis Results
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

  // 🔹 FIXED: Handle Excel upload with better empty cell handling
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        
        // Use sheet_to_json with header: "A" to preserve empty cells
        const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
          header: "A", // This preserves empty cells as undefined
          defval: "", // Default value for empty cells
        });

        console.log("Raw Excel data:", sheetData);

        // Convert Excel rows into objects with better empty cell handling
        const parsedRows = sheetData
          .filter((row, index) => {
            // Skip empty rows and header row
            if (index === 0) return false; // Skip header
            if (!row || Object.keys(row).length === 0) return false; // Skip completely empty rows
            
            // Check if row has at least one non-empty value in first 3 columns
            const hasData = Object.values(row).slice(0, 3).some(cell => 
              cell !== undefined && cell !== null && cell !== ''
            );
            return hasData;
          })
          .map((row, index) => {
            // Handle different column structures
            const date = row.A || row[0] || '';
            const outstanding = Math.abs(Number(row.B || row[1] || 0));
            const recovery = Math.abs(Number(row.C || row[2] || 0));

            return {
              id: index + 1,
              date: date,
              outstanding: outstanding,
              recovery: recovery,
            };
          })
          .filter(row => row.outstanding > 0 || row.recovery > 0); // Keep rows with either outstanding or recovery

        console.log("Processed rows with empty cells handled:", parsedRows);
        processData(parsedRows);
      } catch (error) {
        console.error("Error processing file:", error);
        alert("Error processing Excel file. Please check the format.");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // 🔹 FIXED: Process rows to handle both positive and negative missing amounts
  const processData = async (data) => {
    setRows(data);
    setLoading(true);
    setAIExplanation("");

    try {
      const totalOutstanding = data.reduce((sum, r) => sum + (r.outstanding || 0), 0);
      const totalRecovery = data.reduce((sum, r) => sum + (r.recovery || 0), 0);
      const missing = totalOutstanding - totalRecovery;

      console.log("Calculation:", { 
        totalOutstanding, 
        totalRecovery, 
        missing, 
        rowCount: data.length,
        data 
      });

      setOverallMissing(missing);

      let combos = [];

      // FIXED: Look for combinations for both positive AND negative missing amounts
      if (Math.abs(missing) > 0.01) { // Only look if there's a significant difference
        console.log("Looking for combinations for amount:", missing);
        
        // Use absolute value for combination finding, but track the original sign
        const targetAmount = Math.abs(missing);
        
        // First try to find exact combinations
        combos = findCombinations(data, targetAmount);
        console.log("Exact combinations found:", combos);
        
        // If no exact matches, find closest
        if (combos.length === 0) {
          console.log("No exact matches, looking for closest...");
          const closest = findClosestCombination(data, targetAmount);
          if (closest) {
            combos = [closest];
            console.log("Closest combination:", closest);
          }
        }

        // Generate AI explanation if we have combinations
        if (combos.length > 0) {
          const prompt = generateAIExplanationPrompt(combos, targetAmount, "english");
          console.log("AI Explanation Prompt:\n", prompt);

          const aiResponse = await getAIResponse(prompt, combos, missing);
          setAIExplanation(aiResponse);
        } else {
          // No combinations found - provide appropriate message based on sign
          if (missing > 0) {
            setAIExplanation(`📊 Analysis Complete\n\nNo matching combinations found for the missing amount of ${formatPKR(missing)}.\n\nPossible reasons:\n• The missing amount might be spread across multiple smaller transactions\n• There could be data entry issues\n• No single transaction matches the missing amount exactly\n\nTotal Outstanding: ${formatPKR(totalOutstanding)}\nTotal Recovery: ${formatPKR(totalRecovery)}\nDifference: ${formatPKR(missing)}`);
          } else {
            setAIExplanation(`📊 Analysis Complete\n\nNo matching combinations found that explain the over-recovery of ${formatPKR(Math.abs(missing))}.\n\nPossible reasons:\n• The over-recovery might be spread across multiple smaller transactions\n• There could be data entry errors\n• Advance payments may have been recorded\n\nTotal Outstanding: ${formatPKR(totalOutstanding)}\nTotal Recovery: ${formatPKR(totalRecovery)}\nOver-Recovery: ${formatPKR(Math.abs(missing))}`);
          }
        }
      } else {
        // Perfect match (difference is negligible)
        setAIExplanation(`✅ Perfect Match!\n\nNo significant difference detected. All amounts are properly accounted for.\n\nTotal Outstanding: ${formatPKR(totalOutstanding)}\nTotal Recovery: ${formatPKR(totalRecovery)}\nDifference: ${formatPKR(missing)}`);
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
      <h2 className="text-2xl font-bold mb-4">Financial Amount Analyzer</h2>

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
        <p className="text-sm text-gray-600 mt-2">
          Choose an Excel file with columns: <strong>Date</strong> | <strong>Outstanding Amount</strong> | <strong>Recovery Amount</strong>. 
        </p>
        
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
          <p>Total Outstanding: {formatPKR(rows.reduce((sum, r) => sum + (r.outstanding || 0), 0))}</p>
          <p>Total Recovery: {formatPKR(rows.reduce((sum, r) => sum + (r.recovery || 0), 0))}</p>
        </div>
      )}

      {/* 🔹 Show overall difference */}
      {!loading && Math.abs(overallMissing) > 0.01 && (
        <div className="bg-white shadow p-4 rounded mb-6">
          <p className="mb-2">
            <strong>
              {overallMissing > 0 ? "Missing Amount to Find:" : "Over-Recovery Amount:"}
            </strong>{" "}
            <span className={`font-bold text-lg ${
              overallMissing > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {formatPKR(Math.abs(overallMissing))}
              {overallMissing < 0 && " (Over-Recovery)"}
            </span>
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
                  {Math.abs(combo.sum - Math.abs(overallMissing)) > 0.01 && (
                    <span className={`ml-2 text-sm ${
                      combo.sum > Math.abs(overallMissing) ? 'text-orange-600' : 'text-blue-600'
                    }`}>
                      ({formatPKR(combo.sum - Math.abs(overallMissing))} {
                        combo.sum > Math.abs(overallMissing) ? 'over' : 'under'
                      })
                    </span>
                  )}
                </p>
                {overallMissing < 0 && (
                  <p className="text-sm text-green-600 mt-1">
                    💡 This combination explains the over-recovery amount
                  </p>
                )}
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