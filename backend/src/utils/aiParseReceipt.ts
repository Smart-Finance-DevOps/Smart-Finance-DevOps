export async function aiParseReceipt(text: string): Promise<{
  amount: number | null;
  description: string;
  category: string;
  date: string | null;
}> {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // --- Amount: look for TOTAL line first, then largest number ---
  let amount: number | null = null;

  // Priority 1: explicit TOTAL line
  const totalLine = lines.find((l) =>
    /^(grand\s*)?total(\s*amount)?[\s:$₹ugx,.]*([\d,]+\.?\d{0,2})/i.test(l)
  );
  if (totalLine) {
    const match = totalLine.match(/([\d,]+\.?\d{0,2})\s*$/);
    if (match) {
      amount = parseFloat(match[1].replace(/,/g, ""));
    }
  }

  // Priority 2: scan all lines for currency amounts, pick largest
  if (!amount) {
    let maxAmount = 0;
    for (const line of lines) {
      const matches = line.match(/[\d,]+\.\d{2}/g);
      if (matches) {
        for (const m of matches) {
          const num = parseFloat(m.replace(/,/g, ""));
          if (num > maxAmount && num < 100000) {
            maxAmount = num;
            amount = num;
          }
        }
      }
    }
  }

  // --- Date ---
  let date: string | null = null;
  const datePatterns = [
    /(\d{4}[-\/]\d{2}[-\/]\d{2})/,
    /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/,
    /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2})\b/,
    /(\d{1,2}[\s]+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s]+\d{4})/i,
  ];
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      const raw = match[1];
      const parts = raw.split(/[-\/\s]/);
      try {
        if (parts[0].length === 4) {
          date = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
        } else if (parts[2]?.length === 4) {
          date = `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
        } else if (parts[2]?.length === 2) {
          date = `20${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
        }
      } catch {}
      if (date) break;
    }
  }

  // --- Description: first meaningful line ---
  const skipWords = /^(date|time|till|tin|tax|total|subtotal|cash|change|thank|have|receipt|invoice|item|qty|price|amount|tel|ph|fax|www|http)/i;
  const description = lines.find((l) => l.length > 2 && !skipWords.test(l)) || "Receipt";

  // --- Category ---
  const lower = text.toLowerCase();
  let category = "Others";
  if (/(restaurant|cafe|food|pizza|burger|meal|dinner|lunch|breakfast|swiggy|zomato|domino|biryani|coffee|bakery)/.test(lower)) {
    category = "Food";
  } else if (/(uber|ola|rapido|cab|taxi|flight|train|bus|metro|travel|hotel|irctc|makemytrip|airways)/.test(lower)) {
    category = "Travel";
  } else if (/(electricity|electric|water|gas|wifi|internet|broadband|recharge|bill|airtel|jio|bsnl|postpaid|prepaid)/.test(lower)) {
    category = "Bills";
  } else if (/(grocery|groceries|supermarket|big bazaar|dmart|reliance fresh|vegetable|fruit|milk|supermarkets|produce)/.test(lower)) {
    category = "Groceries";
  } else if (/(amazon|flipkart|myntra|walmart|shop|store|mall|purchase|retail|market)/.test(lower)) {
    category = "Shopping";
  }

  return { amount, description, category, date };
}