import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LandingScreen from './src/screens/LandingScreen';
import Home from './src/screens/Home';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';

const Stack = createNativeStackNavigator();

const App = () => {
  return (
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
        </Stack.Navigator>
        </SafeAreaView>
      </NavigationContainer>
    </PaperProvider>
  );
};

export default App;
