/**
 * ProfileSection — Reusable collapsible section.
 *
 * Renders a title + list of items. Used for Experience, Education,
 * Skills, Projects sections on the profile screen.
 */
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { View } from '@clstr/shared/components/ui/primitives/View';
import { Text } from '@clstr/shared/components/ui/primitives/Text';
import { Pressable } from '@clstr/shared/components/ui/primitives/Pressable';
import { useTheme } from '@clstr/shared/design/useTheme';
import { tokens } from '@clstr/shared/design/tokens';

export interface ProfileSectionProps {
  title: string;
  count?: number;
  children: React.ReactNode;
  initialExpanded?: boolean;
}

export function ProfileSection({
  title,
  count,
  children,
  initialExpanded = true,
}: ProfileSectionProps) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const { colors } = useTheme();

  return (
    <View style={[styles.root, { borderTopColor: colors.border }]}>
      <Pressable
        onPress={() => setExpanded((prev) => !prev)}
        style={styles.header}
      >
        <Text weight="semibold" size="base">
          {title}
          {count !== undefined && count > 0 ? ` (${count})` : ''}
        </Text>
        <Text size="sm" muted>
          {expanded ? '▲' : '▼'}
        </Text>
      </Pressable>

      {expanded && <View style={styles.content}>{children as any}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginHorizontal: tokens.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: tokens.spacing.md,
  },
  content: {
    paddingBottom: tokens.spacing.md,
  },
});
