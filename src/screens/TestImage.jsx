import React, { useState } from 'react';
import { View, Button, StyleSheet } from 'react-native';
import ImageView from 'react-native-image-viewing';

export default function TestModalScreen() {
  const [visible, setVisible] = useState(false);
  
  return (
    <View style={{ flex: 1, backgroundColor: '#FFF', justifyContent: 'center' }}>
      <Button title="Open Viewer" onPress={() => setVisible(true)} />
      
      <ImageView
        images={[{ uri: 'https://project-phoenix-development.s3.amazonaws.com/capture-screen-uploads/DESKTOP-SQ3S8SE/2024-12-31-22-22-31.png' }]}
        imageIndex={0}
        visible={visible}
        onRequestClose={() => setVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});