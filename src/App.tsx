import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Chart from 'chart.js/auto';
import { QRCodeSVG } from 'qrcode.react';
import { Analytics } from "@vercel/analytics/react"

// Define types for API responses
interface FeeData {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
}

interface BlockData {
  feeRange: number[];
}

interface PriceData {
  bitcoin: {
    usd: number;
  };
}

interface TxData {
  fee: number;
  vsize: number;
  status: {
    confirmed: boolean;
    confirmations?: number;
  };
}

interface TxStatus {
  status: string;
  feeRate: string;
  feeUsd: string;
  confirmations: number;
  estConfirmation: string;
}

const App = () => {
  const [fees, setFees] = useState<FeeData | null>(null);
  const [urgency, setUrgency] = useState<string>('medium');
  const [bitcoinPrice, setBitcoinPrice] = useState<number | null>(null);
  const [chartData, setChartData] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [txid, setTxid] = useState<string>('');
  const [txStatus, setTxStatus] = useState<TxStatus | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const chartRef = useRef<Chart | null>(null);

  // Replace with your Bitcoin wallet address
  const bitcoinAddress = 'bitcoin:?lno=lno1zrxq8pjw7qjlm68mtp7e3yvxee4y5xrgjhhyf2fxhlphpckrvevh50u0q23ew9axzlhlzgjmekdyuae2wzakevthjkg3estqgpaf8zy7uewwuqsz0s265yylrsc0e28leg6cya5e8fqxtc3h46vemgcctxn9umnegq0qqvu0cpmzdpflk4t3cqeuugmnpfey4ncv5g8v2dvw8rt4lawxkzuccp2gkuypcltujfunqukttdjqzpds52dtqf07f733ykrz9098e9r8qrtjn89qllmcf7e79ce46s5hu8zdxm0t2qqs7k54vk8adpcgse3su8yp3wvras';
  // Binance referral link with your ID
  const binanceReferralLink = 'https://www.binance.com/en/activity/referral-entry/CPA?ref=CPA_00MDWGDLLZ';

  // Fetch fee data and Bitcoin price
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const feeResponse = await axios.get<FeeData>('https://mempool.space/api/v1/fees/recommended');
        setFees(feeResponse.data);

        const blockResponse = await axios.get<BlockData[]>('https://mempool.space/api/v1/fees/mempool-blocks');
        const trendData = blockResponse.data
          .map((block: BlockData) => block.feeRange[block.feeRange.length - 1])
          .slice(0, 6);
        setChartData(trendData.reverse());

        const priceResponse = await axios.get<PriceData>('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
        setBitcoinPrice(priceResponse.data.bitcoin.usd);

        setLoading(false);
      } catch (err) {
        setError('Failed to fetch data. Please try again.');
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Initialize chart
  useEffect(() => {
    if (chartData.length > 0) {
      const ctx = document.getElementById('feeChart') as HTMLCanvasElement;

      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }

      chartRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['-5 min', '-4 min', '-3 min', '-2 min', '-1 min', 'Now'],
          datasets: [{
            label: 'Fee Rate (sat/vB)',
            data: chartData,
            borderColor: '#f97316',
            fill: false,
          }],
        },
        options: {
          scales: {
            y: { beginAtZero: false, title: { display: true, text: 'sat/vB' } },
            x: { title: { display: true, text: 'Time' } },
          },
        },
      });
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [chartData]);

  // Convert sat/vB to USD
  const satToUsd = (satPerVb: number): string => {
    if (!bitcoinPrice) return 'N/A';
    const satsPerByte = satPerVb;
    const avgTxSize = 250;
    const btcCost = (satsPerByte * avgTxSize) / 100000000;
    return (btcCost * bitcoinPrice).toFixed(2);
  };

  // Handle urgency selection
  const handleUrgencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setUrgency(e.target.value);
  };

  // Get recommended fee
  const getRecommendedFee = (): number | null => {
    if (!fees) return null;
    switch (urgency) {
      case 'fastest': return fees.fastestFee;
      case 'halfHour': return fees.halfHourFee;
      case 'hour': return fees.hourFee;
      default: return fees.economyFee;
    }
  };

  // Check transaction status
  const checkTxStatus = async () => {
    if (!txid) {
      setTxError('Please enter a valid TXID.');
      return;
    }
    try {
      setTxError(null);
      setTxStatus(null);
      const txResponse = await axios.get<TxData>(`https://mempool.space/api/tx/${txid}`);
      const statusResponse = await axios.get<TxData['status']>(`https://mempool.space/api/tx/${txid}/status`);
      const txData: TxData = {
        ...txResponse.data,
        status: statusResponse.data,
      };

      const feeRate = (txData.fee / txData.vsize).toFixed(1);
      const isStuck = fees && parseFloat(feeRate) < fees.economyFee;
      const statusText = txData.status.confirmed
        ? 'Confirmed'
        : isStuck
          ? 'Pending (Low Fee - Likely Stuck)'
          : 'Pending';
      const estConfirmation = isStuck ? 'Delayed (consider RBF)' : '~1–6 hours';

      setTxStatus({
        status: statusText,
        feeRate,
        feeUsd: satToUsd(parseFloat(feeRate)),
        confirmations: txData.status.confirmed ? txData.status.confirmations || 0 : 0,
        estConfirmation,
      });
    } catch (err) {
      setTxError('Invalid TXID or transaction not found.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Bitcoin Fee Estimator</h1>

      {bitcoinPrice && (
        <div className="bg-blue-100 p-4 rounded-md mb-6">
          <p className="text-sm text-gray-700">Current BTC Price:</p>
          <p className="text-lg font-bold">${bitcoinPrice.toLocaleString()}</p>
        </div>
      )}

      {loading && <p className="text-gray-600">Loading fee data...</p>}
      {error && <p className="text-red-500">{error}</p>}


      <div className="text-center mb-5">
        <p className="text-sm text-gray-700 mb-2">Want to buy Bitcoin?</p>
        <a
          href={binanceReferralLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600"
        >
          Buy Bitcoin on Binance
        </a>
      </div>

      {fees && (
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Fee Rates</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600">Fast (~10 min)</p>
              <p className="text-lg font-bold">{fees.fastestFee} sat/vB</p>
              <p className="text-sm text-gray-500">${satToUsd(fees.fastestFee)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Economy (~1 hr)</p>
              <p className="text-lg font-bold">{fees.hourFee} sat/vB</p>
              <p className="text-sm text-gray-500">${satToUsd(fees.hourFee)}</p>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Urgency
            </label>
            <select
              value={urgency}
              onChange={handleUrgencyChange}
              className="w-full p-2 border rounded-md"
            >
              <option value="fastest">Within 10 minutes</option>
              <option value="halfHour">Within 30 minutes</option>
              <option value="hour">Within 1 hour</option>
              <option value="economy">Within 6 hours</option>
            </select>
          </div>

          <div className="bg-orange-100 p-4 rounded-md">
            <p className="text-sm text-gray-700">Recommended Fee:</p>
            <p className="text-lg font-bold">{getRecommendedFee()} sat/vB</p>
            <p className="text-sm text-gray-600">~${satToUsd(getRecommendedFee() || 0)}</p>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Check Transaction Status</h2>
        <div className="flex flex-col gap-4">
          <input
            type="text"
            value={txid}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTxid(e.target.value.trim())}
            placeholder="Enter Transaction ID (TXID)"
            className="w-full p-2 border rounded-md"
          />
          <button
            onClick={checkTxStatus}
            className="bg-orange-500 text-white p-2 rounded-md hover:bg-orange-600"
          >
            Check Status
          </button>
        </div>
        {txError && <p className="text-red-500 mt-4">{txError}</p>}
        {txStatus && (
          <div className="mt-4 bg-gray-100 p-4 rounded-md">
            <p className="text-sm text-gray-700">Status: <span className="font-bold">{txStatus.status}</span></p>
            <p className="text-sm text-gray-700">Fee Paid: <span className="font-bold">{txStatus.feeRate} sat/vB (~${txStatus.feeUsd})</span></p>
            {txStatus.status === 'Confirmed' && (
              <p className="text-sm text-gray-700">Confirmations: <span className="font-bold">{txStatus.confirmations}</span></p>
            )}
            {!txStatus.status.includes('Confirmed') && (
              <p className="text-sm text-gray-700">Est. Confirmation: <span className="font-bold">{txStatus.estConfirmation}</span></p>
            )}
            {txStatus.status.includes('Low Fee') && (
              <p className="text-sm text-orange-700 mt-2">Tip: Your fee is below the current economy rate. Consider using Replace-By-Fee (RBF) to increase the fee.</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Fee Trend (Last 5 min)</h2>
        <canvas id="feeChart" className="w-full"></canvas>
      </div>

      <div className="mt-8 w-full max-w-md bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Support the Project</h2>
        <div className="flex flex-col items-center gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-700 mb-2">Donate Sats to support this tool</p>
            <a
              href={`bitcoin:${bitcoinAddress}`}
              className="inline-block bg-orange-500 text-white p-2 rounded-md hover:bg-orange-600"
            >
              Donate on lightning
            </a>
            <div className="mt-4">
              <QRCodeSVG
                value={bitcoinAddress}
                size={128}
                className="mx-auto"
              />
              {/* <p className="text-xs text-gray-600 mt-2 break-all">{bitcoinAddress}</p> */}
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-700 mb-2">Want to buy Bitcoin?</p>
            <a
              href={binanceReferralLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600"
            >
              Buy Bitcoin on Binance
            </a>
          </div>
        </div>
      </div>

      <footer className="mt-8 text-gray-600 text-sm text-center">
        <p>Data from <a href="https://mempool.space" className="text-orange-500">mempool.space</a> and <a href="https://coingecko.com" className="text-orange-500">CoinGecko</a></p>
        <p>Updates every 60 seconds</p>
      </footer>
      <Analytics />
    </div>
  );
};

export default App;