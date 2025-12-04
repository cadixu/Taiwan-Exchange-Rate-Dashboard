import React, { useState, useEffect, useCallback } from 'react';
import { fetchRatesFromGemini } from './services/geminiService';
import RateTable from './components/RateTable';
import { FetchState, CalculatedRate } from './types';

const App: React.FC = () => {
  const [state, setState] = useState<FetchState>({
    loading: false,
    error: null,
    data: [],
    lastUpdated: null,
  });

  // State to toggle Spot Rates visibility
  const [showSpot, setShowSpot] = useState(false);

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const rawRates = await fetchRatesFromGemini();
      
      // Calculate Mid-Rates
      const processedRates: CalculatedRate[] = rawRates.map(rate => {
        let cashMid: number | null = null;
        let spotMid: number | null = null;

        if (rate.cashBuy !== null && rate.cashSell !== null) {
          cashMid = (rate.cashBuy + rate.cashSell) / 2;
        }

        if (rate.spotBuy !== null && rate.spotSell !== null) {
          spotMid = (rate.spotBuy + rate.spotSell) / 2;
        }

        return {
          ...rate,
          cashMid,
          spotMid
        };
      });

      setState({
        loading: false,
        error: null,
        data: processedRates,
        lastUpdated: new Date()
      });
    } catch (err: any) {
      console.error(err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: err.message || "發生未知錯誤"
      }));
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (process.env.API_KEY) {
        fetchData();
    }
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-gray-100 pb-10 font-sans">
      {/* Header */}
      <header className="bg-gradient-to-r from-teal-900 to-emerald-800 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                台灣銀行即時匯率
              </h1>
              <p className="mt-1 text-emerald-200 text-xs sm:text-sm flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                來源：台灣銀行官網即時抓取
              </p>
            </div>
            
            <div className="w-full md:w-auto flex flex-row justify-between md:justify-end items-center gap-4">
                {/* Update Time */}
                <div className="text-xs sm:text-sm font-medium text-emerald-100">
                    {state.lastUpdated ? state.lastUpdated.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'} 更新
                </div>

                {/* Refresh Button */}
                <button
                    onClick={fetchData}
                    disabled={state.loading || !process.env.API_KEY}
                    className={`inline-flex items-center px-3 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-teal-900 bg-white hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95`}
                >
                    {state.loading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-1.5 h-4 w-4 text-teal-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            更新中
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            更新
                        </>
                    )}
                </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 mt-4 sm:mt-6">
        {/* Toggle Switch */}
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 mb-4 flex items-center justify-between">
            <span className="text-gray-700 font-bold text-sm sm:text-base">顯示即期匯率</span>
            <button 
                onClick={() => setShowSpot(!showSpot)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${showSpot ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
                <span className="sr-only">Toggle Spot Rates</span>
                <span
                    className={`${showSpot ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
            </button>
        </div>

        {/* API Key Warning */}
        {!process.env.API_KEY && (
             <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 shadow-md rounded-r-md">
             <div className="flex">
               <div className="flex-shrink-0">
                 <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                   <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                 </svg>
               </div>
               <div className="ml-3">
                 <p className="text-sm text-yellow-700">
                   找不到 API Key。請確認您的環境變數中已設定 <code>process.env.API_KEY</code>。
                 </p>
               </div>
             </div>
           </div>
        )}

        {/* Error State */}
        {state.error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 shadow-md rounded-r-md animate-pulse">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                   <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  {state.error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Info Banner */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4 shadow-sm rounded-r-md">
            <p className="text-xs sm:text-sm text-blue-800">
                本系統直接連線 <a href="https://rate.bot.com.tw/xrt?Lang=en-US" target="_blank" rel="noreferrer" className="underline font-bold hover:text-blue-900">台灣銀行官網</a> 取得 HTML 解析。
            </p>
        </div>

        {/* Main Content */}
        <div className="space-y-4">
            <RateTable rates={state.data} showSpot={showSpot} />
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-base font-bold text-gray-900 mb-1">💡 小知識：現金 vs 即期</h2>
                <ul className="list-disc pl-4 text-xs sm:text-sm text-gray-600 space-y-1">
                    <li><strong>現金匯率：</strong>您拿著新台幣現鈔去銀行櫃檯換外幣現鈔的價格。</li>
                    <li><strong>即期匯率：</strong>透過網銀或存摺進行換匯（看不到現鈔）的價格，通常比現金匯率優惠。</li>
                    <li><strong>中間價：</strong> (買入+賣出)/2，作為市場行情的參考中心點。</li>
                </ul>
            </div>
        </div>
      </main>
    </div>
  );
};

export default App;