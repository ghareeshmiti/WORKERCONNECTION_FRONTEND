# FIDO Biometric Check-in/Check-out System

A React-based application demonstrating secure facility access using Thales FIDO Biometric Smartcards (or any WebAuthn authenticator).

## Requirements
- Node.js (v18+)
- A FIDO2 Authenticator (Thales Biometric Card, YubiKey, or TouchID/Windows Hello)

## Structure
- `client/`: React + Vite + Tailwind CSS frontend.
- `server/`: Node.js + Express backend (Acts as the FIDO Relying Party).

## How to Run
1.  **Run the automated script**:
    ```bash
    ./run_all.sh
    ```
2.  Open your browser to: **http://localhost:5173**

## Features
- **Self Registration**: Enter a username and register your Biometric Card.
- **Check-in/Check-out**: Tap your card to toggle your status.
- **Mock Backend**: Uses in-memory storage. Restarting the server resets the data.

## Note on Thales Cards
Ensure your card is enrolled with your fingerprint before using it with this application. The app uses standard WebAuthn `navigator.credentials` APIs which are fully compatible with Thales FIDO cards.
