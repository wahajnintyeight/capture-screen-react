import { View, Text, StyleSheet, ScrollView, Dimensions, useColorScheme, TouchableOpacity } from "react-native"
import apiManager from "../services/APIManager";
import { useEffect, useState } from "react";
import { Ionicons } from '@expo/vector-icons';

const IconFallback = ({ name, size, color, style }) => (
    <View style={[{ width: size, height: size }, style]} />
);

const Home = () => {
    const [devices, setDevices] = useState([]);
    const colorScheme = useColorScheme();
    
    const Icon = Ionicons || IconFallback;

    useEffect(() => {
        fetchDevices();
    }, [])

    const fetchDevices = async () => {
        try {
            const response = await apiManager.getDevices();
            if (response.code && response.result) {
                setDevices(response.result.devices);
            }
        } catch (error) {
            console.error("Error fetching devices:", error);
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

    return (
        // <Text>Home</Text>
        <ScrollView style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: textColor }]}>My Devices</Text>
                <TouchableOpacity 
                    style={styles.refreshButton}
                    onPress={fetchDevices}
                >
                    <Icon name="refresh" size={24} color={textColor} />
                </TouchableOpacity>
            </View>
            <View style={styles.gridContainer}>
                {devices.map((device, index) => (
                    <View key={index} style={[styles.card, { backgroundColor: cardBgColor }]}>
                        <View style={styles.cardHeader}>
                            <View style={styles.deviceInfo}>
                                <Icon 
                                    name="hardware-chip-outline" 
                                    size={24} 
                                    color={textColor}
                                    style={styles.deviceIcon}
                                />
                                <Text style={[styles.deviceName, { color: textColor }]}>
                                    {device.deviceName}
                                </Text>
                            </View>
                            <View style={[
                                styles.badge,
                                device.isonline ? styles.onlineBadge : styles.offlineBadge
                            ]}>
                                <Icon 
                                    name={device.isonline ? "radio" : "radio-outline"} 
                                    size={16} 
                                    color={device.isonline ? "#2E7D32" : "#C62828"}
                                    style={styles.statusIcon}
                                />
                                <Text style={[
                                    styles.badgeText,
                                    { color: device.isonline ? "#2E7D32" : "#C62828" }
                                ]}>
                                    {device.isonline ? "Online" : "Offline"}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.cardContent}>
                            <View style={styles.infoRow}>
                                <Icon name="time-outline" size={16} color={textColor} />
                                <Text style={[styles.dateText, { color: textColor }]}>
                                    Created: {formatDate(device.createdAt)}
                                </Text>
                            </View>
                            <TouchableOpacity 
                                style={styles.captureButton}
                                onPress={() => {/* Handle capture */}}
                            >
                                <Icon name="camera" size={20} color="#FFFFFF" />
                                <Text style={styles.captureButtonText}>Capture</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </View>
        </ScrollView>
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
    refreshButton: {
        padding: 8,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        width: Dimensions.get('window').width > 600 
            ? (Dimensions.get('window').width - 48) / 3 
            : (Dimensions.get('window').width - 36) / 2,
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
    }
});

export default Home;