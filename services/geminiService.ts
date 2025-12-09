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
  
  // Robust Fetching Strategy
  // Timeout increased to 10s to allow slower proxies to respond (fixing "All proxies failed").
  const fetchStrategies = [
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
      name: "ThingProxy",
      url: (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
      extractor: async (res: Response) => await res.text()
    },
    {
      name: "AllOrigins",
      url: (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
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
      // Timeout increased to 10000ms (10s) to allow proxies enough time
      const timeoutId = setTimeout(() => controller.abort(), 10000); 
      
      const response = await fetch(proxyUrl, { 
          signal: controller.signal,
          headers: {
            'X-Requested-With': 'XMLHttpRequest' 
          }
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const content = await strategy.extractor(response);
      
      // Basic validation
      if (content && typeof content === 'string' && (content.includes("Currency") || content.includes("USD") || content.includes("美金") || content.includes("Download CSV"))) {
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
    throw new Error(`無法連線至台灣銀行官網。已嘗試所有線路均無回應 (Jina, CodeTabs, ThingProxy, AllOrigins)。請稍後再試。`);
  }

  // Optimized Table Extraction
  let processingText = contentData;
  
  if (successfulStrategy !== "Jina AI Reader") {
      const tableMarkers = ['<table title="牌告匯率"', '<table title="Exchange Rate"', '<table'];
      
      let tableStart = -1;
      for (const marker of tableMarkers) {
          tableStart = contentData.indexOf(marker);
          if (tableStart !== -1) break;
      }

      if (tableStart !== -1) {
          processingText = contentData.substring(tableStart);
      }
  }

  // Prompt: Minimized for speed
  const prompt = `
    Task: Extract exchange rates from text to JSON.
    Source: ${processingText.substring(0, 150000)} 
    
    Rules:
    1. Output strictly a JSON Array. No markdown formatting.
    2. Fields: currency(code), cashBuy, cashSell, spotBuy, spotSell. Use null for "-".
    3. Add 'currencyName' in Traditional Chinese (USD->美金, etc).
    4. Target: USD, HKD, GBP, AUD, CAD, SGD, CHF, JPY, ZAR, SEK, NZD, THB, PHP, IDR, EUR, KRW, VND, MYR, CNY.
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
    const rawData = JSON.parse(cleanedText);
      
    if (!Array.isArray(rawData) || rawData.length === 0) {
      throw new Error("解析出的資料格式錯誤或為空");
    }

    // Strict Type Conversion
    // Ensures all numbers are actually numbers, preventing UI crashes.
    const data: ExchangeRate[] = rawData.map((item: any) => {
        const toNum = (val: any) => {
            if (val === null || val === undefined || val === "-") return null;
            // First, try to convert to number directly
            const num = Number(val);
            // Check if result is a valid number
            return isNaN(num) ? null : num;
        };

        return {
            currency: String(item.currency || ""),
            currencyName: String(item.currencyName || ""),
            cashBuy: toNum(item.cashBuy),
            cashSell: toNum(item.cashSell),
            spotBuy: toNum(item.spotBuy),
            spotSell: toNum(item.spotSell),
        };
    });

    return data.map(item => {
         // Fix swapped buy/sell logic if necessary (Buying should be < Selling)
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