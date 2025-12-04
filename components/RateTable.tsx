import React, { useMemo } from 'react';
import { CalculatedRate } from '../types';

interface RateTableProps {
  rates: CalculatedRate[];
  showSpot: boolean;
}

const formatNumber = (num: number | null) => {
  if (num === null) return '-';
  // Use toFixed(3) for mobile space saving? No, 4 is standard for forex.
  return num.toFixed(4);
};

const RateTable: React.FC<RateTableProps> = ({ rates, showSpot }) => {
  
  // Sort logic: CNY First, then major currencies
  const sortedRates = useMemo(() => {
    // CNY moved to index 0 as requested
    const priority = ['CNY', 'USD', 'JPY', 'EUR', 'HKD', 'AUD'];
    return [...rates].sort((a, b) => {
      const idxA = priority.indexOf(a.currency);
      const idxB = priority.indexOf(b.currency);
      // Both in priority list -> compare index
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      // Only A in priority -> A first
      if (idxA !== -1) return -1;
      // Only B in priority -> B first
      if (idxB !== -1) return 1;
      // Neither -> Alphabetical
      return a.currency.localeCompare(b.currency);
    });
  }, [rates]);

  if (rates.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 bg-white rounded-xl shadow border border-gray-100">
        目前沒有匯率資料。請點擊上方「更新」按鈕。
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white shadow-lg rounded-xl border border-gray-200">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th scope="col" className="px-3 py-3 sm:px-6 sm:py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-100 z-10 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                幣別
              </th>
              
              {/* Cash Section */}
              <th scope="col" className="px-2 py-3 sm:px-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider bg-blue-50/50 min-w-[70px]">
                現金<br/><span className="text-xxs text-gray-400">買入</span>
              </th>
              <th scope="col" className="px-2 py-3 sm:px-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider bg-blue-50/50 min-w-[70px]">
                現金<br/><span className="text-xxs text-gray-400">賣出</span>
              </th>
              <th scope="col" className="px-2 py-3 sm:px-4 text-center text-xs font-bold text-indigo-700 bg-indigo-50 uppercase tracking-wider min-w-[70px]">
                中間價
              </th>

              {/* Spot Section - Conditional */}
              {showSpot && (
                <>
                  <th scope="col" className="px-2 py-3 sm:px-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider bg-green-50/50 border-l border-gray-200 min-w-[70px]">
                    即期<br/><span className="text-xxs text-gray-400">買入</span>
                  </th>
                  <th scope="col" className="px-2 py-3 sm:px-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider bg-green-50/50 min-w-[70px]">
                    即期<br/><span className="text-xxs text-gray-400">賣出</span>
                  </th>
                  <th scope="col" className="px-2 py-3 sm:px-4 text-center text-xs font-bold text-indigo-700 bg-indigo-50 uppercase tracking-wider min-w-[70px]">
                    即期<br/><span className="text-xxs text-gray-400">中間</span>
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedRates.map((rate) => (
              <tr key={rate.currency} className="hover:bg-gray-50 transition-colors">
                {/* Sticky Column: Currency */}
                <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center bg-gray-100 rounded-full text-sm sm:text-lg font-bold text-gray-600 shadow-inner">
                      {rate.currency === 'CNY' ? '¥' : rate.currency.substring(0, 1)}
                    </div>
                    <div className="ml-2 sm:ml-4">
                      <div className="text-sm font-bold text-gray-900">{rate.currencyName}</div>
                      <div className="text-xs text-gray-400">{rate.currency}</div>
                    </div>
                  </div>
                </td>
                
                {/* Cash Rates */}
                <td className="px-2 py-3 sm:px-4 whitespace-nowrap text-center text-xs sm:text-sm text-gray-600 font-medium">
                  {formatNumber(rate.cashBuy)}
                </td>
                <td className="px-2 py-3 sm:px-4 whitespace-nowrap text-center text-xs sm:text-sm text-gray-600 font-medium">
                  {formatNumber(rate.cashSell)}
                </td>
                <td className="px-2 py-3 sm:px-4 whitespace-nowrap text-center text-xs sm:text-sm font-bold text-indigo-700 bg-indigo-50/50">
                  {formatNumber(rate.cashMid)}
                </td>

                {/* Spot Rates - Conditional */}
                {showSpot && (
                  <>
                    <td className="px-2 py-3 sm:px-4 whitespace-nowrap text-center text-xs sm:text-sm text-gray-600 font-medium border-l border-gray-100">
                      {formatNumber(rate.spotBuy)}
                    </td>
                    <td className="px-2 py-3 sm:px-4 whitespace-nowrap text-center text-xs sm:text-sm text-gray-600 font-medium">
                      {formatNumber(rate.spotSell)}
                    </td>
                    <td className="px-2 py-3 sm:px-4 whitespace-nowrap text-center text-xs sm:text-sm font-bold text-indigo-700 bg-indigo-50/50">
                      {formatNumber(rate.spotMid)}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RateTable;