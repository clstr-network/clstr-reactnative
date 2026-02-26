/**
 * VideoPlayer — Phase 9.2
 * In-feed video player for uploaded videos.
 * Tap to play/pause with overlay controls.
 * Auto-pauses when scrolled out of viewport via isVisible prop.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, radius } from '@/constants/colors';

interface VideoPlayerProps {
  uri: string;
  poster?: string;
  isVisible?: boolean;
}

function VideoPlayer({ uri, poster, isVisible = true }: VideoPlayerProps) {
  const colors = useThemeColors();
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = false;
    videoPlayer.muted = false;
  });
  const hasStartedRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);

  // Auto-pause when scrolled out of viewport
  useEffect(() => {
    if (!isVisible && isPlaying) {
      player.pause();
    }
  }, [isVisible, isPlaying, player]);

  useEffect(() => {
    const statusSub = player.addListener('statusChange', ({ status }) => {
      setIsLoading(status === 'loading');
    });

    const playingSub = player.addListener('playingChange', ({ isPlaying: nextPlaying }) => {
      setIsPlaying(nextPlaying);
      if (nextPlaying) {
        hasStartedRef.current = true;
      }
    });

    const endSub = player.addListener('playToEnd', () => {
      player.currentTime = 0;
      setHasStarted(false);
      hasStartedRef.current = false;
      setIsPlaying(false);
    });

    return () => {
      statusSub.remove();
      playingSub.remove();
      endSub.remove();
    };
  }, [player]);

  const togglePlayPause = useCallback(async () => {
    if (player.playing) {
      player.pause();
    } else {
      setHasStarted(true);
      hasStartedRef.current = true;
      player.play();
    }
  }, [player]);

  return (
    <Pressable onPress={togglePlayPause} style={[styles.container, { backgroundColor: colors.surfaceElevated }]}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls={false}
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
