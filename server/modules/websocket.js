const WebSocket = require('ws');

// WebSocket server instance
let wss = null;
let wsClients = new Set();

/**
 * Setup WebSocket server
 * @param {http.Server} server - HTTP server instance
 * @returns {WebSocket.Server} WebSocket server instance
 */
function setupWebSocketServer(server) {
    wss = new WebSocket.Server({ server });
    
    wss.on('connection', (ws) => {
        console.log('🔌 New WebSocket connection established');
        wsClients.add(ws);
        
        ws.on('close', () => {
            console.log('🔌 WebSocket connection closed');
            wsClients.delete(ws);
        });
        
        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            wsClients.delete(ws);
        });
        
        // Send welcome message
        ws.send(JSON.stringify({
            type: 'connected',
            message: 'WebSocket connected to Space Analyzer Pro',
            timestamp: new Date().toISOString()
        }));
    });
    
    return wss;
}

/**
 * Broadcast data to all WebSocket clients
 * @param {Object} data - Data to broadcast
 */
function broadcast(data) {
    const message = JSON.stringify(data);
    wsClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

/**
 * Get WebSocket clients set
 * @returns {Set} WebSocket clients
 */
function getClients() {
    return wsClients;
}

/**
 * Get WebSocket server instance
 * @returns {WebSocket.Server} WebSocket server instance
 */
function getServer() {
    return wss;
}

module.exports = {
    setupWebSocketServer,
    broadcast,
    getClients,
    getServer
};
