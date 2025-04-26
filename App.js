import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Audio,
  InterruptionModeAndroid,
  InterruptionModeIOS,
} from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

const streamUrl = 'http://gwr.no-ip.biz:8000/listen.plr';
const VOLUME_KEY = 'radio_volume';

export default function App() {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [displayVolume, setDisplayVolume] = useState(100);
  const volumeRef = useRef(1.0);

  // Load saved volume on first run
  useEffect(() => {
    loadSavedVolume();
  }, []);

  const loadSavedVolume = async () => {
    try {
      const saved = await AsyncStorage.getItem(VOLUME_KEY);
      if (saved !== null) {
        const vol = parseFloat(saved);
        volumeRef.current = vol;
        setDisplayVolume(Math.round(vol * 100));
      }
    } catch (e) {
      console.log('Failed to load volume:', e);
    }
  };

  const saveVolume = async (val) => {
    try {
      await AsyncStorage.setItem(VOLUME_KEY, val.toString());
    } catch (e) {
      console.log('Failed to save volume:', e);
    }
  };

  const playStream = async () => {
    try {
      setIsLoading(true);
      await Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        playThroughEarpieceAndroid: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: streamUrl },
        { shouldPlay: true, volume: volumeRef.current }
      );

      setSound(sound);
      setIsPlaying(true);

      // For background support
      if (Platform.OS === 'android') {
        await sound.setOnPlaybackStatusUpdate(async (status) => {
          if (status.didJustFinish || status.isBuffering === false) {
            // Future background handling here
          }
        });
      }

    } catch (error) {
      console.log('Error playing stream:', error);
      Alert.alert(
        'Stream Error',
        'Unable to play the stream. Please check the internet or stream URL.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const stopStream = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      stopStream();
    } else {
      playStream();
    }
  };

  const handleVolumeChange = async (value) => {
    volumeRef.current = value;
    setDisplayVolume(Math.round(value * 100));
    saveVolume(value);
    if (sound) {
      await sound.setVolumeAsync(value);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📻 GWR Radio</Text>
      <Text style={styles.nowPlaying}>🎶 Now Playing: GWR Live Stream</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color="#fff" style={{ marginVertical: 20 }} />
      ) : (
        <TouchableOpacity onPress={togglePlay} style={styles.playButton}>
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={48}
            color="#fff"
          />
        </TouchableOpacity>
      )}

      <Text style={styles.volumeLabel}>Volume: {displayVolume}%</Text>

      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={1}
        defaultValue={volumeRef.current}
        minimumTrackTintColor="#fff"
        maximumTrackTintColor="#ccc"
        thumbTintColor="#fff"
        onValueChange={handleVolumeChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e3c72',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  nowPlaying: {
    color: '#eee',
    fontSize: 16,
    marginBottom: 20,
  },
  playButton: {
    marginVertical: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 20,
    borderRadius: 100,
  },
  volumeLabel: {
    color: '#fff',
    marginTop: 20,
    fontSize: 16,
  },
  slider: {
    width: '80%',
    height: 40,
    marginTop: 10,
  },
});