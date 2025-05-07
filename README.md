# Bitcoin Fee Estimator

A real-time Bitcoin transaction fee estimation tool built with React, TypeScript, and Vite. This web application helps users make informed decisions about Bitcoin transaction fees by providing current fee rates, transaction status checking, and fee trend visualization.

## Features

- **Real-time Fee Estimates**: Shows current Bitcoin transaction fees for different urgency levels (10 minutes to 6 hours)
- **Fee Calculator**: Converts satoshis/vByte to USD based on current Bitcoin price
- **Transaction Status Checker**: Verify the status of any Bitcoin transaction with detailed fee analysis
- **Fee Trend Visualization**: Chart showing fee trends over the last 5 minutes
- **Live Bitcoin Price**: Displays current Bitcoin price from CoinGecko
- **Auto Updates**: Data refreshes every 60 seconds

## Tech Stack

- React 19
- TypeScript
- Vite
- TailwindCSS
- Chart.js
- Axios

## APIs Used

- mempool.space API for Bitcoin fee and transaction data
- CoinGecko API for Bitcoin price data

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```

## Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Contributing

Contributions are welcome! Feel free to submit issues and pull requests.

## Data Sources

- Fee data is sourced from [mempool.space](https://mempool.space)
- Bitcoin price data is from [CoinGecko](https://coingecko.com)

## License

This project is open source and available under the MIT license.
