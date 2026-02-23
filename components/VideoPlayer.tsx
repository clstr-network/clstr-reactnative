/**
 * VideoPlayer — Phase 9.2
 * In-feed video player for uploaded videos.
 * Tap to play/pause with overlay controls.
 * Auto-pauses when scrolled out of viewport via isVisible prop.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, radius } from '@/constants/colors';

interface VideoPlayerProps {
  uri: string;
  poster?: string;
  isVisible?: boolean;
}

function VideoPlayer({ uri, poster, isVisible = true }: VideoPlayerProps) {
  const colors = useThemeColors();
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);

  // Auto-pause when scrolled out of viewport
  useEffect(() => {
    if (!isVisible && isPlaying) {
      videoRef.current?.pauseAsync();
    }
  }, [isVisible, isPlaying]);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setIsPlaying(status.isPlaying);
    setIsLoading(status.isBuffering);
    if (status.didJustFinish) {
      videoRef.current?.setPositionAsync(0);
      setHasStarted(false);
    }
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (!videoRef.current) return;
    const status = await videoRef.current.getStatusAsync();
    if (!status.isLoaded) return;

    if (status.isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      setHasStarted(true);
      await videoRef.current.playAsync();
    }
  }, []);

  return (
    <Pressable onPress={togglePlayPause} style={[styles.container, { backgroundColor: colors.surfaceElevated }]}>
      <Video
        ref={videoRef}
        source={{ uri }}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        posterSource={poster ? { uri: poster } : undefined}
        usePoster={!!poster}
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        shouldPlay={false}
        isLooping={false}
        isMuted={false}
      />

      {/* Play/Pause overlay */}
      {(!hasStarted || !isPlaying) && !isLoading && (
        <View style={styles.playOverlay}>
          <View style={styles.playButton}>
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={32}
              color="#fff"
            />
          </View>
        </View>
      )}

      {/* Loading indicator */}
      {isLoading && hasStarted && (
        <View style={styles.playOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
    </Pressable>
  );
}

export default React.memo(VideoPlayer);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: radius.md,
    overflow: 'hidden',
    aspectRatio: 16 / 9,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 3, // Optical center for play icon
  },
});
