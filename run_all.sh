#!/bin/bash
echo "Starting FIDO Check-in System..."

# Start Server in background
echo "Starting Server on port 3000..."
cd server
node index.js &
SERVER_PID=$!

# Start Client
echo "Starting Client..."
cd ../client
# Use --host to expose if needed, but localhost is fine
# We use & to background it too so we can wait
npm run dev &
CLIENT_PID=$!

# Start Ngrok
echo "Starting Ngrok tunnel..."
ngrok http 5173 --log=stdout > ../ngrok.log &
NGROK_PID=$!

echo "Application running!"
echo "Server: http://localhost:3000"
echo "Client: http://localhost:5173"
echo "Ngrok: Check logs or dashboard for URL (cat ngrok.log | grep url)"
echo "Press CTRL+C to stop everything."

# Wait for user to kill
wait $SERVER_PID $CLIENT_PID $NGROK_PID
