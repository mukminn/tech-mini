# Deployment Guide - DailyCheckInBadge with Fee

## Overview
Contract baru dengan fitur fee untuk daily check-in sudah siap. Pilih salah satu metode deployment di bawah ini.

## Prerequisites
1. Private key deployer (JANGAN commit ke git!)
2. RPC URL untuk network target (Base Sepolia, Base Mainnet, dll)
3. ETH untuk gas fees

## Metode 1: Menggunakan Remix IDE (Paling Mudah)

### Langkah-langkah:
1. Buka https://remix.ethereum.org
2. Buat file baru: `DailyCheckInBadge.sol`
3. Copy-paste konten dari `contracts/DailyCheckInBadge.sol`
4. Install dependencies di Remix:
   - Klik "File Explorer" → "dependencies"
   - Install: `@openzeppelin/contracts`
5. Compile contract:
   - Pilih compiler version: `0.8.20`
   - Klik "Compile DailyCheckInBadge.sol"
6. Deploy:
   - Pilih tab "Deploy & Run Transactions"
   - Pilih environment: "Injected Provider" (MetaMask)
   - Pastikan network yang benar (Base Sepolia/Mainnet)
   - Klik "Deploy"
7. Copy contract address dan update di `lib/contract.ts`

## Metode 2: Menggunakan Hardhat

### Setup:
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
```

### Buat `hardhat.config.js`:
```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    baseSepolia: {
      url: process.env.RPC_URL || "https://sepolia.base.org",
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    },
    base: {
      url: process.env.RPC_URL_MAINNET || "https://mainnet.base.org",
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    },
  },
};
```

### Buat `.env`:
```
DEPLOYER_PRIVATE_KEY=your_private_key_here
RPC_URL=https://sepolia.base.org
```

### Deploy:
```bash
npx hardhat compile
npx hardhat run scripts/deploy-hardhat.js --network baseSepolia
```

## Metode 3: Menggunakan Foundry

### Setup:
```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install dependencies
forge install foundry-rs/forge-std
```

### Buat `foundry.toml`:
```toml
[profile.default]
src = "contracts"
out = "out"
libs = ["lib"]
solc = "0.8.20"
optimizer = true
optimizer_runs = 200

[rpc_endpoints]
base_sepolia = "https://sepolia.base.org"
base = "https://mainnet.base.org"
```

### Buat `.env`:
```
DEPLOYER_PRIVATE_KEY=your_private_key_here
RPC_URL=https://sepolia.base.org
```

### Deploy:
```bash
forge build
forge script scripts/Deploy.s.sol:DeployScript \
  --rpc-url $RPC_URL \
  --broadcast \
  --verify
```

## Setelah Deployment

1. **Update Contract Address** di `lib/contract.ts`:
```typescript
export const CONTRACT_ADDRESS = "0x..."; // Address baru
```

2. **Verify Contract** (opsional tapi disarankan):
   - Gunakan BaseScan untuk verify
   - Atau gunakan Hardhat/Foundry verify plugin

3. **Test Contract**:
   - Test check-in dengan fee
   - Test set fee (sebagai owner)
   - Test withdraw fees (sebagai owner)

## Catatan Penting

⚠️ **Security:**
- JANGAN commit private key ke git
- Gunakan `.env` dan tambahkan ke `.gitignore`
- Simpan private key dengan aman

💰 **Fee Default:**
- Default fee: 0.001 ETH (1000000000000000 wei)
- Owner dapat mengubah fee dengan `setCheckInFee()`
- Owner dapat withdraw fees dengan `withdrawFees()`

🔗 **Network:**
- Base Sepolia untuk testing
- Base Mainnet untuk production

## Testing Functions

Setelah deploy, test dengan:
1. `checkIn()` - dengan mengirim fee
2. `getCheckInFee()` - lihat fee saat ini
3. `setCheckInFee(uint256)` - ubah fee (owner only)
4. `withdrawFees()` - tarik fees (owner only)
5. `getContractBalance()` - lihat total fees terkumpul
