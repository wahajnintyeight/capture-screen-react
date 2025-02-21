import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LandingScreen from './src/screens/LandingScreen';
import Home from './src/screens/Home';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import CaptureScreen from './src/screens/CaptureScreen';
import 'react-native-gesture-handler'
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import TestImage from './src/screens/TestImage';

const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider>
        <NavigationContainer>
          <SafeAreaView style={{ flex: 1 }}>
            <Stack.Navigator 
              initialRouteName="Landing"
              screenOptions={{
                headerShown: false
              }}
            >
              <Stack.Screen name="Landing" component={LandingScreen} />
              <Stack.Screen name="Home" component={Home} />
              <Stack.Screen name="Capture" component={CaptureScreen} />
              <Stack.Screen name="TestImage" component={TestImage} />
            </Stack.Navigator>
          </SafeAreaView>
        </NavigationContainer>
      </PaperProvider>
    </GestureHandlerRootView>
  );
};

export default App;
