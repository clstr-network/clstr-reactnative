import { Stack } from "expo-router";
import React from "react";

export default function MainLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000000' } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="search" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="post-detail" />
      <Stack.Screen name="chat" />
    </Stack>
  );
}
