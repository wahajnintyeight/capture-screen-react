import { NavigationContainer } from '@react-navigation/native';
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert, Animated } from 'react-native';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const formatTimeAgo = (dateString) => {
    if (!dateString || dateString === "0001-01-01T00:00:00Z") {
        return 'Never';
    }

    console.log(dateString);
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) {
        return 'Just now';
    } else if (minutes < 60) {
        return `${minutes}m ago`;
    } else if (hours < 24) {
        return `${hours}h ago`;
    } else if (days < 7) {
        return `${days}d ago`;
    } else {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    }
};

const DeviceCard = ({ device, onRefresh, onCapture, onDelete, textColor = 'red',navigation }) => {
    const screenWidth = Dimensions.get('window').width;
    const iconSize = screenWidth > 600 ? 35 : 24;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const elevationAnim = useRef(new Animated.Value(3)).current;

    console.log('dev',device);
    const handleLongPress = () => {
        Alert.alert(
            "Delete Device",
            `Are you sure you want to delete ${device.deviceName}?`,
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Delete",
                    onPress: () => onDelete(device._id),
                    style: "destructive"
                }
            ]
        );
    };

    const animateIn = () => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1.03,
                friction: 8,
                tension: 40,
                useNativeDriver: true
            }),
            Animated.timing(elevationAnim, {
                toValue: 8,
                duration: 200,
                useNativeDriver: true
            })
        ]).start();
    };

    const animateOut = () => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true
             }),
            Animated.timing(elevationAnim, {
                toValue: 3,
                duration: 200,
                useNativeDriver: true
            })
        ]).start();
    };

    return (
        <TouchableOpacity 
            onLongPress={handleLongPress}
            delayLongPress={500}
            onPressIn={animateIn}
            onPressOut={animateOut}
        >
            <Animated.View 
                style={[
                    styles.card,
                    { 
                        backgroundColor: '#FFFFFF',
                        transform: [{ scale: scaleAnim }],
                        shadowOpacity: elevationAnim.interpolate({
                            inputRange: [3, 8],
                            outputRange: [0.1, 0.3]
                        }),
                    }
                ]}
            >
                {/* Header with Name and Status */}
                <View style={styles.header}>
                    <Text style={[styles.deviceName]}>
                        {device.deviceName}
                    </Text>

                    <View style={[
                        styles.statusBadge,
                        { backgroundColor: device.isOnline ? '#E8F5E9' : '#FFEBEE' }
                    ]}>
                        <View style={[
                            styles.statusDot,
                            { backgroundColor: device.isOnline ? '#2E7D32' : '#C62828' }
                        ]} />
                        <Text style={[
                            styles.statusText,
                            { color: device.isOnline ? '#2E7D32' : '#C62828' }
                        ]}>
                            {device.isOnline ? 'Online' : 'Offline'}
                        </Text>
                    </View>
                </View>

                {/* Last Seen */}
                <View style={styles.lastSeenContainer}>
                    <Icon 
                        name="clock-outline" 
                        size={16} 
                        color="#757575" 
                        style={styles.clockIcon} 
                    />
                    <Text style={styles.lastSeenText}>
                        Last seen: {formatTimeAgo(device.lastOnline)}
                    </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity 
                        style={[styles.button, styles.refreshButton]} 
                        onPress={onRefresh}
                    >
                        <Icon name="refresh" size={iconSize} color="#7B1FA2" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.button, styles.captureButton]}
                        onPress={() => navigation.navigate('Capture', {
                            screen: 'Capture',
                            deviceId: device._id,
                            deviceName: device.deviceName,
                            memoryUsage: device.memoryUsage,
                            diskUsage: device.diskUsage,
                            osName: device.osName,
                            imageBlob: device.imageBlob,
                            lastImage: device.lastImage,
                            lastOnline: device.lastOnline
                        })}
                    >
                        <Icon name="eye" size={iconSize} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowRadius: 3,
        elevation: 3,
        width: (Dimensions.get('window').width - 26) / 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    deviceName: {
        fontSize: 18,
        fontWeight: '600',
        flex: 1,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '500',
    },
    lastSeenContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 16,
    },
    clockIcon: {
        marginRight: 6,
    },
    lastSeenText: {
        fontSize: 12,
        color: '#757575',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginTop: 8,
    },
    button: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        minHeight: 48,
    },
    refreshButton: {
        backgroundColor: '#F3E5F5',
    },
    captureButton: {
        backgroundColor: '#7B1FA2',
    }
});

export default DeviceCard;