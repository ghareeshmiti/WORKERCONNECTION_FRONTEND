# FIDO/WebAuthn Integration Guide for React

This guide outlines how to integrate FIDO2 (Passkeys/NFC Cards) into a React application using the `@simplewebauthn` libraries.

## 1. Dependencies

You will need the SimpleWebAuthn libraries for handling the complex cryptographic operations.

**Frontend:**
```bash
npm install @simplewebauthn/browser
```

**Backend (Node.js/Express):**
```bash
npm install @simplewebauthn/server
```

## 2. Backend Implementation (Node.js)

You need to implement four endpoints: two for registration and two for authentication.

### A. Registration (Linking a Card)
1.  **`POST /register/begin`**:
    *   **Input**: Username.
    *   **Action**: Generate registration options (challenge, RP info, user info).
    *   **Code**: `generateRegistrationOptions()`
    *   **Important**: Save the `challenge` to the user's session/DB temporarily.
    *   **One Card = One Person**: Fetch all existing authenticators and pass them to `excludeCredentials` to prevent duplicates.

2.  **`POST /register/finish`**:
    *   **Input**: The data returned from the frontend (credential).
    *   **Action**: Verify the signature.
    *   **Code**: `verifyRegistrationResponse()`
    *   **On Success**: Store `credentialID`, `credentialPublicKey`, and `counter` in your database associated with the user.

### B. Authentication (Logging In)
1.  **`POST /login/begin`**:
    *   **Input**: Username (optional if using Resident Keys).
    *   **Action**: Generate auth options (challenge).
    *   **Code**: `generateAuthenticationOptions()`
    *   **Important**: If username is provided, look up their `credentialID`s and pass them in `allowCredentials`.

2.  **`POST /login/finish`**:
    *   **Input**: The signed challenge from the frontend.
    *   **Action**: Verify validity.
    *   **Code**: `verifyAuthenticationResponse()`
    *   **On Success**: Log the user in (issue JWT, session cookie, etc.).

## 3. Frontend Implementation (React)

Use the browser library to handle the interaction with the FIDO key.

```javascript
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

// --- Registration ---
async function registerUser(username) {
  // 1. Get options from server
  const resp = await fetch('/api/register/begin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  const options = await resp.json();

  // 2. Hand off to browser/key (Prompt user to tap card)
  let attResp;
  try {
    attResp = await startRegistration(options);
  } catch (error) {
    if (error.name === 'InvalidStateError') {
      alert("Error: This authenticator is already registered.");
    }
    throw error;
  }

  // 3. Send signature back to server
  const verificationResp = await fetch('/api/register/finish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, body: attResp })
  });

  const verificationJSON = await verificationResp.json();
  return verificationJSON.verified;
}

// --- Login ---
async function loginUser(username) {
  // 1. Get options
  const resp = await fetch('/api/login/begin', {
    method: 'POST',
    body: JSON.stringify({ username }),
     headers: { 'Content-Type': 'application/json' }
  });
  const options = await resp.json();

  // 2. Authenticate
  const asseResp = await startAuthentication(options);

  // 3. Verify
  const verificationResp = await fetch('/api/login/finish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, body: asseResp })
  });
  
  return await verificationResp.json();
}
```

## 4. Critical Considerations

1.  **HTTPS Required**: WebAuthn **only** works on `localhost` or valid `https://` domains. It will fail on `http://` IP addresses (e.g., `http://192.168.1.5`).
2.  **RP ID (Relying Party ID)**: This is usually your domain name (e.g., `myapp.com` or `localhost`). You cannot register a key on `localhost` and use it on `myapp.com`. The domain limits the scope of the key.
3.  **Data Formats**:
    *   The database usually stores `credentialID` and `publicKey` as **BLOBs** or Buffers.
    *   The API usually expects/returns **Base64URL** encoded strings.
    *   Ensure proper conversion (Buffer <-> Base64URL) when moving data between DB and API.
