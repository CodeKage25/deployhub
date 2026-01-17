import { FastifyInstance } from 'fastify';
import { logEmitter } from '../services/logEmitter.js';

export default async function logsRoutes(app: FastifyInstance) {
    // WebSocket endpoint for real-time build logs
    app.get('/logs/:deploymentId', { websocket: true }, (connection, request) => {
        const { deploymentId } = request.params as { deploymentId: string };

        app.log.info(`WebSocket connected for deployment: ${deploymentId}`);

        // Send initial connection message
        connection.socket.send(JSON.stringify({
            type: 'connected',
            deploymentId,
            timestamp: new Date().toISOString()
        }));

        // Listen for log events
        const logHandler = (message: string) => {
            if (connection.socket.readyState === 1) { // OPEN
                connection.socket.send(JSON.stringify({
                    type: 'log',
                    message,
                    timestamp: new Date().toISOString()
                }));
            }
        };

        // Listen for status changes
        const statusHandler = (status: string) => {
            if (connection.socket.readyState === 1) {
                connection.socket.send(JSON.stringify({
                    type: 'status',
                    status,
                    timestamp: new Date().toISOString()
                }));
            }
        };

        // Subscribe to events
        logEmitter.on(`log:${deploymentId}`, logHandler);
        logEmitter.on(`status:${deploymentId}`, statusHandler);

        // Handle client messages (e.g., ping)
        connection.socket.on('message', (data: any) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'ping') {
                    connection.socket.send(JSON.stringify({ type: 'pong' }));
                }
            } catch {
                // Ignore invalid messages
            }
        });

        // Cleanup on disconnect
        connection.socket.on('close', () => {
            app.log.info(`WebSocket disconnected for deployment: ${deploymentId}`);
            logEmitter.off(`log:${deploymentId}`, logHandler);
            logEmitter.off(`status:${deploymentId}`, statusHandler);
        });

        connection.socket.on('error', (err: any) => {
            app.log.error(`WebSocket error for deployment ${deploymentId}:`, err);
            logEmitter.off(`log:${deploymentId}`, logHandler);
            logEmitter.off(`status:${deploymentId}`, statusHandler);
        });
    });
}
