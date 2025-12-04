import React, { useState } from 'react';

const OracleSOP: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-12 mb-12 border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 bg-gray-800 text-white flex justify-between items-center hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-lg font-semibold">Oracle Cloud (OCI) 部署教學 SOP</span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="p-8 text-gray-700 space-y-8 bg-gray-50">
          
          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">架構說明 (重要)</h3>
            <p className="text-sm mb-3 text-red-600 bg-red-50 p-3 rounded">
                本系統為了取得即時精準匯率，前端使用了 <strong>CORS Proxy</strong> (AllOrigins) 來繞過瀏覽器限制抓取台灣銀行官網。
                在生產環境部署時，建議您建立自己的 Proxy Server 以確保穩定性。
            </p>
          </section>

          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">第一步：建立運算執行個體 (Compute Instance)</h3>
            <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed">
              <li>登入 <strong>Oracle Cloud Console</strong>。</li>
              <li>前往 <strong>Compute (運算) &gt; Instances (執行個體)</strong> 並點擊 <strong>Create Instance</strong>。</li>
              <li><strong>Image (映像檔):</strong> 選擇 <strong>Canonical Ubuntu 22.04</strong> 或 <strong>24.04</strong>。</li>
              <li><strong>Shape (形狀):</strong> 推薦選擇 <strong>VM.Standard.A1.Flex</strong> (Free Tier ARM 架構, 4 OCPUs, 24GB RAM) 或 <strong>VM.Standard.E2.1.Micro</strong>。</li>
              <li><strong>SSH Keys:</strong> 務必下載並妥善保存私鑰 (<code>.key</code>)，這是未來連線的唯一憑證。</li>
              <li>點擊 <strong>Create</strong> 建立機器。</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">第二步：設定雲端網路防火牆 (VCN)</h3>
            <p className="text-sm mb-3">必須在 Oracle Cloud 後台開啟連接埠，外部才能訪問。</p>
            <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed">
              <li>在 Instance 詳細頁面中，點擊 <strong>Subnet (子網路)</strong> 連結。</li>
              <li>點擊 <strong>Security List (安全清單)</strong> (通常名稱為 "Default Security List for...")。</li>
              <li>點擊 <strong>Add Ingress Rules (新增傳入規則)</strong>：
                <ul className="mt-2 pl-4 list-circle text-gray-600">
                    <li><strong>Source CIDR:</strong> <code>0.0.0.0/0</code> (允許所有來源)</li>
                    <li><strong>IP Protocol:</strong> TCP</li>
                    <li><strong>Destination Port Range:</strong> 輸入 <code>80, 443, 3000</code></li>
                </ul>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">第三步：連線並設定 VM 環境</h3>
            <p className="text-sm mb-3">使用 SSH 連線： <code>ssh -i your_key.key ubuntu@YOUR_PUBLIC_IP</code></p>
            
            <div className="bg-gray-800 rounded-md p-4 overflow-x-auto shadow-inner border border-gray-700">
              <code className="text-xs text-green-400 font-mono block whitespace-pre">
{`# 1. 更新系統
sudo apt update && sudo apt upgrade -y

# 2. 設定 OS 內部防火牆 (iptables)
# Oracle Ubuntu 預設會阻擋 Port 3000，需手動開啟
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT

# 3. 永久保存防火牆規則 (重開機後不失效)
sudo netfilter-persistent save

# 4. 安裝 Node.js (推薦 v20 LTS)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# 5. 安裝 Git
sudo apt install git -y`}
              </code>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">第四步：部署應用程式</h3>
            <div className="bg-gray-800 rounded-md p-4 overflow-x-auto shadow-inner border border-gray-700">
              <code className="text-xs text-green-400 font-mono block whitespace-pre">
{`# 1. 下載程式碼
git clone <你的專案儲存庫網址> exchange-app
cd exchange-app

# 2. 安裝套件
npm install

# 3. 設定環境變數 (填入你的 Gemini API Key)
echo "API_KEY=your_gemini_api_key_here" > .env

# 4. 建置生產版本
npm run build

# 5. 啟動服務
npm install -g serve
# 在背景執行並監聽 Port 3000
nohup serve -s dist -l 3000 &

# 完成！現在可以用瀏覽器開啟： http://YOUR_PUBLIC_IP:3000`}
              </code>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default OracleSOP;