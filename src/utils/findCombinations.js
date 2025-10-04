


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





// utils/findCombinations.js

/**
 * Group raw rows by month (YYYY-MM) and return month aggregates with diff.
 * rows: [{ date, outstanding, recovery }]
 * returns: [{ month, outstanding, recovery, diff }]
 */
export function groupByMonth(rows) {
  const map = new Map();

  rows.forEach((r) => {
    const d = new Date(r.date);
    if (isNaN(d)) return;

    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, { month: key, outstanding: 0, recovery: 0 });

    const entry = map.get(key);
    entry.outstanding += Number(r.outstanding) || 0;
    entry.recovery += Number(r.recovery) || 0;
  });

  return Array.from(map.values()).map((m) => ({
    month: m.month,
    outstanding: m.outstanding,
    recovery: m.recovery,
    diff: m.outstanding - m.recovery,
  }));
}

/**
 * Ensure every row has a numeric diff = outstanding - recovery.
 * Works for daily rows and for grouped month rows.
 */
export function ensureDiff(rows) {
  return rows.map((r) => ({
    ...r,
    outstanding: Number(r.outstanding) || 0,
    recovery: Number(r.recovery) || 0,
    diff: Number(r.diff ?? (Number(r.outstanding || 0) - Number(r.recovery || 0))),
  }));
}

/**
 * Find all combinations of rows whose sum of `diff` is within tolerance of target.
 * Uses pruning (pos/neg suffix sums) to avoid exploring impossible branches.
 *
 * @param {Array} rows - array of objects with a numeric `diff` property
 * @param {Number} target - the value to match (can be negative)
 * @param {Number} tolerance - allowed absolute error from target (default 0)
 * @param {Number} maxResults - stop after this many matches (safety, default 1000)
 * @returns {Array} combos [{ rows: [originalRow,...], sum, diffFromTarget }]
 */
export function findCombinationsByDiff(rows, target, tolerance = 0, maxResults = 1000) {
  const items = ensureDiff(rows).map((r, idx) => ({ idx, row: r, value: Number(r.diff || 0) }));

  // Sort by absolute value descending for faster pruning
  items.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  const n = items.length;
  const posSuffix = new Array(n + 1).fill(0);
  const negSuffix = new Array(n + 1).fill(0);

  for (let i = n - 1; i >= 0; i--) {
    posSuffix[i] = posSuffix[i + 1] + Math.max(0, items[i].value);
    negSuffix[i] = negSuffix[i + 1] + Math.min(0, items[i].value);
  }

  const results = [];
  const seen = new Set();
  let stopped = false;

  function backtrack(i, subsetIdxs, sum) {
    if (stopped) return;

    // reachable range from here:
    const reachableMin = sum + negSuffix[i] || sum;
    const reachableMax = sum + posSuffix[i] || sum;

    // If the target is outside the reachable range (plus tolerance), prune
    if (i <= n && (target < (reachableMin - tolerance) || target > (reachableMax + tolerance))) {
      return;
    }

    // If current sum is within tolerance, record it (non-empty subset only)
    if (subsetIdxs.length > 0 && Math.abs(sum - target) <= tolerance) {
      const key = subsetIdxs.slice().sort((a, b) => a - b).join(",");
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          rows: subsetIdxs.map((ii) => items[ii].row),
          sum,
          diffFromTarget: Math.abs(sum - target),
        });
        if (results.length >= maxResults) stopped = true;
      }
    }

    if (i >= n) return;

    // include current
    subsetIdxs.push(i);
    backtrack(i + 1, subsetIdxs, sum + items[i].value);
    subsetIdxs.pop();

    // skip current
    backtrack(i + 1, subsetIdxs, sum);
  }

  backtrack(0, [], 0);

  // Sort results by closeness to target (and smaller combos first)
  results.sort((a, b) => a.diffFromTarget - b.diffFromTarget || a.rows.length - b.rows.length);

  return results;
}

/**
 * If no combos found within tolerance, this returns the single closest combination.
 * Uses a global bestDiff variable while exploring subsets with pruning.
 *
 * @param {Array} rows - array of objects with numeric `diff`
 * @param {Number} target
 * @returns {Object|null} { rows, sum, diffFromTarget } or null
 */
export function findClosestCombinationByDiff(rows, target) {
  const items = ensureDiff(rows).map((r) => ({ row: r, value: Number(r.diff || 0) }));
  items.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const n = items.length;
  const posSuffix = new Array(n + 1).fill(0);
  const negSuffix = new Array(n + 1).fill(0);

  for (let i = n - 1; i >= 0; i--) {
    posSuffix[i] = posSuffix[i + 1] + Math.max(0, items[i].value);
    negSuffix[i] = negSuffix[i + 1] + Math.min(0, items[i].value);
  }

  let best = null;
  let bestDiff = Infinity;

  function backtrack(i, subsetIdxs, sum) {
    // pruning: compute min possible distance to target from this branch
    const reachableMin = sum + negSuffix[i] || sum;
    const reachableMax = sum + posSuffix[i] || sum;

    const minPossibleDiff = Math.min(Math.abs(target - reachableMin), Math.abs(target - reachableMax));
    if (minPossibleDiff >= bestDiff) {
      // even best possible in this branch can't beat current best
      return;
    }

    const curDiff = Math.abs(sum - target);
    if (subsetIdxs.length > 0 && curDiff < bestDiff) {
      bestDiff = curDiff;
      best = {
        rows: subsetIdxs.map((ii) => items[ii].row),
        sum,
        diffFromTarget: curDiff,
      };
    }

    if (i >= n) return;

    // include
    subsetIdxs.push(i);
    backtrack(i + 1, subsetIdxs, sum + items[i].value);
    subsetIdxs.pop();

    // skip
    backtrack(i + 1, subsetIdxs, sum);
  }

  backtrack(0, [], 0);
  return best;
}

/** PKR formatter */
export function formatPKR(value) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
  }).format(value || 0);
}

/** Date formatter (Excel serial or ISO) -> DD-MM-YYYY */
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
