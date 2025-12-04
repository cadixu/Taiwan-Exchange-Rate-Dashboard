import { GoogleGenAI } from "@google/genai";
import { ExchangeRate } from "../types";

// Helper to clean JSON string more aggressively
const cleanJsonString = (str: string): string => {
  let cleaned = str.replace(/```json/gi, '').replace(/```/g, '');
  const startIndex = cleaned.indexOf('[');
  const endIndex = cleaned.lastIndexOf(']');
  
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    return cleaned.substring(startIndex, endIndex + 1);
  }
  return cleaned.trim();
};

export const fetchRatesFromGemini = async (): Promise<ExchangeRate[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY is missing from environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const targetUrl = "https://rate.bot.com.tw/xrt?Lang=en-US";
  
  // Robust Fetching Strategy: Use multiple CORS proxies with fallback
  // CHANGED: Reordered priorities. AllOrigins is currently blocked by CORS on GitHub Pages.
  // CorsProxy.io and Jina are more reliable alternatives.
  const fetchStrategies = [
    {
      name: "CorsProxy.io",
      url: (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
      extractor: async (res: Response) => await res.text()
    },
    {
      name: "Jina AI Reader",
      url: (url: string) => `https://r.jina.ai/${url}`,
      extractor: async (res: Response) => await res.text()
    },
    {
      name: "CodeTabs",
      url: (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
      extractor: async (res: Response) => await res.text()
    },
    {
      name: "AllOrigins (Raw)",
      url: (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}&timestamp=${Date.now()}`,
      extractor: async (res: Response) => await res.text()
    }
  ];

  let contentData = "";
  let lastError = null;
  let successfulStrategy = "";

  for (const strategy of fetchStrategies) {
    try {
      console.log(`Attempting fetch via ${strategy.name}...`);
      const proxyUrl = strategy.url(targetUrl);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased timeout to 15s
      
      const response = await fetch(proxyUrl, { 
          signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const content = await strategy.extractor(response);
      
      // Basic validation to check if we got the rate page
      if (content && typeof content === 'string' && (content.includes("Currency") || content.includes("USD") || content.includes("美金"))) {
        contentData = content;
        successfulStrategy = strategy.name;
        console.log(`Successfully fetched via ${strategy.name}`);
        break; 
      } else {
        throw new Error("Fetched content does not contain valid currency data");
      }
    } catch (e: any) {
      console.warn(`Fetch failed with ${strategy.name}:`, e.message);
      lastError = e;
    }
  }

  if (!contentData) {
    console.error("All proxies failed. Last error:", lastError);
    throw new Error(`無法連線至台灣銀行官網。已嘗試多組線路均無回應，請檢查您的網路連線或稍後再試。(Last Error: ${lastError?.message})`);
  }

  // Optimized Table Extraction to prevent truncation of currencies at the bottom
  let processingText = contentData;
  if (successfulStrategy !== "Jina AI Reader") {
      // Try to find the specific exchange rate table to reduce token usage and avoid header/footer noise
      const tableMarkers = ['<table title="牌告匯率"', '<table title="Exchange Rate"', '<table'];
      
      let tableStart = -1;
      for (const marker of tableMarkers) {
          tableStart = contentData.indexOf(marker);
          if (tableStart !== -1) break;
      }

      if (tableStart !== -1) {
          // Find the closing of this specific table
          // We look for the closing </table> tag that matches the nesting level, but for simplicity, 
          // taking a large chunk from the start of the table is usually safer than regex for raw HTML.
          // We truncate to 300,000 chars starting from the table, which covers all known currencies.
          processingText = contentData.substring(tableStart);
      }
  }

  // Prompt: Parse the Text (HTML or Markdown)
  // Note: Limit increased to 300,000 to ensure ZAR, SEK, CNY, etc. are included.
  const prompt = `
    Role: Data Extractor
    Task: Extract exchange rate data from the provided text (which is either raw HTML or Markdown table) into a strict JSON array.
    
    Source Content (Truncated):
    ${processingText.substring(0, 300000)} 

    Requirements:
    1. Extract fields: currency (code), cashBuy, cashSell, spotBuy, spotSell.
    2. Handle missing values: If a cell has "-" or is empty, use null.
    3. Currency Name: Map the currency code to Traditional Chinese (e.g., USD -> 美金, JPY -> 日圓, EUR -> 歐元, GBP -> 英鎊, AUD -> 澳幣).
    4. **IMPORTANT**: Scan the ENTIRE text. Do not stop after the first few currencies. Look for ZAR, SEK, SGD, CHF, NZD, THB, PHP, IDR, KRW, VND, MYR, CNY.
    5. **Validation**: Ensure 'Buying' rates are generally lower than 'Selling' rates. 
    
    Output JSON Format:
    [
      {
        "currency": "USD",
        "currencyName": "美金",
        "cashBuy": 32.1,
        "cashSell": 32.6,
        "spotBuy": 32.2,
        "spotSell": 32.5
      }
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.1,
        responseMimeType: "application/json"
      },
    });

    const text = response.text;
    if (!text) throw new Error("AI 解析回傳為空");

    const cleanedText = cleanJsonString(text);
    const data: ExchangeRate[] = JSON.parse(cleanedText);
      
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("解析出的資料格式錯誤或為空");
    }

    return data.map(item => {
         const fix = (buy: number | null, sell: number | null) => {
             if (buy !== null && sell !== null && buy > sell) return { b: sell, s: buy };
             return { b: buy, s: sell };
         };
         
         const cash = fix(item.cashBuy, item.cashSell);
         const spot = fix(item.spotBuy, item.spotSell);

         return {
             ...item,
             cashBuy: cash.b,
             cashSell: cash.s,
             spotBuy: spot.b,
             spotSell: spot.s
         };
    });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(`資料處理失敗: ${error.message}`);
  }
};