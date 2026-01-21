const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3001');

ws.on('open', () => {
  console.log('Connected to server');
  // Send start control message
  ws.send(JSON.stringify({ type: 'control', action: 'start' }));
  
  // Wait a bit and send a text message
  setTimeout(() => {
    console.log('Sending text message...');
    ws.send(JSON.stringify({ type: 'text', data: 'Hi, I want to plan a 2 day trip to Jaipur.' }));
  }, 2000);
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('Received:', message.type, message.text || message.data || '');
  
  if (message.type === 'transcript' && message.data?.role === 'assistant' && !message.isPartial) {
    console.log('Assistant says:', message.text);
    // ws.close();
  }
});

ws.on('error', (err) => {
  console.error('WebSocket error:', err);
});

ws.on('close', () => {
  console.log('Disconnected');
});

// Exit after 20 seconds
setTimeout(() => {
  console.log('Timeout, closing');
  ws.close();
  process.exit(0);
}, 20000);
