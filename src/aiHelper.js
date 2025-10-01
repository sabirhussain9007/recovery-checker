import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function analyzeMissingData(missingData) {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `
//   You are an assistant that checks Excel financial data.
//   Given the following missing values (Outstanding / Recovery),
//   create a short React functional component using TailwindCSS
//   that lists these rows clearly for the user.




  You are an assistant that checks Excel financial data.
Given the following missing values (Outstanding / Recovery), generate a short React functional component using TailwindCSS.

Requirements:

The component must take a data prop (array of objects).

Only display rows where Outstanding or Recovery is missing.

Show data in a clean, professional layout (table or card).

Highlight missing values (e.g., red text, warning badge).

Keep the code short, functional, and ready to render in React.

Return only the React code (no explanations).


  Data: ${JSON.stringify(missingData)}
  `;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
