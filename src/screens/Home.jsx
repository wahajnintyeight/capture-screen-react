import { View, Text, StyleSheet, ScrollView, Dimensions, useColorScheme, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from "react-native"
import apiManager from "../services/APIManager";
import { useEffect, useState, useCallback, useRef } from "react";
// import { Ionicons } from '@expo/vector-icons';
import DeviceCard from '../components/DeviceCard';
import { FAB, Portal, Snackbar } from 'react-native-paper';
import { Animated, Easing } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const IconFallback = ({ name, size, color, style }) => (
    <View style={[{ width: size, height: size }, style]} />
);

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
    
    const Icon =  IconFallback;

    console.log("Home Screen")
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
            if (response?.code === 1000) {
                showSnackbar('Scan completed successfully');
                fetchDevices();
            } else {
                showSnackbar('Scan failed');
            }
        } catch (error) {
            console.error('Scan error:', error);
            showSnackbar('Failed to scan devices');
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <>
            <ScrollView 
                style={[styles.container, { backgroundColor: bgColor }]}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#7B1FA2']} // Android
                        tintColor={textColor} // iOS
                        title="Pull to refresh" // iOS
                        titleColor={textColor} // iOS
                    />
                }
            >
                <View style={styles.header}>
                    <Text style={[styles.title, { color: textColor }]}>My Devices</Text>
                    {isLoading && (
                        <ActivityIndicator 
                            size="small" 
                            color="#7B1FA2"
                            style={styles.headerLoader} 
                        />
                    )}
                </View>
                <Text style={[styles.deviceCount, { color: textColor }]}>
                    Total Devices: {devices.length}
                </Text>
                <View style={styles.gridContainer}>
                    {devices.length > 0 ? (
                        devices.map((device, index) => (
                            <DeviceCard
                                key={index}
                                device={device}
                                textColor={textColor}
                                onRefresh={() => handlePing(device._id)}
                                onCapture={() => handleOnCapture(device._id,device.devicename)}
                                onDelete={() => handleDeleteDevice(device._id)}
                                isCapturing={loadingDeviceId === device._id}
                                isDeleting={deletingDeviceId === device._id}
                            />
                        ))
                    ) : (
                        <View style={styles.noDevicesContainer}>
                            <Text style={[styles.noDevicesText, { color: textColor }]}>
                                No devices available
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            <Portal>
                <FAB
                    icon={({ size, color }) => (
                        <Animated.View
                            style={{
                                transform: isScanning ? [{ rotate: spin }] : [],
                            }}
                        >
                            <Icon 
                                name={isScanning ? "refresh" : "refresh"} 
                                size={size} 
                                color={color} 
                            />
                        </Animated.View>
                    )}
                    style={styles.fab}
                    color="white"
                    customSize={56}
                    label={isScanning ? "Scanning..." : "Scan"}
                    extended={isScanning}
                    onPress={handleScan}
                    loading={isScanning}
                    disabled={isScanning}
                    animated={true}
                />
            </Portal>

            <Snackbar
                visible={snackbarVisible}
                onDismiss={() => setSnackbarVisible(false)}
                duration={3000}
                action={{
                    label: 'Dismiss',
                    onPress: () => setSnackbarVisible(false),
                }}>
                {snackbarMessage}
            </Snackbar>
        </>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    deviceCount: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 10,
        paddingHorizontal: 16,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
    },
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        width: (Dimensions.get('window').width - 48) / 2,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
        minHeight: 180,
    },
    cardHeader: {
        marginBottom: 16,
    },
    deviceInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    deviceIcon: {
        marginRight: 8,
    },
    deviceName: {
        fontSize: 18,
        fontWeight: '600',
        flex: 1,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    onlineBadge: {
        backgroundColor: '#E8F5E9',
    },
    offlineBadge: {
        backgroundColor: '#FFEBEE',
    },
    statusIcon: {
        marginRight: 4,
    },
    badgeText: {
        fontSize: 14,
        fontWeight: '500',
    },
    cardContent: {
        flex: 1,
        justifyContent: 'space-between',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    dateText: {
        fontSize: 14,
        marginLeft: 8,
    },
    captureButton: {
        backgroundColor: '#7B1FA2',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
    },
    captureButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 8,
    },
    noDevicesContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingVertical: 40,
    },
    noDevicesText: {
        fontSize: 16,
        fontWeight: '500',
    },
    headerLoader: {
        marginLeft: 10,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
        backgroundColor: '#7B1FA2', // Your primary color
        borderRadius: 28,
    },
});

export default Home;