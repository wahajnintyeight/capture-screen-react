import { SSE_URL } from '../constants.json';
import { Alert } from 'react-native';

class SSEManager {
    static instance = null;
    constructor() {
        if (!SSEManager.instance) {
            this.eventSource = null;
            this.listeners = new Map();
            SSEManager.instance = this;
        }
        return SSEManager.instance;
    }

    connect() {
        if (this.eventSource) {
            this.disconnect();
        }

        this.eventSource = new EventSource(`https://${SSE_URL}/events`);

        this.eventSource.onopen = () => {
            console.log('SSE Connection opened');
        };

        this.eventSource.onerror = (error) => {
            console.error('SSE Connection error:', error);
            this.disconnect();
            // Attempt to reconnect after 5 seconds
            setTimeout(() => this.connect(), 5000);
        };

        this.eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.notifyListeners(data);
            } catch (error) {
                console.error('Error parsing SSE message:', error);
            }
        };
    }

    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
            console.log('SSE Connection closed');
        }
    }

    addListener(id, callback) {
        this.listeners.set(id, callback);
        
        // Connect if this is the first listener
        if (this.listeners.size === 1 && !this.eventSource) {
            this.connect();
        }
    }

    removeListener(id) {
        this.listeners.delete(id);
        
        // Disconnect if no more listeners
        if (this.listeners.size === 0 && this.eventSource) {
            this.disconnect();
        }
    }

    notifyListeners(data) {
        // Handle the event and show appropriate Alert
        this.handleEventNotification(data);

        // Notify all listeners as before
        this.listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('Error in SSE listener callback:', error);
            }
        });
    }

    handleEventNotification(data) {
        try {
            const { event, message, deviceName } = data;
            
            switch (event) {
                case 'device_online':
                    Alert.alert(
                        "Device Status",
                        `${deviceName || 'Device'} is now online`
                    );
                    break;
                    
                case 'device_offline':
                    Alert.alert(
                        "Device Status",
                        `${deviceName || 'Device'} went offline`
                    );
                    break;
                    
                case 'capture_complete':
                    Alert.alert(
                        "Capture Status",
                        `Capture completed for ${deviceName || 'device'}`
                    );
                    break;
                    
                case 'capture_failed':
                    Alert.alert(
                        "Capture Failed",
                        `Capture failed for ${deviceName || 'device'}: ${message}`
                    );
                    break;
                    
                case 'error':
                    Alert.alert(
                        "Error",
                        message || 'An error occurred'
                    );
                    break;
                    
                default:
                    if (message) {
                        Alert.alert("Notification", message);
                    }
            }
        } catch (error) {
            console.error('Error handling event notification:', error);
        }
    }
}

export default new SSEManager();
