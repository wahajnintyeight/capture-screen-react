import { View, Text, StyleSheet, ScrollView, Dimensions, useColorScheme, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from "react-native"
import apiManager from "../services/APIManager";
import { useEffect, useState, useCallback, useRef } from "react";
import { FAB, Portal, Snackbar, Card, ProgressBar } from 'react-native-paper';
import { Animated, Easing } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const CaptureScreen = ({ navigation,route }) => {
    const colorScheme = useColorScheme();
    console.log("Capture Screen", route)
    const textColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';
    const bgColor = colorScheme === 'dark' ? '#1A1A1A' : '#F0E6FF';
    const cardBgColor = colorScheme === 'dark' ? '#2D2D2D' : '#FFFFFF';


    const [deviceInfo, setDeviceInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

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


    const handleCapture = async (deviceId) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiManager.captureScreen(deviceId, deviceName);
        } catch (err) {
            console.error('Error capturing screen:', err);
            setError('An error occurred while capturing screen');
        } finally {
            setIsLoading(false);
        }
    }

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

    // Add storage data (you'll need to get this from your API)
    const storageData = {
        used: 128, // GB
        total: 512, // GB
        getPercentage: function() {
            return this.used / this.total;
        },
        getFormattedUsed: function() {
            return `${this.used}GB / ${this.total}GB`;
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            {isLoading ? (
                <ActivityIndicator size="large" color="#7B1FA2" style={styles.loader} />
            ) : (
                <>
                    {/* Device Name Header */}
                    <View style={styles.headerContainer}>
                        <Icon name="desktop-tower-monitor" size={28} color="#7B1FA2" />
                        <Text style={[styles.deviceName, { color: textColor }]}>
                            {deviceInfo?.devicename || 'Unknown Device'}
                        </Text>
                    </View>

                    {/* Image Viewer Row */}
                    <View style={styles.imageViewerContainer}>
                        <Card style={styles.imageCard}>
                            <Card.Cover 
                                source={{ uri: 'placeholder_image_url' }}
                                style={styles.image}
                            />
                        </Card>
                    </View>

                    {/* Stats Row */}
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

                        {/* Capture Button */}
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
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    imageViewerContainer: {
        flex: 1,
        marginBottom: 16,
    },
    imageCard: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
    image: {
        flex: 1,
        resizeMode: 'contain',
    },
    statsContainer: {
        flex: 1,
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
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 8,
    },
    deviceName: {
        fontSize: 24,
        fontWeight: 'bold',
        marginLeft: 12,
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
});

export default CaptureScreen;