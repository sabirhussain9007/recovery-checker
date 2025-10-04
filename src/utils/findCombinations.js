


// // utils/findCombinations.js

// /**
//  * Finds all combinations of rows where outstanding sum matches target.
//  * @param {Array} rows - Array of row objects [{ date, outstanding }]
//  * @param {Number} target - Target sum to match
//  * @returns {Array} Array of combinations with rows + sum
//  */

// export function findCombinations(rows, target) {
//   const results = new Set(); // avoid duplicate combos
//   const final = [];

//   function backtrack(start, subset, sum) {
//     if (sum === target && subset.length > 0) {
//       // Unique key to avoid duplicates
//       const key = subset.map(r => r.date).join("-");
//       if (!results.has(key)) {
//         results.add(key);
//         final.push({ rows: [...subset], sum });
//       }
//       return;
//     }

//     if (sum > target) return;

//     for (let i = start; i < rows.length; i++) {
//       backtrack(i + 1, [...subset, rows[i]], sum + rows[i].outstanding);
//     }
//   }

//   backtrack(0, [], 0);
//   return final;
// }



// /**
//  * Generates an AI prompt to explain findings in plain language
//  * @param {Array} combos
//  * @param {Number} target
//  * @param {String} language - "english" or "urdu"
//  */
// export function generateAIExplanationPrompt(combos, target, language = "english") {
//   const summary = summarizeCombinations(combos).join("\n");

//   const instruction =
//     language === "urdu"
//       ? "براہ کرم نتیجہ سادہ اردو میں عام فہم انداز میں بیان کریں۔"
//       : "Explain the result in simple English so a non-technical person can understand it.";

//   return `
// You are a financial assistant.
// Target Amount: ${formatPKR(target)}

// Combinations found:
// ${summary}

// ${instruction}
// Summarize:
// - How many combinations were found.
// - Which one best matches the target.
// - Any key insight or pattern in data.

// `;
// }

// /**
//  * Summarizes combinations for display or AI prompt.
//  * @param {Array} combos
//  * @returns {Array} Array of summary strings
//  */
// function summarizeCombinations(combos) {
//   if (!combos || combos.length === 0) return ["No combinations found."];
//   return combos.map((combo, idx) => {
//     const dates = combo.rows.map(r => r.date).join(", ");
//     return `#${idx + 1}: Dates [${dates}] → Total: ${formatPKR(combo.sum)}`;
//   });

// }









// /**
//  * Finds the closest combination (if no exact match found).
//  */
// export function findClosestCombination(rows, target) {
//   let best = null;
//   let minDiff = Infinity;

//   function backtrack(start, subset, sum) {
//     const diff = Math.abs(target - sum);
//     if (diff < minDiff && subset.length > 0) {
//       minDiff = diff;
//       best = { rows: [...subset], sum };
//     }
//     if (sum >= target) return;

//     for (let i = start; i < rows.length; i++) {
//       backtrack(i + 1, [...subset, rows[i]], sum + rows[i].outstanding);
//     }
//   }

//   backtrack(0, [], 0);
//   return best;
// }








// /**
//  * Format number to USD
//  */
// export function formatPKR(value) {
//   return new Intl.NumberFormat("en-PK", {
//     style: "currency",
//     currency: "PKR",
//     minimumFractionDigits: 0, // PKR usually doesn't use cents
//   }).format(value || 0);
// }

// /**
//  * Convert Excel serial date or normal date → DD-MM-YYYY
//  */
// export function formatDate(date) {
//   if (!date) return "";

//   // Excel serial date
//   if (!isNaN(date)) {
//     const base = new Date(1900, 0, 1);
//     const d = new Date(base.getTime() + (date - 2) * 86400000);
//     return toDDMMYYYY(d);
//   }

//   const d = new Date(date);
//   if (isNaN(d)) return date;
//   return toDDMMYYYY(d);
// }

// function toDDMMYYYY(d) {
//   const day = String(d.getDate()).padStart(2, "0");
//   const month = String(d.getMonth() + 1).padStart(2, "0");
//   const year = d.getFullYear();
//   return `${day}-${month}-${year}`;
// }






/**
 * Finds all combinations of rows where outstanding sum matches target.
 * If target is negative, it looks for combinations summing near that negative value.
 */
export function findCombinations(rows, target, tolerance = 0) {
  const results = new Set();
  const final = [];

  function backtrack(start, subset, sum) {
    if (Math.abs(sum - target) <= tolerance && subset.length > 0) {
      const key = subset.map(r => r.date || r.month).join("-");
      if (!results.has(key)) {
        results.add(key);
        final.push({ rows: [...subset], sum });
      }
    }

    if (sum > target + Math.abs(target) * 2) return; // pruning

    for (let i = start; i < rows.length; i++) {
      backtrack(i + 1, [...subset, rows[i]], sum + rows[i].outstanding);
    }
  }

  backtrack(0, [], 0);
  return final;
}

/** Find the closest combination if no exact match found */
export function findClosestCombination(rows, target) {
  let best = null;
  let minDiff = Infinity;

  function backtrack(start, subset, sum) {
    const diff = Math.abs(target - sum);
    if (diff < minDiff && subset.length > 0) {
      minDiff = diff;
      best = { rows: [...subset], sum };
    }

    for (let i = start; i < rows.length; i++) {
      backtrack(i + 1, [...subset, rows[i]], sum + rows[i].outstanding);
    }
  }

  backtrack(0, [], 0);
  return best;
}

/** Group by month */
export function groupByMonth(rows) {
  const map = new Map();

  rows.forEach(r => {
    const d = new Date(r.date);
    if (isNaN(d)) return;

    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map.has(key))
      map.set(key, { month: key, outstanding: 0, recovery: 0 });

    const entry = map.get(key);
    entry.outstanding += Number(r.outstanding) || 0;
    entry.recovery += Number(r.recovery) || 0;
  });

  return Array.from(map.values()).map(m => ({
    ...m,
    outstanding: m.outstanding,
    recovery: m.recovery,
    diff: m.outstanding - m.recovery,
  }));
}

/** PKR format helper */
export function formatPKR(value) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
  }).format(value || 0);
}

/** Format date from Excel or string */
export function formatDate(date) {
  if (!date) return "";
  if (!isNaN(date)) {
    const base = new Date(1900, 0, 1);
    const d = new Date(base.getTime() + (date - 2) * 86400000);
    return toDDMMYYYY(d);
  }
  const d = new Date(date);
  if (isNaN(d)) return date;
  return toDDMMYYYY(d);
}

function toDDMMYYYY(d) {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}





