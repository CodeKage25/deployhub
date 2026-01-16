import { EventEmitter } from 'events';

// Global log emitter for real-time streaming
class LogEmitter extends EventEmitter {
    private static instance: LogEmitter;

    private constructor() {
        super();
        this.setMaxListeners(100); // Allow many WebSocket connections
    }

    static getInstance(): LogEmitter {
        if (!LogEmitter.instance) {
            LogEmitter.instance = new LogEmitter();
        }
        return LogEmitter.instance;
    }

    emitLog(deploymentId: string, message: string) {
        this.emit(`log:${deploymentId}`, message);
        this.emit('log:all', { deploymentId, message });
    }

    emitStatus(deploymentId: string, status: string) {
        this.emit(`status:${deploymentId}`, status);
    }
}

export const logEmitter = LogEmitter.getInstance();
