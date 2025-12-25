# 🚀 Quick Deploy Guide - DailyCheckInBadge with Fee

## Cara Tercepat: Remix IDE

### 1. Buka Remix
- https://remix.ethereum.org

### 2. Setup File
- Klik "File Explorer" (icon folder di kiri)
- Buat folder `contracts` jika belum ada
- Buat file baru: `contracts/DailyCheckInBadge.sol`
- Copy-paste semua isi dari `contracts/DailyCheckInBadge.sol` di project ini

### 3. Install Dependencies
- Klik tab "File Explorer"
- Klik icon "Create new file" di folder `contracts`
- Buat file: `contracts/@openzeppelin/contracts/...` (atau)
- **Lebih mudah**: Klik "Solidity Compiler" tab
- Klik "Auto compile" checkbox
- Remix akan otomatis download dependencies

**Atau manual install:**
- Di Remix, klik "Plugin Manager" (icon puzzle)
- Install "OpenZeppelin Contracts"
- Atau gunakan npm: `npm install @openzeppelin/contracts` di Remix terminal

### 4. Compile
- Pilih tab "Solidity Compiler"
- Compiler version: `0.8.20` (atau yang sesuai)
- Klik "Compile DailyCheckInBadge.sol"
- Pastikan tidak ada error (hijau ✓)

### 5. Deploy
- Pilih tab "Deploy & Run Transactions"
- Environment: **"Injected Provider - MetaMask"** (atau wallet lain)
- Pastikan network benar:
  - **Base Sepolia** untuk testnet
  - **Base** untuk mainnet
- Klik **"Deploy"**
- Confirm di MetaMask

### 6. Copy Address
- Setelah deploy, copy contract address
- Update di `lib/contract.ts`:
```typescript
export const CONTRACT_ADDRESS = "0x..."; // Paste address baru di sini
```

### 7. Test
- Di Remix, klik contract yang sudah deploy
- Test `getCheckInFee()` - harus return `1000000000000000` (0.001 ETH)
- Test `checkIn()` - harus mengirim ETH sesuai fee

## ✅ Checklist Setelah Deploy

- [ ] Contract address sudah di-copy
- [ ] Update `CONTRACT_ADDRESS` di `lib/contract.ts`
- [ ] Test `getCheckInFee()` di Remix
- [ ] Test `checkIn()` dengan mengirim fee
- [ ] Update frontend dan test di browser
- [ ] Commit perubahan ke git

## 🔧 Set Fee (Opsional)

Sebagai owner, Anda bisa ubah fee:
1. Di Remix, klik contract yang sudah deploy
2. Panggil `setCheckInFee(uint256 newFee)`
3. Masukkan fee dalam wei (contoh: `1000000000000000` = 0.001 ETH)
4. Confirm transaction

## 💰 Withdraw Fees

Untuk menarik fees yang terkumpul:
1. Di Remix, klik contract
2. Panggil `withdrawFees()`
3. Confirm transaction
4. ETH akan masuk ke wallet owner

## 📝 Catatan

- **Default fee**: 0.001 ETH
- **Network**: Pilih Base Sepolia untuk testing, Base Mainnet untuk production
- **Gas**: Pastikan wallet punya cukup ETH untuk gas fees
- **Security**: Jangan share private key!
