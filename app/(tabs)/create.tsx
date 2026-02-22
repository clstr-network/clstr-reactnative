/**
 * Create tab stub — Phase 5.1
 *
 * This screen is never actually rendered. The tab press is intercepted
 * in _layout.tsx to navigate to the create-post modal instead.
 * This file exists solely to create a valid Expo Router route for
 * the tab slot.
 */
import React from 'react';
import { View } from 'react-native';

export default function CreateStub() {
  return <View />;
}
