import { View, Text, StyleSheet, ScrollView, Dimensions, useColorScheme, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from "react-native"
import apiManager from "../services/APIManager";
import { useEffect, useState, useCallback, useRef } from "react";
// import { Ionicons } from '@expo/vector-icons';
import DeviceCard from '../components/DeviceCard';
import { FAB, Portal, Snackbar } from 'react-native-paper';
import { Animated, Easing } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';



const Home = ({ navigation }) => {
    const [devices, setDevices] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const colorScheme = useColorScheme();
    const [isLoading, setIsLoading] = useState(false);
    const [loadingDeviceId, setLoadingDeviceId] = useState(null);
    const [deletingDeviceId, setDeletingDeviceId] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const spinValue = useRef(new Animated.Value(0)).current;
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    

    useEffect(() => {
        fetchDevices();
    }, [])

    useEffect(() => {
        if (isScanning) {
            Animated.loop(
                Animated.timing(spinValue, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();
        } else {
            spinValue.setValue(0);
        }
    }, [isScanning]);

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    const fetchDevices = async () => {
        setIsLoading(true);
        try {
            const response = await apiManager.getDevices();
            if (response?.code && response.result) {
                if (!response.result.devices || response.result.devices.length === 0) {
                    Alert.alert(
                        "No Devices Found",
                        "There are currently no devices available.",
                        [{ text: "OK" }]
                    );
                }
                // console.log("Devices:", response.result.devices.map(device => device))
                setDevices(response.result.devices || []);
            } else {
                Alert.alert(
                    "Error",
                    "Failed to fetch devices. Please try again later.",
                    [{ text: "OK" }]
                );
            }
        } catch (error) {
            console.error("Error fetching devices:", error);
            Alert.alert(
                "Error",
                "Failed to fetch devices. Please try again later.",
                [{ text: "OK" }]
            );
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    const textColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';
    const bgColor = colorScheme === 'dark' ? '#1A1A1A' : '#F0E6FF';
    const cardBgColor = colorScheme === 'dark' ? '#2D2D2D' : '#FFFFFF';

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await fetchDevices();
        } finally {
            setRefreshing(false);
        }
    }, []);

    const handlePing = useCallback(async (deviceId) => {
        setLoadingDeviceId(deviceId);
        try {
            await apiManager.pingDevice(deviceId);
        } finally {
            setLoadingDeviceId(null);
        }
    }, []);

    const handleOnCapture = useCallback(async (deviceId, deviceName) => {
        setLoadingDeviceId(deviceId);
        console.log("Capturing screen for device:", deviceId, deviceName)
        try {
            await apiManager.captureScreen(deviceId, deviceName);
        } finally {
            setLoadingDeviceId(null);
        }
    }, []);

    const handleDeleteDevice = async (deviceId) => {
        setDeletingDeviceId(deviceId);
        try {
            console.log("Attempting to delete device:", deviceId)
            const response = await apiManager.deleteDevice(deviceId);
            if (response && response.code === 1077) {
                fetchDevices();
            } else {
                Alert.alert("Error", "Failed to delete device");
            }
        } catch (error) {
            Alert.alert("Error", "Failed to delete device");
        } finally {
            setDeletingDeviceId(null);
        }
    };

    const showSnackbar = (message) => {
        setSnackbarMessage(message);
        setSnackbarVisible(true);
    };

    const handleScan = async () => {
        if (isScanning) return;
        
        setIsScanning(true);
        showSnackbar('Scanning for new devices...');
        
        try {
            const response = await apiManager.scanDevices();
            console.log(response.code)
            if (response?.code === 1084) {
                showSnackbar('Scan completed successfully');
                fetchDevices();
            } else {
                if(response?.code === 1006){
                    await apiManager.createSession();
                    await fetchDevices();
                } else {
                    showSnackbar('Scan failed');
                }
            }
        } catch (error) {
            console.error('Scan error:', error);
            showSnackbar('Failed to scan devices');
        } finally {
            setIsScanning(false);
        }
    };

    const gradientColors = {
        light: ['#F6F0FF', '#F0E6FF', '#E8DDFF'],
        dark: ['#13111C', '#221C3D', '#2D1B54']
    };

    const cardGradient = {
        light: ['#FFFFFF', '#FAFAFA'],
        dark: ['rgba(45, 27, 84, 0.7)', 'rgba(29, 17, 54, 0.9)']
    };

    const glowStyle = colorScheme === 'dark' ? {
        shadowColor: '#9C27B0',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 10,
    } : {};

    return (
        <LinearGradient
            colors={colorScheme === 'dark' ? gradientColors.dark : gradientColors.light}
            style={styles.safeArea}
        >
            {/* Header Section - removed background color */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={[styles.title, { 
                        color: colorScheme === 'dark' ? '#FFFFFF' : textColor 
                    }]}>My Devices</Text>
                    <Text style={[styles.subtitle, { 
                        color: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : textColor 
                    }]}>
                        {devices.length} {devices.length === 1 ? 'device' : 'devices'}
                    </Text>
                </View>
                
                <TouchableOpacity 
                    style={[
                        styles.scanButton, 
                        isScanning && styles.scanningButton,
                        colorScheme === 'dark' && styles.scanButtonGlow
                    ]}
                    onPress={handleScan}
                    disabled={isScanning}
                >
                    <LinearGradient
                        colors={colorScheme === 'dark' 
                            ? ['#9C27B0', '#6A0DAD'] 
                            : ['#9C27B0', '#7B1FA2']}
                        style={styles.scanButtonGradient}
                    >
                        <Animated.View
                            style={{
                                transform: isScanning ? [{ rotate: spin }] : [],
                            }}
                        >
                            <Icon 
                                name={isScanning ? 'loading' : 'refresh'} 
                                size={20} 
                                color="white" 
                            />
                        </Animated.View>
                        <Text style={styles.scanButtonText}>
                            {isScanning ? 'Scanning...' : 'Scan'}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* Main Content */}
            <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#7B1FA2']}
                        tintColor={textColor}
                        title="Pull to refresh"
                        titleColor={textColor}
                    />
                }
            >
                {isLoading ? (
                    <ActivityIndicator 
                        size="large" 
                        color="#7B1FA2"
                        style={styles.loader}
                    />
                ) : devices.length > 0 ? (
                    <View style={styles.gridContainer}>
                        {devices.map((device, index) => (
                            <DeviceCard
                                key={device._id}
                                device={device}
                                textColor={textColor}
                                onRefresh={() => handlePing(device._id)}
                                onCapture={() => handleOnCapture(device._id, device.deviceName)}
                                onDelete={() => handleDeleteDevice(device._id)}
                                isCapturing={loadingDeviceId === device._id}
                                isDeleting={deletingDeviceId === device._id}
                                navigation={navigation}
                            />
                        ))}
                    </View>
                ) : (
                    <View style={styles.emptyState}>
                        <Icon name="devices" size={48} color="#7B1FA2" />
                        <Text style={[styles.emptyStateTitle, { color: textColor }]}>
                            No Devices Found
                        </Text>
                        <Text style={[styles.emptyStateSubtitle, { color: textColor }]}>
                            Tap the scan button to search for devices
                        </Text>
                    </View>
                )}
            </ScrollView>

            <Snackbar
                visible={snackbarVisible}
                onDismiss={() => setSnackbarVisible(false)}
                duration={3000}
                style={[
                    styles.snackbar,
                    colorScheme === 'dark' && styles.snackbarDark
                ]}
                action={{
                    label: 'Dismiss',
                    onPress: () => setSnackbarVisible(false),
                    labelStyle: [
                        styles.snackbarActionLabel,
                        colorScheme === 'dark' && styles.snackbarActionLabelDark
                    ],
                }}
            >
                <Text style={[
                    styles.snackbarText,
                    colorScheme === 'dark' && styles.snackbarTextDark
                ]}>
                    {snackbarMessage}
                </Text>
            </Snackbar>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    headerLeft: {
        flex: 1,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 15,
        opacity: 0.7,
    },
    scanButton: {
        borderRadius: 8,
        overflow: 'hidden',
    },
    scanButtonGlow: {
        shadowColor: '#9C27B0',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 6,
    },
    scanButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 8,
    },
    scanningButton: {
        opacity: 0.7,
    },
    scanButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        alignItems: 'stretch',
        padding: 16,
    },
    loader: {
        marginTop: 40,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 12,
        backgroundColor: 'rgba(45, 27, 84, 0.3)',
        borderRadius: 16,
        margin: 16,
        padding: 24,
        shadowColor: '#9C27B0',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 10,
    },
    emptyStateTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 8,
    },
    emptyStateSubtitle: {
        fontSize: 15,
        opacity: 0.7,
        textAlign: 'center',
    },
    snackbar: {
        backgroundColor: 'rgba(156, 39, 176, 0.95)',
        borderRadius: 12,
        marginBottom: 16,
        marginHorizontal: 16,
        elevation: 6,
        shadowColor: '#9C27B0',
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.27,
        shadowRadius: 4.65,
    },
    snackbarDark: {
        backgroundColor: 'rgba(255, 253, 250, 0.95)',
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
    snackbarText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '500',
        letterSpacing: 0.3,
    },
    snackbarTextDark: {
        color: '#2D1B54',
        fontWeight: '600',
    },
    snackbarActionLabel: {
        color: '#E0B0FF',
        fontWeight: '600',
    },
    snackbarActionLabelDark: {
        color: '#9C27B0',
    },
});

export default Home;