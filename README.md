# MEV

The Pump.fun of MEV bots. Anyone can extract value.

Landing site for MEV, a one-click Solana MEV bot launchpad. Plain static site: HTML, CSS and JavaScript, no build step, no folders, nothing to install.

## Files

```
.
├── index.html             page markup
├── styles.css             all styles (dark + light themes)
├── app.js                 wallet connect, HQ floor, panels, launch console, dashboard, marketplace
├── bot.png                robot logo (transparent), used on the HQ floor and roster
├── bot-nav.png            small logo for the header
├── favicon.png
├── apple-touch-icon.png
├── logo-original.png      original artwork
├── vercel.json            Vercel config (clean URLs, security headers)
├── .gitignore
└── README.md
```

## Run locally

Wallet extensions don't inject into `file://` pages, so serve the folder over HTTP:

```bash
npx serve .
# or
python3 -m http.server 3000
```

Then open http://localhost:3000.

## Deploy to Vercel

1. Push all of these files to the root of the `main` branch of a GitHub repo.
2. On vercel.com, choose **Add New → Project** and import the repo.
3. Framework preset: **Other**. Leave build command, output directory and root directory empty.
4. Click **Deploy**.

If the project shows "No Production Deployment", open **Deployments → Create Deployment**, enter `main`, and deploy.

## Wallet connect

`app.js` connects to Phantom, Solflare and Backpack through their injected providers and uses
[`@solana/web3.js`](https://github.com/solana-labs/solana-web3.js) 1.95.3 (loaded from jsDelivr) to handle public keys.
The site only reads the wallet's public address. It never requests a signature or sends a transaction.

## Live data

The epoch counter in the header reads `getEpochInfo` from `https://api.mainnet-beta.solana.com`.
The public endpoint is rate-limited, so set `RPC_URL` in `app.js` to your own provider before you get traffic.

## What's wired up today

- **HQ floor:** a 3D room with one bot per strategy. Drag to rotate, click a bot to select it, "configure" opens the launch console with that strategy picked. Bots are defined in `BOTS_ON_FLOOR` in `app.js`.
- **Panels:** launch, dashboard, marketplace, buyback ledger and flywheel open over the page from the tabs, and each has its own link (`/#launch`, `/#ledger`, ...).
- **Wallet connect:** live.
- **Epoch counter:** live from Solana mainnet.
- **Launch console:** collects name, strategy, pairs, capital, risk limit and profit threshold, and generates a bot signer keypair in the browser (it's discarded). It ends by pointing visitors to @MEVLaunch for go-live. Nothing is deployed and no funds move.
- **Dashboard:** shows "—" for every metric until a backend reports real bot data.
- **Marketplace:** empty. Add listings to the `BOTS` array in `app.js` (the expected fields are documented there) or load them from your backend.
- **Buyback ledger:** empty until you add rows to the table in `index.html` (or load them from your backend).
- **Stats strip:** all counters are static (0).

## Disclaimer

MEV is competitive and bots can lose money. Past returns don't predict future results. Allocating capital to managed strategies is subject to security controls and the regulations where each user lives. Nothing on this site is financial advice.
