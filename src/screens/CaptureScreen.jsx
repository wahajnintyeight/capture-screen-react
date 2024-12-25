import { View, Text, StyleSheet, ScrollView, Dimensions, useColorScheme, TouchableOpacity, Alert, RefreshControl, ActivityIndicator, Image } from "react-native"
import apiManager from "../services/APIManager";
import { useEffect, useState, useCallback, useRef } from "react";
import { FAB, Portal, Snackbar, Card, ProgressBar } from 'react-native-paper';
import { Animated, Easing } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SSEManager from '../services/SSEManager';
import ImageViewing from 'react-native-image-viewing';

const CaptureScreen = ({ navigation,route }) => {
    const colorScheme = useColorScheme();
    console.log("Capture Screen", route)
    const textColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';
    const bgColor = colorScheme === 'dark' ? '#1A1A1A' : '#F0E6FF';
    const cardBgColor = colorScheme === 'dark' ? '#2D2D2D' : '#FFFFFF';


    const [deviceInfo, setDeviceInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [captureStatus, setCaptureStatus] = useState('idle'); // 'idle', 'capturing', 'success', 'error'
    const [captureMessage, setCaptureMessage] = useState('');
    const [connectionStatus, setConnectionStatus] = useState(null);
    const [deviceStats, setDeviceStats] = useState({
        memoryUsage: '0 / 1',
        diskUsage: '0 / 1',
        osName: 'N/A',
        imageBlob: null,
        lastImage: null
    });
    const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);

    const deviceId = route?.params?.deviceId;
    const deviceName = route?.params?.deviceName;
    const fetchDeviceInfo = async (deviceId) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiManager.getDeviceInfo(deviceId);
            if (response?.code && response.result) {
                setDeviceInfo(response.result);
            } else {
                setError('Failed to fetch device info');
            }
        } catch (err) {
            console.error('Error fetching device info:', err);
            setError('An error occurred while fetching device info');
        } finally {
            setIsLoading(false);
        }
    };

    // Add event listener for SSE events
    useEffect(() => {
        const handleEvents = (data) => {
            if (data.event === 'loading_status') {
                setIsLoading(data.isLoading);
                return;
            }

            // Handle connection status events
            if (data.event === 'connection_status') {
                setConnectionStatus({
                    status: data.status,
                    message: data.message
                });
                return;
            }

            // Handle device data updates
            if (data.type === 'device_data') {
                const deviceData = data.message;
                
                // Update device stats
                setDeviceStats({
                    memoryUsage: deviceData.memoryUsage || 'N/A',
                    diskUsage: deviceData.diskUsage || 'N/A',
                    osName: deviceData.osName || 'N/A',
                    imageBlob: deviceData.imageBlob,
                    lastImage: deviceData.lastImage
                });

                // Update device info
                if (deviceData.isOnline !== undefined) {
                    setDeviceInfo(prevInfo => ({
                        ...prevInfo,
                        isonline: deviceData.isOnline,
                        lastonline: deviceData.lastOnline,
                        devicename: deviceData.deviceName
                    }));
                }

                return;
            }

            // Handle existing capture events
            const { event, message, deviceName } = data;
            switch (event) {
                case 'capture_start':
                    setCaptureStatus('capturing');
                    setCaptureMessage('Screen capture in progress...');
                    break;

                case 'capture_complete':
                    setCaptureStatus('success');
                    setCaptureMessage(`Capture completed for ${deviceName}`);
                    // Refresh device info after successful capture
                    fetchDeviceInfo(deviceId);
                    break;

                case 'capture_failed':
                    setCaptureStatus('error');
                    setCaptureMessage(`Capture failed: ${message}`);
                    break;
            }
        };

        const listenerId = `capture_${deviceId}`;
        SSEManager.addListener(listenerId, handleEvents);

        return () => {
            SSEManager.removeListener(listenerId);
        };
    }, [deviceId]);

    const handleCapture = async (deviceId) => {
        try {
            setCaptureStatus('capturing');
            setCaptureMessage('Initiating screen capture...');
            setIsLoading(true);
            setError(null);

            const response = await apiManager.captureScreen(deviceId, deviceName);
            console.log('Capture API response:', response);

            if (!response?.code) {
                throw new Error('Invalid response from capture API');
            }

        } catch (err) {
            console.error('Error initiating screen capture:', err);
            setCaptureStatus('error');
            setCaptureMessage('Failed to initiate screen capture');
            setError('Failed to initiate screen capture');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (deviceId) {
            fetchDeviceInfo(deviceId);
        }
    }, [deviceId]);

    // Add date formatting helper
    const formatLastOnline = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes/60)}h ago`;
        return date.toLocaleDateString();
    };

    console.log("deviceStats", deviceStats.diskUsage)
    // Update the storageData object to use actual device stats
    const storageData = {
        used: deviceStats.diskUsage ? Number(deviceStats.diskUsage.split('/')[0].replace(' GiB', '').trim()) : 0,
        total: deviceStats.diskUsage ? Number(deviceStats.diskUsage.split('/')[1].replace(' GiB', '').trim()) : 1,
        getPercentage: function() {
            // Convert to a number between 0-1 with fixed precision
            const percentage = Number((this.used / this.total).toFixed(2));
            return Math.min(Math.max(percentage, 0), 1);
        },
        getFormattedUsed: function() {
            return deviceStats.diskUsage || 'N/A';
        }
    };

    // Add memory usage calculation
    const memoryData = {
        used: deviceStats.memoryUsage ? Number(deviceStats.memoryUsage.split('/')[0].replace(' GiB', '').trim()) : 0,
        total: deviceStats.memoryUsage ? Number(deviceStats.memoryUsage.split('/')[1].replace(' GiB', '').trim()) : 1,
        getPercentage: function() {
            const percentage = Number((this.used / this.total).toFixed(2));
            return Math.min(Math.max(percentage, 0), 1);
        },
        getFormattedUsage: function() {
            return deviceStats.memoryUsage || 'N/A';
        }
    };

    // Add status indicator in the UI
    const renderCaptureStatus = () => {
        if (captureStatus === 'idle') return null;

        const statusColors = {
            capturing: '#FFA000',
            success: '#4CAF50',
            error: '#FF5252'
        };

        return (
            <View style={[styles.statusContainer, { backgroundColor: statusColors[captureStatus] }]}>
                <Text style={styles.statusText}>{captureMessage}</Text>
            </View>
        );
    };

    const renderStatus = () => {
        if (connectionStatus) {
            const statusColors = {
                connected: '#4CAF50',
                disconnected: '#FFA000',
                error: '#FF5252'
            };

            return (
                <View style={[styles.statusContainer, { backgroundColor: statusColors[connectionStatus.status] }]}>
                    <Text style={styles.statusText}>{connectionStatus.message}</Text>
                </View>
            );
        }

        return renderCaptureStatus(); // Your existing capture status renderer
    };

    const renderImage = () => {
        if (deviceStats.lastImage) {
            return (
                <TouchableOpacity 
                    onPress={() => setIsImageViewerVisible(true)}
                    style={styles.imageContainer}
                >
                    <Image 
                        source={{ uri: deviceStats.lastImage }}
                        style={styles.image}
                        resizeMode="contain"
                        onError={(e) => {
                            console.error('Image loading error:', e.nativeEvent.error);
                        }}
                        onLoad={() => console.log('Image loaded successfully')}
                    />
                </TouchableOpacity>
            );
        }
        
        return (
            <View style={styles.noImageContainer}>
                <Icon name="image-off" size={48} color="#7B1FA2" />
                <Text style={[styles.noImageText, { color: textColor }]}>
                    No screenshot available
                </Text>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            {renderStatus()}
            
            {isLoading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#7B1FA2" />
                    <Text style={[styles.loaderText, { color: textColor }]}>
                        Loading device data...
                    </Text>
                </View>
            ) : (
                <>
                    {/* Device Name Header - Sticky */}
                    <View style={styles.headerContainer}>
                        <Icon name="desktop-tower-monitor" size={28} color="#7B1FA2" />
                        <Text style={[styles.deviceName, { color: textColor }]}>
                            {deviceInfo?.devicename || 'Unknown Device'}
                        </Text>
                    </View>

                    {/* Image Viewer Section - Sticky */}
                    <View style={styles.stickySection}>
                        <View style={styles.imageViewerContainer}>
                           
                            {/* <Image 
                                source={{ uri: 'https://res.cloudinary.com/djvpc14v7/image/upload/v1735144729/screen_captures/DESKTOP-SQ3S8SE_2024-12-25T21:38:48%2B05:00.jpg' }}
                                style={styles.image}
                            /> */}

                                {renderImage()}
                            
                        </View>
                    </View>

                    {/* Scrollable Stats Section */}
                    <ScrollView 
                        style={styles.scrollContainer}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        bounces={false}
                        scrollEventThrottle={16}
                    >
                        <View style={styles.statsContainer}>
                            <View style={styles.statsRow}>
                                {/* Online Status */}
                                <View style={[styles.statCard, { backgroundColor: cardBgColor }]}>
                                    <Icon 
                                        name={deviceInfo?.isonline ? "access-point" : "access-point-off"} 
                                        size={24} 
                                        color={deviceInfo?.isonline ? "#4CAF50" : "#FF5252"} 
                                    />
                                    <Text style={[styles.statLabel, { color: textColor }]}>Status</Text>
                                    <Text style={[styles.statValue, { color: deviceInfo?.isonline ? "#4CAF50" : "#FF5252" }]}>
                                        {deviceInfo?.isonline ? 'Online' : 'Offline'}
                                    </Text>
                                </View>

                                {/* Last Online */}
                                <View style={[styles.statCard, { backgroundColor: cardBgColor }]}>
                                    <Icon name="clock-outline" size={24} color="#7B1FA2" />
                                    <Text style={[styles.statLabel, { color: textColor }]}>Last Online</Text>
                                    <Text style={[styles.statValue, { color: textColor }]}>
                                        {deviceInfo?.lastonline ? formatLastOnline(deviceInfo.lastonline) : 'N/A'}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.statsRow}>
                                {/* Created At */}
                                <View style={[styles.statCard, { backgroundColor: cardBgColor }]}>
                                    <Icon name="calendar" size={24} color="#7B1FA2" />
                                    <Text style={[styles.statLabel, { color: textColor }]}>Registered</Text>
                                    <Text style={[styles.statValue, { color: textColor }]}>
                                        {deviceInfo?.createdat ? new Date(deviceInfo.createdat).toLocaleDateString() : 'N/A'}
                                    </Text>
                                </View>

                                {/* New Storage Card */}
                                <View style={[styles.statCard, { backgroundColor: cardBgColor }]}>
                                    <Icon name="harddisk" size={24} color="#7B1FA2" />
                                    <Text style={[styles.statLabel, { color: textColor }]}>Storage</Text>
                                    <Text style={[styles.statValue, { color: textColor, marginBottom: 8 }]}>
                                        {storageData.getFormattedUsed()}
                                    </Text>
                                    <View style={styles.progressBarContainer}>
                                        <ProgressBar
                                            progress={storageData.getPercentage()}
                                            color="#7B1FA2"
                                            style={styles.progressBar}
                                        />
                                    </View>
                                </View>
                            </View>

                            <View style={styles.statsRow}>
                                {/* OS Info Card */}
                                <View style={[styles.statCard, { backgroundColor: cardBgColor }]}>
                                    <Icon name="microsoft-windows" size={24} color="#7B1FA2" />
                                    <Text style={[styles.statLabel, { color: textColor }]}>Operating System</Text>
                                    <Text style={[styles.statValue, { color: textColor }]}>
                                        {deviceStats.osName}
                                    </Text>
                                </View>

                                {/* Memory Usage Card */}
                                <View style={[styles.statCard, { backgroundColor: cardBgColor }]}>
                                    <Icon name="memory" size={24} color="#7B1FA2" />
                                    <Text style={[styles.statLabel, { color: textColor }]}>Memory Usage</Text>
                                    <Text style={[styles.statValue, { color: textColor, marginBottom: 8 }]}>
                                        {memoryData.getFormattedUsage()}
                                    </Text>
                                    <View style={styles.progressBarContainer}>
                                        <ProgressBar
                                            progress={memoryData.getPercentage()}
                                            color="#7B1FA2"
                                            style={styles.progressBar}
                                        />
                                    </View>
                                </View>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Capture Button - Fixed at bottom */}
                    <View style={[styles.captureButtonContainer, { backgroundColor: bgColor }]}>
                        <TouchableOpacity 
                            style={styles.captureButton}
                            onPress={() => {handleCapture(deviceId)}}
                        >
                            <Icon name="camera" size={24} color="#FFFFFF" />
                            <Text style={styles.captureButtonText}>Capture Screen</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}
            {error && (
                <Text style={styles.errorText}>{error}</Text>
            )}
            
            {/* New Image Viewer */}
            <ImageViewing
                images={[{ uri: deviceStats.lastImage }]}
                imageIndex={0}
                visible={isImageViewerVisible}
                onRequestClose={() => setIsImageViewerVisible(false)}
                backgroundColor="rgba(0,0,0,0.9)"
                FooterComponent={({ imageIndex }) => (
                    <View style={styles.imageViewerFooter}>
                        <Text style={styles.imageViewerText}>Screenshot</Text>
                    </View>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'transparent',
        zIndex: 1,
    },
    stickySection: {
        backgroundColor: 'transparent',
        zIndex: 1,
    },
    imageViewerContainer: {
        height: 250,
        marginHorizontal: 16,
        marginBottom: 16,
        backgroundColor: 'transparent',
        borderRadius: 12,
        overflow: 'hidden',
    },
    imageCard: {
        // flex: 1,
        // borderRadius: 12,
        // overflow: 'hidden',
        // backgroundColor: 'transparent',
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 80, // Space for capture button
    },
    statsContainer: {
        paddingTop: 8,
    },
    captureButtonContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
    },
    image: {
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        margin: 8,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        minHeight: 120,
    },
    statLabel: {
        fontSize: 14,
        marginTop: 8,
        opacity: 0.7,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 4,
    },
    captureButton: {
        flexDirection: 'row',
        backgroundColor: '#7B1FA2',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
    },
    captureButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    deviceName: {
        fontSize: 24,
        fontWeight: 'bold',
        marginLeft: 12,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loaderText: {
        marginTop: 16,
        fontSize: 16,
    },
    errorText: {
        color: '#FF5252',
        textAlign: 'center',
        marginTop: 16,
    },
    progressBarContainer: {
        width: '100%',
        paddingHorizontal: 4,
    },
    progressBar: {
        height: 8,
        borderRadius: 4,
    },
    statusContainer: {
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        opacity: 0.9,
    },
    statusText: {
        color: '#FFFFFF',
        textAlign: 'center',
        fontSize: 14,
        fontWeight: '500',
    },
    noImageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    noImageText: {
        marginTop: 12,
        fontSize: 16,
        textAlign: 'center',
    },
    imageContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    imageViewerFooter: {
        height: 64,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageViewerText: {
        color: '#FFF',
        fontSize: 16,
    }
});

export default CaptureScreen;