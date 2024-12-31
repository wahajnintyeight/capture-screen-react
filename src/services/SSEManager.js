import { SSE_URL } from '../constants.json';
import { Alert } from 'react-native';
import EventSource from "react-native-event-source";

class SSEManager {
    static instance = null;
    constructor() {
        if (!SSEManager.instance) {
            this.eventSource = null;
            this.listeners = new Map();
            this.lastEvents = new Map();
            this.isConnected = false;
            this.isLoading = true;
            SSEManager.instance = this;
        }
        return SSEManager.instance;
    }

    subscribe(deviceName, callback) {
        if (!this.eventSource) {
            console.log('No EventSource available');
            return;
        }

        const handler = (event) => {
            if (event.data) {
                callback(event);
            }
        };

        this.eventSource.addEventListener('message', handler);

        return () => {
            this.eventSource.removeEventListener('message', handler);
        };
    }

    connect() {
        if (this.eventSource) {
            this.disconnect();
        }

        this.isLoading = true;
        this.notifyLoadingState();

        try {
            const url = `${SSE_URL}/events`;
            console.log('[SSE] Attempting connection to:', url);

            this.eventSource = new EventSource(url);
            
            this.eventSource.addEventListener('open', () => {
                console.log('SSE Connection opened successfully');
                this.isConnected = true;
                this.notifyListeners({
                    event: 'connection_status',
                    status: 'connected',
                    message: 'Connected to server'
                });
            });

            this.eventSource.addEventListener('message', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('[SSE] Received data:', data);
                    this.isLoading = false;
                    this.notifyLoadingState();
                    this.notifyListeners(data);
                } catch (error) {
                    console.error('Error parsing SSE message:', error);
                }
            });

            this.eventSource.addEventListener('error', (error) => {
                console.log('[SSE] Connection error:', error);
                this.isConnected = false;
                this.isLoading = true;
                this.notifyLoadingState();
                
                this.notifyListeners({
                    event: 'connection_status',
                    status: 'error',
                    message: 'Connection lost. Attempting to reconnect...'
                });
            
                this.disconnect();
            
                console.log('[SSE] Scheduling reconnection attempt...');
                setTimeout(() => {
                    console.log('[SSE] Attempting to reconnect...');
                    this.connect();
                }, 5000);
            });
            
        } catch (error) {
            console.log('[SSE] Error creating EventSource:', error);
            this.isConnected = false;
            this.isLoading = false;
            this.notifyLoadingState();
            this.notifyListeners({
                event: 'connection_status',
                status: 'error',
                message: 'Failed to establish connection'
            });
        }
    }

    notifyLoadingState() {
        this.notifyListeners({
            event: 'loading_status',
            isLoading: this.isLoading
        });
    }

    disconnect() {
        if (this.eventSource) {
            console.log('[SSE] Disconnecting...');
            try {
                this.eventSource.close();
                this.notifyListeners({
                    event: 'connection_status',
                    status: 'disconnected',
                    message: 'Disconnected from server'
                });
            } catch (error) {
                console.error('[SSE] Error during disconnect:', error);
            }
            this.eventSource = null;
            this.isConnected = false;
            console.log('[SSE] Disconnected');
        }
    }

    addListener(id, callback) {
        console.log('[SSE] Adding listener:', id);
        this.listeners.set(id, callback);
        
        // Connect if this is the first listener
        if (this.listeners.size === 1 && !this.eventSource) {
            console.log('[SSE] First listener added, initiating connection');
            this.connect();
        }
    }

    removeListener(id) {
        console.log('[SSE] Removing listener:', id);
        this.listeners.delete(id);
        
        // Disconnect if no more listeners
        if (this.listeners.size === 0 && this.eventSource) {
            console.log('[SSE] No more listeners, disconnecting');
            this.disconnect();
        }
    }

    notifyListeners(data) {
        // console.log('[SSE] Notifying listeners with data:', data);
        
        try {
            // Store last event for the device
            console.log("Notify Listeners with data:",data)
            if (data?.message?.deviceName) {
                console.log("Setting last event for device:", data.message)
                this.lastEvents.set(data.message.deviceName, {
                    event: data.type,
                    timestamp: new Date(),
                    message: data.message,
                    imageBlob: data.imageBlob,
                    lastImage: data.message.lastImage
                });
            }

            // Notify all listeners
            this.listeners.forEach((callback, id) => {
                try {
                    console.log('[SSE] Notifying listener:', id);
                    callback(data);
                } catch (error) {
                    console.error('[SSE] Error in listener callback:', id, error);
                }
            });
        } catch (error) {
            console.error('[SSE] Error processing event:', error);
        }
    }

    // Helper method to check connection status
    isConnectedToServer() {
        return this.isConnected;
    }

    // Helper method to get last event for a device
    getLastEvent(deviceId) {
        return this.lastEvents.get(deviceId);
    }

    // Add method to check loading state
    isLoadingData() {
        return this.isLoading;
    }
}

export default new SSEManager();
