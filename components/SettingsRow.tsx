import React from 'react';
import { View, Text, StyleSheet, Pressable, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors, radius } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';

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

function SettingsRow({
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
  const colors = useThemeColors();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const color = isDestructive ? colors.danger : (iconColor || colors.textSecondary);

  return (
    <Pressable
      onPress={!isSwitch ? handlePress : undefined}
      style={({ pressed }) => [
        styles.container,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.divider },
        pressed && !isSwitch && { backgroundColor: colors.surfaceHover },
      ]}
      disabled={isSwitch}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.label, { color: isDestructive ? colors.danger : colors.text }]}>
        {label}
      </Text>
      {isSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={(val) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSwitchChange?.(val);
          }}
          trackColor={{ false: colors.muted, true: 'rgba(255, 255, 255, 0.25)' }}
          thumbColor={switchValue ? colors.text : colors.textMeta}
        />
      ) : (
        <View style={styles.right}>
          {value && <Text style={[styles.value, { color: colors.textMeta }]}>{value}</Text>}
          <Ionicons name="chevron-forward" size={16} color={colors.textMeta} />
        </View>
      )}
    </Pressable>
  );
}

export { SettingsRow };
export default React.memo(SettingsRow);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.body,
    flex: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
  },
});
