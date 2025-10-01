// export function findCombinations(rows, target) {
//   const results = [];


  

//   function backtrack(start, subset, sum) {
//     if (sum === target && subset.length > 0) {
//       results.push({ rows: [...subset], sum });
//       return;
//     }


//     if (sum > target) return;

//     for (let i = start; i < rows.length; i++) {
//       backtrack(i + 1, [...subset, rows[i]], sum + rows[i].outstanding);
//     }
//   }

//   backtrack(0, [], 0);
//   return results;
// }

// export function formatUSD(value) {
//   return new Intl.NumberFormat("en-US", {
//     style: "currency",
//     currency: "USD",
//   }).format(value || 0);
// }







// utils.js

/**
 * Finds all combinations of rows where outstanding sum matches target.
 * @param {Array} rows - Array of row objects [{ date, outstanding }]
 * @param {Number} target - Target sum to match
 * @returns {Array} Array of combinations with rows + sum
 */
export function findCombinations(rows, target) {
  const results = new Set(); // avoid duplicate combos
  const final = [];

  function backtrack(start, subset, sum) {
    if (sum === target && subset.length > 0) {
      // Unique key to avoid duplicates
      const key = subset.map(r => r.date).join("-");
      if (!results.has(key)) {
        results.add(key);
        final.push({ rows: [...subset], sum });
      }
      return;
    }

    if (sum > target) return;

    for (let i = start; i < rows.length; i++) {
      backtrack(i + 1, [...subset, rows[i]], sum + rows[i].outstanding);
    }
  }

  backtrack(0, [], 0);
  return final;
}

/**
 * Format number to USD
 */
export function formatUSD(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value || 0);
}

/**
 * Convert Excel serial date or normal date → DD-MM-YYYY
 */
export function formatDate(date) {
  if (!date) return "";

  // Excel serial date
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
