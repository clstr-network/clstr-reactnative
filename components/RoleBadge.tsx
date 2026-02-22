import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getRoleBadgeColor } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';

interface RoleBadgeProps {
  role: string;
  /** Size variant — 'sm' (compact) or 'md' (default) */
  size?: 'sm' | 'md';
}

function RoleBadge({ role, size = 'md' }: RoleBadgeProps) {
  if (!role) return null;
  const { bg, text: textColor, border } = getRoleBadgeColor(role);
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          borderColor: border,
          paddingHorizontal: isSmall ? 6 : 8,
          paddingVertical: isSmall ? 1 : 2,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: textColor,
            fontSize: isSmall ? fontSize['2xs'] : fontSize.xs,
            fontFamily: fontFamily.semiBold,
          },
        ]}
      >
        {role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()}
      </Text>
    </View>
  );
}

export default React.memo(RoleBadge);

const styles = StyleSheet.create({
  badge: {
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: '600',
  },
});
