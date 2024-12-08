import { NavigationContainer } from '@react-navigation/native';
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert, Animated } from 'react-native';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
const DeviceCard = ({ device, onRefresh, onCapture, onDelete, textColor = 'red',navigation }) => {
    const screenWidth = Dimensions.get('window').width;
    const iconSize = screenWidth > 600 ? 35 : 24;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const elevationAnim = useRef(new Animated.Value(3)).current;

    const handleLongPress = () => {
        Alert.alert(
            "Delete Device",
            `Are you sure you want to delete ${device.devicename}?`,
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
                        {device.devicename}
                    </Text>

                    <View style={[
                        styles.statusBadge,
                        { backgroundColor: device.isonline ? '#E8F5E9' : '#FFEBEE' }
                    ]}>
                        <View style={[
                            styles.statusDot,
                            { backgroundColor: device.isonline ? '#2E7D32' : '#C62828' }
                        ]} />
                        <Text style={[
                            styles.statusText,
                            { color: device.isonline ? '#2E7D32' : '#C62828' }
                        ]}>
                            {device.isonline ? 'Online' : 'Offline'}
                        </Text>
                    </View>
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
                                deviceName: device.devicename
                            
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
        marginBottom: 16,
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