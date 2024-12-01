import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LandingScreen from './src/screens/LandingScreen';
import Home from './src/screens/Home';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';

const Stack = createNativeStackNavigator();

const App = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync(Ionicons.font);
        setIsReady(true);
      } catch (error) {
        console.error('Error loading fonts:', error);
        // Set isReady to true even on error so the app can still run
        setIsReady(true);
      }
    }
    loadFonts();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Landing"
        screenOptions={{
          headerShown: false
        }}
      >
        <Stack.Screen name="Landing"  component={LandingScreen} />
        <Stack.Screen name="Home" component={Home} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
