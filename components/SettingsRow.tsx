import React from 'react';
import { View, Text, StyleSheet, Pressable, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  label: string;
  value?: string;
  isSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  onPress?: () => void;
  isDestructive?: boolean;
  isLast?: boolean;
}

export function SettingsRow({
  icon,
  iconColor,
  label,
  value,
  isSwitch,
  switchValue,
  onSwitchChange,
  onPress,
  isDestructive,
  isLast,
}: SettingsRowProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const color = isDestructive ? Colors.dark.danger : (iconColor || Colors.dark.textSecondary);

  return (
    <Pressable
      onPress={!isSwitch ? handlePress : undefined}
      style={({ pressed }) => [
        styles.container,
        !isLast && styles.border,
        pressed && !isSwitch && { backgroundColor: Colors.dark.surfaceHover },
      ]}
      disabled={isSwitch}
    >
      <View style={[styles.iconWrap, { backgroundColor: Colors.dark.secondary }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.label, isDestructive && { color: Colors.dark.danger }]}>
        {label}
      </Text>
      {isSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={(val) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSwitchChange?.(val);
          }}
          trackColor={{ false: Colors.dark.muted, true: 'rgba(255, 255, 255, 0.25)' }}
          thumbColor={switchValue ? Colors.dark.text : Colors.dark.textMeta}
        />
      ) : (
        <View style={styles.right}>
          {value && <Text style={styles.value}>{value}</Text>}
          <Ionicons name="chevron-forward" size={16} color={Colors.dark.textMeta} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.divider,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  label: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 15,
    color: Colors.dark.text,
    flex: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    color: Colors.dark.textMeta,
  },
});
