




// utils/findCombinations.js



/**
 * Finds all combinations of rows where outstanding sum matches target.
 * Fixed logic to only consider relevant amounts
 */
export function findCombinations(rows, target) {
  // Filter out rows with outstanding <= 0 and only consider rows where outstanding <= target
  const validRows = rows.filter(row => row.outstanding > 0 && row.outstanding <= target);
  
  const results = new Set();
  const final = [];

  function backtrack(start, subset, sum) {
    // Check if we've found a combination that matches the target
    if (Math.abs(sum - target) < 0.01 && subset.length > 0) { // Allow small floating point differences
      const key = subset.map(r => r.date).sort().join("-");
      if (!results.has(key)) {
        results.add(key);
        final.push({ rows: [...subset], sum });
      }
      return;
    }

    // Stop if sum exceeds target
    if (sum > target) return;

    for (let i = start; i < validRows.length; i++) {
      const currentRow = validRows[i];
      // Only add if it doesn't exceed target
      if (sum + currentRow.outstanding <= target + 0.01) {
        backtrack(i + 1, [...subset, currentRow], sum + currentRow.outstanding);
      }
    }
  }

  backtrack(0, [], 0);
  return final;
}

/**
 * Finds the closest combination (if no exact match found).
 * Fixed to find realistic closest matches
 */
export function findClosestCombination(rows, target) {
  // Only consider rows with outstanding amounts that could realistically match
  const validRows = rows.filter(row => row.outstanding > 0);
  
  let bestCombo = null;
  let bestDiff = Infinity;

  function backtrack(start, subset, sum) {
    const currentDiff = Math.abs(sum - target);
    
    // Only consider combinations that make sense (not way over target)
    if (currentDiff < bestDiff && subset.length > 0 && sum <= target * 2) {
      bestDiff = currentDiff;
      bestCombo = { rows: [...subset], sum };
    }

    if (sum > target * 2) return; // Don't consider combinations way over target

    for (let i = start; i < validRows.length; i++) {
      backtrack(i + 1, [...subset, validRows[i]], sum + validRows[i].outstanding);
    }
  }

  backtrack(0, [], 0);
  return bestCombo;
}

// ... rest of your existing functions remain the same ...







// ... keep the rest of your existing functions (formatPKR, formatDate, etc.) ...
/**
 * Format number to PKR
 */
export function formatPKR(value) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0, // PKR usually doesn't use cents
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

/**
 * Summarizes combinations for display or AI prompt.
 * @param {Array} combos
 * @returns {Array} Array of summary strings
 */
function summarizeCombinations(combos) {
  if (!combos || combos.length === 0) return ["No combinations found."];
  return combos.map((combo, idx) => {
    const dates = combo.rows.map(r => formatDate(r.date)).join(", ");
    return `#${idx + 1}: Dates [${dates}] → Total: ${formatPKR(combo.sum)}`;
  });
}

/**
 * Finds the best matching combination
 */
function findBestMatch(combos, target) {
  if (!combos || combos.length === 0) return null;
  
  return combos.reduce((best, current) => {
    const currentDiff = Math.abs(current.sum - target);
    const bestDiff = Math.abs(best.sum - target);
    return currentDiff < bestDiff ? current : best;
  }, combos[0]);
}

/**
 * Generates an AI prompt to explain findings in plain language
 * @param {Array} combos
 * @param {Number} target
 * @param {String} language - "english" or "urdu"
 */
export function generateAIExplanationPrompt(combos, target, language = "english") {
  const summary = summarizeCombinations(combos).join("\n");
  const bestMatch = findBestMatch(combos, target);

  const languageTemplates = {
    urdu: `
آپ ایک مالی معاون ہیں۔ میں آپ کو کچھ مالی ڈیٹا فراہم کر رہا ہوں اور چاہتا ہوں کہ آپ اسے انتہائی سادہ اور عام فہم اردو میں سمجھائیں۔

ہدف رقم: ${formatPKR(target)}
کل دریافت شدہ مجموعے: ${combos.length}

ڈیٹا کا خلاصہ:
${summary}

براہ کرم درج ذیل پوائنٹس پر روشنی ڈالیں:
• کل کتنے مجموعے ملے؟
• کون سا مجموعہ ہدف رقم کے سب سے قریب ہے اور کیوں؟
• کیا کوئی خاص پیٹرن یا رجحان نظر آتا ہے؟
• اگر کوئی بہترین میچ ہے تو اس کی کتنی کمی/زیادتی ہے؟
• کیا آپ کوئی سفارش کر سکتے ہیں؟

سادہ، باتچیت کے انداز میں جواب دیں جیسے آپ کسی دوست کو سمجھا رہے ہوں۔
`,

    english: `
You are a financial assistant. I'm providing you with financial data and want you to explain it in simple, conversational language that anyone can understand.

Target Amount: ${formatPKR(target)}
Total Combinations Found: ${combos.length}

Data Summary:
${summary}

Please highlight these key points:
• How many total combinations were discovered
• Which combination best matches the target and why
• Any interesting patterns or insights you notice in the data
• If there's a best match, how close is it (difference amount)
• Any recommendations you might have

Speak in a friendly, conversational tone as if explaining to a friend. Keep it practical and actionable.
`
  };

  return languageTemplates[language] || languageTemplates.english;
}






