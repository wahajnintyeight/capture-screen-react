import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
const LandingScreen = ({ navigation }) => {
  console.log('LandingScreen');
  
  return (
    <LinearGradient 
      colors={['#7B1FA2', '#4A148C', '#1A0033']}
      style={styles.background}
    >
      <View style={styles.contentContainer}>
        <View style={styles.windowContainer}>
          <View style={{padding: 10}}>
            <Text style={{fontSize: 44, color: 'white', textAlign: 'center', fontWeight: 'bold', marginBottom: 10}}>
              Monitor Your Screen
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.button} onPress={() => {
          
          console.log('Start Capturing');
          navigation.navigate('Home');
        }}>
          <Text style={styles.buttonText}>Start Capturing</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  windowContainer: {
    width: '100%',
    // backgroundColor: '#f0f0f0',
    borderRadius: 8,
    // borderWidth: 1,
    borderColor: '#666',
    marginTop: 60,
    overflow: 'hidden',
  },
  titleBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#7B1FA2',
    padding: 10,
  },
  titleBarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  windowButtons: {
    flexDirection: 'row',
  },
  windowButton: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 6,
  },
  minimizeButton: {
    backgroundColor: '#FFD700',
  },
  maximizeButton: {
    backgroundColor: '#32CD32',
  },
  closeButton: {
    backgroundColor: '#FF4444',
  },
  button: {
    backgroundColor: '#FFD700', // Golden yellow complements purple well
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 50,
    // borderWidth: 2,
    // borderColor: '#fff',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'black',
    textTransform: 'uppercase',
  },
});

export default LandingScreen;
