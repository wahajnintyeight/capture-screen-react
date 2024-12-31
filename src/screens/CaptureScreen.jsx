import { View, Text, StyleSheet, ScrollView, Dimensions, useColorScheme, TouchableOpacity, Alert, RefreshControl, ActivityIndicator, Image, LogBox, Share, Platform } from "react-native"
import apiManager from "../services/APIManager";
import { useEffect, useState, useCallback, useRef } from "react";
import { Snackbar, Card, ProgressBar } from 'react-native-paper';
// import {  Easing } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SSEManager from '../services/SSEManager';
import ImageViewing from 'react-native-image-viewing';
import LinearGradient from 'react-native-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import Animated, { 
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
    useAnimatedStyle,
    interpolate,
    Easing,
    cancelAnimation,
} from 'react-native-reanimated';

LogBox.ignoreLogs([
  '[Reanimated] Reduced motion setting is enabled on this device.',
]);

const CaptureScreen = ({ navigation,route }) => {
    const colorScheme = useColorScheme();
    // console.log("Capture Screen", route)
    const textColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';
    const bgColor = colorScheme === 'dark' ? '#1A1A1A' : '#F0E6FF';
    const cardBgColor = colorScheme === 'dark' ? '#2D2D2D' : '#FFFFFF';


    const [deviceInfo, setDeviceInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPinging, setIsPinging] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [error, setError] = useState(null);
    const [captureStatus, setCaptureStatus] = useState('idle'); // 'idle', 'capturing', 'success', 'error'
    const [captureMessage, setCaptureMessage] = useState('');
    const [connectionStatus, setConnectionStatus] = useState(null);
    const [deviceStats, setDeviceStats] = useState({
        memoryUsage: route?.params?.memoryUsage || '0 / 1',
        diskUsage: route?.params?.diskUsage || '0 / 1',
        osName: route?.params?.osName || 'N/A',
        // imageBlob: route?.params?.imageBlob || null,
        lastImage: route?.params?.lastImage || null
    });
    const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
    const [pingStatus, setPingStatus] = useState(null);
    const [showSnackbar, setShowSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [isReconnecting, setIsReconnecting] = useState(false);
    const reconnectAnimation = useSharedValue(1);
    const [isImageLoading, setIsImageLoading] = useState(true);
    const spinnerRotation = useSharedValue(0);
    const [isCardsLoading, setIsCardsLoading] = useState(false);
    const spinValue = useSharedValue(0);

    const deviceId = route?.params?.deviceId;
    const deviceName = route?.params?.deviceName;
    const pingAnimationValue = useSharedValue(1);

    // Add gradient animation
    const gradientPosition = useSharedValue(0);

    // Create animated style for ping animation using Reanimated 2
    const pingIconStyle = useAnimatedStyle(() => {
        const scale = interpolate(
            pingAnimationValue.value,
            [0, 0.5, 1],
            [1, 1.2, 1]
        );
        
        return {
            transform: [{ scale }]
        };
    });

    // Initialize animation in useEffect
    useEffect(() => {
        pingAnimationValue.value = withRepeat(
            withSequence(
                withTiming(1.2, { duration: 1000, easing: Easing.ease }),
                withTiming(1, { duration: 1000, easing: Easing.ease })
            ),
            -1,
            true
        );
    }, []);

    // Update the ping animation
    const startPingAnimation = () => {
        pingAnimationValue.value = withSequence(
            withTiming(1, { duration: 1000, easing: Easing.ease }),
            withTiming(0, { duration: 1000, easing: Easing.ease })
        );
    };

    // Handle ping response and SSE updates
    const updateDeviceStats = useCallback((data) => {
        console.log('Updating device stats with:', data);
        
        // Create a new stats object with all fields
        const updatedStats = {
            ...deviceStats,
            ...data,
            // Parse memory and disk usage if they exist
            memoryUsage: data.memoryUsage || deviceStats?.memoryUsage,
            diskUsage: data.diskUsage || deviceStats?.diskUsage,
            lastImage: data.lastImage || deviceStats?.lastImage,
            isOnline: data.isOnline !== undefined ? data.isOnline : deviceStats?.isOnline,
            lastOnline: data.lastOnline || deviceStats?.lastOnline,
        };

        setDeviceStats(updatedStats);

        // Update memory usage state
        if (data.memoryUsage) {
            const [used, total] = parseMemoryUsage(data.memoryUsage);
            setMemoryUsed(used);
            setMemoryTotal(total);
        }

        // Update storage usage state
        if (data.diskUsage) {
            const [used, total] = parseStorageUsage(data.diskUsage);
            setStorageUsed(used);
            setStorageTotal(total);
        }
    }, [deviceStats]);

    // Handle ping response
    const handlePing = async () => {
        if (isPinging || isCapturing) return;

        try {
            setIsPinging(true);
            setPingStatus('pending');
            
            // Start loading animation
            setIsCardsLoading(true);
            setIsMemoryCardLoading(true);
            setIsStorageCardLoading(true);
            setIsStatusCardLoading(true);
            startSpinnerAnimation();

            const response = await apiManager.pingDevice(deviceName);
            console.log('Ping response:', response);

            if (response?.code === 1082) {
                setPingStatus('success');
                setSnackbarMessage('Ping Device Event Sent Successfully');
                setIsCardsLoading(true);
                startSpinnerAnimation();
            } else {
                setPingStatus('error');
                setSnackbarMessage('Failed to send Ping Device Event');
                // Stop loading only on error
                setIsCardsLoading(false);
                stopSpinnerAnimation();
            }
        } catch (error) {
            console.error('Ping error:', error);
            setPingStatus('error');
            setSnackbarMessage('Failed to send Ping Device Event');
            // Stop loading on error
            setIsCardsLoading(false);
            stopSpinnerAnimation();
        } finally {
            // setIsPinging(false);
            setShowSnackbar(true);
        }
    };

    // Listen for SSE updates
    useEffect(() => {
        const handleSSEUpdate = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('SSE Update received:', data);
                updateDeviceStats(data);
                
                // Stop loading when SSE data is received
                setIsCardsLoading(false);
                stopSpinnerAnimation();
            } catch (error) {
                console.error('Error handling SSE update:', error);
            }
        };

        const unsubscribe = SSEManager.subscribe(deviceName, handleSSEUpdate);
        return () => {
            if (unsubscribe) unsubscribe();
            // Cleanup animation on unmount
            stopSpinnerAnimation();
        };
    }, [deviceName, updateDeviceStats]);

    // Helper function to parse memory usage
    const parseMemoryUsage = (memoryString) => {
        try {
            console.log('Parsing memory used from:', memoryString);
            const [used, total] = memoryString.split('/').map(part => 
                parseFloat(part.trim().replace('GiB', ''))
            );
            return [used, total];
        } catch (error) {
            console.error('Error parsing memory usage:', error);
            return [0, 0];
        }
    };

    // Helper function to parse storage usage
    const parseStorageUsage = (storageString) => {
        try {
            console.log('Parsing storage used from:', storageString);
            const [used, total] = storageString.split('/').map(part => 
                parseFloat(part.trim().replace('GiB', ''))
            );
            return [used, total];
        } catch (error) {
            console.error('Error parsing storage usage:', error);
            return [0, 0];
        }
    };

    // Initialize gradient animation
    useEffect(() => {
        gradientPosition.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 2000 }),
                withTiming(0, { duration: 2000 })
            ),
            -1,
            true
        );
    }, []);

    const gradientColors = {
        light: ['#F6F0FF', '#F0E6FF', '#E8DDFF'],
        dark: ['#13111C', '#221C3D', '#2D1B54']
    };

    // Snackbar theme configurations
    const snackbarThemes = {
        success: {
            light: {
                background: 'rgba(156, 39, 176, 0.95)',
                text: '#FFFFFF',
                action: '#E0B0FF'
            },
            dark: {
                background: 'rgba(255, 253, 250, 0.95)',
                text: '#2D1B54',
                action: '#9C27B0'
            }
        },
        error: {
            light: {
                background: 'rgba(244, 67, 54, 0.95)',
                text: '#FFFFFF',
                action: '#FFB4AB'
            },
            dark: {
                background: 'rgba(255, 253, 250, 0.95)',
                text: '#B3261E',
                action: '#DC362E'
            }
        }
    };

    // Get snackbar theme based on message type
    const getSnackbarTheme = () => {
        const isError = snackbarMessage.toLowerCase().includes('error') || 
                       snackbarMessage.toLowerCase().includes('failed');
        const theme = isError ? snackbarThemes.error : snackbarThemes.success;
        return colorScheme === 'dark' ? theme.dark : theme.light;
    };

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
            console.log("Event | HandleEvents:",data)
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
            if (data.type === 'capture_screen') {
                const deviceData = data.message;
                console.log("CAPTURE | Device Data:",deviceData)

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
                        isOnline: deviceData.isOnline,
                        lastOnline: deviceData.lastOnline,
                        deviceName: deviceData.deviceName
                    }));
                }
                setIsMemoryCardLoading(false);
                setIsStorageCardLoading(false);
                setIsStatusCardLoading(false);
                stopSpinnerAnimation();

                return;
            }

            if (data.type === 'ping_device'){
                // setPingStatus(data.status);

                const deviceData = data.message;
                console.log("PING | Device Data:",deviceData)
                setSnackbarMessage("Device pinged successfully");
                setShowSnackbar(true);

                // setDeviceStats({
                //     memoryUsage: deviceData.memoryUsage || 'N/A',
                //     diskUsage: deviceData.diskUsage || 'N/A',
                //     osName: deviceData.osName || 'N/A',
                //     isOnline: deviceData.isOnline,
                //     lastOnline: deviceData.lastOnline,
                //     deviceName: deviceData.deviceName
                // });

                // Update device info
                if (deviceData.isOnline !== undefined) {
                    setDeviceInfo(prevInfo => ({
                        ...prevInfo,
                        isOnline: deviceData.isOnline,
                        lastOnline: deviceData.lastOnline,
                        deviceName: deviceData.deviceName,
                        memoryUsage: deviceData.memoryUsage,
                        diskUsage: deviceData.diskUsage,
                        osName: deviceData.osName
                    }));
                }

                setIsCardsLoading(false);
                setIsPinging(false);

                setIsMemoryCardLoading(false);
                setIsStorageCardLoading(false);
                setIsStatusCardLoading(false);
                
                stopSpinnerAnimation();

                return;
            }

            // Handle existing capture events
            const { event, message, deviceName } = data;
            console.log("Event:",event)
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
        if (!deviceId || isCapturing) return;

        try {
            setIsCapturing(true); // Disable both buttons
            setCaptureStatus('capturing');
            setCaptureMessage('Initiating screen capture...');

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
            setIsCapturing(false); // Re-enable buttons
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

    
    // Update the storageData object to use actual device stats
    const storageData = {
        used: (() => {
            try {
                 
                return deviceStats.diskUsage ? Number(deviceStats.diskUsage.split('/')[0].replace(' GiB', '').trim()) : 0;
            } catch (err) {
                console.error('Error parsing storage used:', err);
                return 0;
            }
        })(),
        total: (() => {
            try {
                
                return deviceStats.diskUsage ? Number(deviceStats.diskUsage.split('/')[1].replace(' GiB', '').trim()) : 1;
            } catch (err) {
                console.error('Error parsing storage total:', err);
                return 1;
            }
        })(),
        getPercentage: function() {
          
            try {
              const fraction = (this.used / this.total) || 0;
              // Only round at the fraction stage to 2 decimals
              const fraction2dec = parseFloat(fraction.toFixed(2));
              
              return parseFloat(Math.min(Math.max(fraction2dec, 0), 0.5).toFixed(2));
            } catch (err) {
              console.log('Error calculating percentage:', err);
              return 1;
            }
        },
        getFormattedUsed: function() {
            try {
                
                return deviceStats.diskUsage || 'N/A';
            } catch (err) {
                console.error('Error getting formatted storage usage:', err);
                return 'N/A';
            }
        }
    };

    // Add memory usage calculation
    const memoryData = {
        used: (() => {
            try {
                console.log('Parsing memory used from:', deviceStats.memoryUsage);
                return deviceStats.memoryUsage ? Number(deviceStats.memoryUsage.split('/')[0].replace(' GiB', '').trim()) : 0;
            } catch (err) {
                console.error('Error parsing memory used:', err);
                return 0;
            }
        })(),
        total: (() => {
            try {
            
                return deviceStats.memoryUsage ? Number(deviceStats.memoryUsage.split('/')[1].replace(' GiB', '').trim()) : 1;
            } catch (err) {
                console.error('Error parsing memory total:', err);
                return 1;
            }
        })(),
        getPercentage: function() {
           
            try {
              // Handle division by zero
              if (this.total === 0) return 0;
              
              // Calculate fraction and handle floating point precision
              const fraction = this.used / this.total;
              
              // Round to 2 decimal places using multiplication method
              // This avoids floating point precision issues
              const fraction2dec = Math.round(fraction * 100) / 100;
              
              // Clamp between 0 and 1
      
              return parseFloat(Math.min(Math.max(fraction2dec, 0), 0.5).toFixed(2));
            } catch (err) {
              console.error('Error calculating percentage:', err);
              return 0;
            }
        },
        getFormattedUsage: function() {
            try {
                
                return deviceStats.memoryUsage || 'N/A';
            } catch (err) {
                console.log('Error getting formatted memory usage:', err);
                return 1;
            }
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

            if (connectionStatus.status === 'disconnected' || connectionStatus.status === 'error') {
                return (
                    <TouchableOpacity 
                        style={styles.reconnectStatusButton}
                        onPress={handleReconnect}
                    >
                        <Icon name="refresh" size={20} color="#FFFFFF" />
                        <Text style={styles.reconnectStatusText}>
                            Reconnect to Server
                        </Text>
                    </TouchableOpacity>
                );
            }

            return (
                <View style={[styles.statusContainer, { backgroundColor: statusColors[connectionStatus.status] }]}>
                    <Text style={styles.statusText}>{connectionStatus.message}</Text>
                </View>
            );
        }

        return renderCaptureStatus();
    };

    // Create a proper images array for the viewer
    const getImageForViewer = () => {
        if (!deviceStats.lastImage) return [];
        console.log('Image for viewer:', deviceStats.lastImage);
        return [{
            uri: deviceStats.lastImage,
        }];
    };

    const handleLongPress = async () => {
        if (!deviceStats?.lastImage) return;

        try {
            const result = await Share.share({
                url: deviceStats.lastImage, // iOS
                message: Platform.OS === 'android' ? deviceStats.lastImage : undefined, // Android requires message
                title: 'View Screenshot', // Android only
            }, {
                // Dialog title (Android only)
                dialogTitle: 'Open screenshot with...',
                // Anchor for iPad
                anchor: Platform.OS === 'ios' ? getAnchorTag() : undefined,
            });

            if (result.action === Share.sharedAction) {
                if (result.activityType) {
                    console.log('Shared with activity type:', result.activityType);
                } else {
                    console.log('Shared successfully');
                }
            } else if (result.action === Share.dismissedAction) {
                console.log('Share dismissed');
            }
        } catch (error) {
            console.error('Error sharing:', error);
            setSnackbarMessage('Failed to share image');
            setShowSnackbar(true);
        }
    };

    // Start spinner animation
    useEffect(() => {
        if (isImageLoading) {
            spinnerRotation.value = withRepeat(
                withTiming(360, {
                    duration: 1000,
                    easing: Easing.linear,
                }),
                -1, // Infinite repetition
                false // Don't reverse the animation
            );
        } else {
            spinnerRotation.value = withSequence(
                withTiming(360, {
                    duration: 200,
                    easing: Easing.linear,
                }),
                withTiming(0, { duration: 0 })
            );
        }
    }, [isImageLoading]);

    // Animated style for spinner
    const spinnerStyle = useAnimatedStyle(() => {
        return {
            transform: [{ rotate: `${spinnerRotation.value}deg` }],
        };
    });

    const renderImageSection = () => {
        return (
            <View style={styles.imageSectionContainer}>
                <View style={styles.imageCard}>
                    {deviceStats?.lastImage ? (
                        <View style={styles.imageWrapper}>
                            <Image 
                                source={{ uri: deviceStats.lastImage }}
                                style={styles.mainImage}
                                resizeMode="contain"
                                onLoadStart={() => setIsImageLoading(true)}
                                onLoadEnd={() => setIsImageLoading(false)}
                                onError={(e) => {
                                    console.error('Image Error:', e.nativeEvent.error);
                                    setIsImageLoading(false);
                                }}
                            />
                            
                            {/* Loading Spinner Overlay */}
                            {isImageLoading && (
                                <View style={styles.spinnerContainer}>
                                    <Animated.View style={[styles.spinner, spinnerStyle]}>
                                        <ActivityIndicator 
                                            size="large" 
                                            color="#7B1FA2"
                                        />
                                    </Animated.View>
                                    <Text style={styles.loadingText}>Loading image...</Text>
                                </View>
                            )}

                            {/* Controls */}
                            <View style={styles.imageControls}>
                                <TouchableOpacity 
                                    style={styles.fullscreenButton}
                                    onPress={() => setIsImageViewerVisible(true)}
                                >
                                    <Icon name="fullscreen" size={24} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.noImageContainer}>
                            <Icon name="image-off" size={48} color="#7B1FA2" />
                            <Text style={[styles.noImageText, { color: textColor }]}>
                                No screenshot available
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    // Create animated style for reconnect button
    const reconnectAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: reconnectAnimation.value }],
            opacity: interpolate(
                reconnectAnimation.value,
                [0.8, 1, 1.2],
                [0.8, 1, 0.8]
            ),
        };
    });

    // Animation for reconnect button
    const startReconnectAnimation = () => {
        reconnectAnimation.value = withRepeat(
            withSequence(
                withTiming(1.2, { duration: 1000, easing: Easing.ease }),
                withTiming(0.8, { duration: 1000, easing: Easing.ease })
            ),
            -1,
            true
        );
    };

    // Stop reconnect animation
    const stopReconnectAnimation = () => {
        reconnectAnimation.value = withTiming(1, { duration: 300 });
    };

    // Add reconnect handler with animation
    const handleReconnect = async () => {
        if (isReconnecting) return;

        try {
            setIsReconnecting(true);
            startReconnectAnimation();
            
            // First try to ping the device
            const pingResponse = await apiManager.pingDevice(deviceName);
            
            if (pingResponse?.code === 1082) {
                setSnackbarMessage('Ping Device Event Sent Successfully');
                setShowSnackbar(true);
                
                // Then reconnect SSE
                await SSEManager.connect();
                
                setConnectionStatus({
                    status: 'connected',
                    message: 'Connected to server'
                });
            } else {
                throw new Error('Ping failed');
            }
        } catch (err) {
            console.error('Error during reconnection:', err);
            setSnackbarMessage('Failed to reconnect to server');
            setShowSnackbar(true);
            setConnectionStatus({
                status: 'error',
                message: 'Connection failed'
            });
        } finally {
            setIsReconnecting(false);
            stopReconnectAnimation();
        }
    };

    // Render the reconnect button with animation
    const renderReconnectButton = () => (
        <Animated.View style={reconnectAnimatedStyle}>
            <TouchableOpacity 
                style={styles.reconnectButton}
                onPress={handleReconnect}
            >
                <Icon name="refresh" size={20} color="#FFFFFF" />
                <Text style={styles.reconnectStatusText}>
                    Reconnect to Server
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );

    // Modify the header section to include the reconnect button
    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <View style={styles.headerLeft}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-left" size={24} color="#7B1FA2" />
                </TouchableOpacity>
                <Icon name="desktop-tower-monitor" size={28} color="#7B1FA2" />
                <Text style={[styles.deviceName, { color: textColor }]}>
                    {deviceInfo?.deviceName || 'Unknown Device'}
                </Text>
            </View>
            {!deviceInfo?.isOnline && (
                <TouchableOpacity 
                    style={styles.reconnectButton}
                    onPress={handleReconnect}
                >
                    <Icon name="refresh" size={20} color="#FFFFFF" />
                </TouchableOpacity>
            )}
        </View>
    );

    // Add logging to track state changes
    useEffect(() => {
        console.log("IS IMAGE VISIBLE", isImageViewerVisible)
    }, [isImageViewerVisible]);

    // Add loading states for cards
    const [isMemoryCardLoading, setIsMemoryCardLoading] = useState(false);
    const [isStorageCardLoading, setIsStorageCardLoading] = useState(false);
    const [isStatusCardLoading, setIsStatusCardLoading] = useState(false);

    // Spinner animation value
    // const spinValue = useSharedValue(0);


    // Start spinner animation
    const startSpinnerAnimation = () => {
        spinValue.value = withRepeat(
            withTiming(360, {
                duration: 1000,
                easing: Easing.linear,
            }),
            -1
        );
    };

    // Stop spinner animation
    const stopSpinnerAnimation = () => {
        cancelAnimation(spinValue);
        spinValue.value = withTiming(0);
    };

    // Add loading spinner component
    const LoadingSpinner = () => (
        <Animated.View style={[styles.spinnerOverlay, spinnerStyle]}>
            <ActivityIndicator color="#7B1FA2" size="small" />
        </Animated.View>
    );

    return (
        <LinearGradient
            colors={colorScheme === 'dark' ? gradientColors.dark : gradientColors.light}
            style={styles.container}
        >
            {renderStatus()}
            
            {/* Only show loading if device is online and loading */}
            {isLoading && deviceInfo?.isOnline && !connectionStatus?.status === 'disconnected' ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#7B1FA2" />
                    <Text style={[styles.loaderText, { color: textColor }]}>
                        Loading device data...
                    </Text>
                </View>
            ) : (
                <>
                    {renderHeader()}
                    {/* Image Viewer Section - Sticky */}
                    <View style={styles.stickySection}>
                        <View style={styles.imageViewerContainer}>
                           
                            {/* <Image 
                                source={{ uri: 'https://res.cloudinary.com/djvpc14v7/image/upload/v1735144729/screen_captures/DESKTOP-SQ3S8SE_2024-12-25T21:38:48%2B05:00.jpg' }}
                                style={styles.image}
                            /> */}

                                {renderImageSection()}
                            
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
                                        name={deviceInfo?.isOnline ? "access-point" : "access-point-off"} 
                                        size={24} 
                                        color={deviceInfo?.isOnline ? "#4CAF50" : "#FF5252"} 
                                    />
                                    <Text style={[styles.statLabel, { color: textColor }]}>Status</Text>
                                    {isStatusCardLoading && <LoadingSpinner />}
                                    <Text style={[styles.statValue, { color: deviceInfo?.isOnline ? "#4CAF50" : "#FF5252" }]}>
                                        {deviceInfo?.isOnline ? 'Online' : 'Offline'}
                                    </Text>
                                </View>

                                {/* Last Online */}
                                <View style={[styles.statCard, { backgroundColor: cardBgColor }]}>
                                    <Icon name="clock-outline" size={24} color="#7B1FA2" />
                                    <Text style={[styles.statLabel, { color: textColor }]}>Last Online</Text>
                                    <Text style={[styles.statValue, { color: textColor }]}>
                                        {deviceInfo?.lastOnline ? formatLastOnline(deviceInfo.lastOnline) : 'N/A'}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.statsRow}>
                                {/* Created At */}
                                <View style={[styles.statCard, { backgroundColor: cardBgColor }]}>
                                    <Icon name="calendar" size={24} color="#7B1FA2" />
                                    <Text style={[styles.statLabel, { color: textColor }]}>Registered</Text>
                                    <Text style={[styles.statValue, { color: textColor }]}>
                                        {deviceInfo?.createdAt ? new Date(deviceInfo.createdAt).toLocaleDateString() : 'N/A'}
                                    </Text>
                                </View>

                                {/* New Storage Card */}
                                <View style={[styles.statCard, { backgroundColor: cardBgColor }]}>
                                    <Icon name="harddisk" size={24} color="#7B1FA2" />
                                    <Text style={[styles.statLabel, { color: textColor }]}>Storage</Text>
                                    <Text style={[styles.statValue, { color: textColor, marginBottom: 8 }]}>
                                        {storageData.getFormattedUsed()}
                                    </Text>
                                    {isStorageCardLoading && <LoadingSpinner />}
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
                                    {isMemoryCardLoading && <LoadingSpinner />}
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
                    <View style={[styles.actionButtonsContainer]}>
                        {/* Ping Button */}
                        <TouchableOpacity 
                            style={[
                                styles.actionButton, 
                                styles.pingButton,
                                (isPinging || isCapturing) && styles.actionButtonDisabled
                            ]}
                            onPress={handlePing}
                            disabled={isPinging || isCapturing}
                        >
                            <Animated.View style={pingIconStyle}>
                                <Icon 
                                    name={
                                        isPinging ? "access-point-network" : 
                                        pingStatus === 'success' ? "check-circle" : 
                                        "access-point"
                                    } 
                                    size={24} 
                                    color="#FFFFFF" 
                                />
                            </Animated.View>
                            <Text style={styles.actionButtonText}>
                                {isPinging ? 'Pinging...' : 'Ping'}
                            </Text>
                        </TouchableOpacity>

                        {/* Capture Button */}
                        <TouchableOpacity 
                            style={[
                                styles.actionButton, 
                                styles.captureButton,
                                (isPinging || isCapturing) && styles.actionButtonDisabled
                            ]}
                            onPress={() => handleCapture(deviceId)}
                            disabled={isPinging || isCapturing}
                        >
                            <Icon name="camera" size={24} color="#FFFFFF" />
                            <Text style={styles.actionButtonText}>
                                {isCapturing ? 'Capturing...' : 'Capture'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}
            {error && (
                <Text style={styles.errorText}>{error}</Text>
            )}
            
            {/* New Image Viewer */}
            {/* {isImageViewerVisible == true && ( */}
                <ImageViewing
                    images={getImageForViewer()}
                    imageIndex={0}
                    visible={isImageViewerVisible}
                    onRequestClose={() => {
                        console.log('Closing image viewer from onRequestClose');
                        setIsImageViewerVisible(false);
                    }}
                // backgroundColor="rgba(0, 0, 0, 0.95)"
                presentationStyle="fullScreen"
                animationType="fade"
                FooterComponent={() => (
                    <View style={styles.imageViewerFooter}>
                        <TouchableOpacity 
                            style={styles.closeButton}
                            onPress={() => {
                                console.log('Closing image viewer');
                                setIsImageViewerVisible(false);
                            }}
                        >
                            <Icon name="close" size={24} color="#FFFFFF" />
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                )}
            />
            {/* )} */}

            <Snackbar
                visible={showSnackbar}
                onDismiss={() => setShowSnackbar(false)}
                duration={3000}
                style={[
                    styles.snackbar,
                    {
                        backgroundColor: getSnackbarTheme().background,
                    },
                    colorScheme === 'dark' && styles.snackbarDark
                ]}
                action={{
                    label: 'Dismiss',
                    onPress: () => setShowSnackbar(false),
                    labelStyle: {
                        color: getSnackbarTheme().action,
                        fontWeight: '600',
                        fontSize: 14,
                    }
                }}
            >
                <View style={styles.snackbarContent}>
                    <Icon 
                        name={snackbarMessage.toLowerCase().includes('error') ? 'alert-circle' : 'check-circle'} 
                        size={24} 
                        color={getSnackbarTheme().text} 
                        style={styles.snackbarIcon}
                    />
                    <Text style={[
                        styles.snackbarText,
                        { color: getSnackbarTheme().text }
                    ]}>
                        {snackbarMessage}
                    </Text>
                </View>
            </Snackbar>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'transparent',
        zIndex: 1,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
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
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    image: {
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent',
    },
    fullscreenButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 8,
        padding: 8,
        zIndex: 1,
    },
    fullscreenButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    fullscreenButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    imageViewerFooter: {
        height: 64,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    closeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    closeButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    reconnectButton: {
        backgroundColor: '#7B1FA2',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    reconnectStatusButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#7B1FA2',
        padding: 12,
        borderRadius: 8,
        marginHorizontal: 16,
        marginBottom: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    reconnectStatusText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 8,
    },
    actionButtonsContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        flexDirection: 'row',
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    actionButtonDisabled: {
        opacity: 0.6,
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    pingButton: {
        backgroundColor: '#4CAF50',
    },
    captureButton: {
        backgroundColor: '#7B1FA2',
    },
    snackbar: {
        borderRadius: 12,
        marginBottom: 24,
        marginHorizontal: 16,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.27,
        shadowRadius: 4.65,
    },
    snackbarDark: {
        borderWidth: 1,
        borderColor: 'rgba(156, 39, 176, 0.1)',
        shadowColor: 'rgba(156, 39, 176, 0.3)',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    snackbarContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
    },
    snackbarIcon: {
        marginRight: 12,
    },
    snackbarText: {
        fontSize: 15,
        fontWeight: '500',
        letterSpacing: 0.3,
        flex: 1,
    },
    imageSectionContainer: {
        padding: 16,
    },
    imageCard: {
        height: 300,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    imageWrapper: {
        flex: 1,
        position: 'relative',
    },
    mainImage: {
        width: '100%',
        height: '100%',
    },
    hintContainer: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        right: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    hintText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '500',
    },
    spinnerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    spinner: {
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#FFFFFF',
        marginTop: 12,
        fontSize: 14,
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    imageControls: {
        position: 'absolute',
        top: 12,
        right: 12,
        flexDirection: 'row',
        gap: 8,
    },
    spinnerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 1,
    },
});

export default CaptureScreen;
