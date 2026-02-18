/**
 * Switch — cross-platform
 *
 * Replaces shadcn/ui Switch with RN Switch.
 */
import React from 'react';
import {
  Switch as RNSwitch,
  type SwitchProps as RNSwitchProps,
  StyleSheet,
} from 'react-native';
import { tokens } from '../../design/tokens';

export interface SwitchProps extends RNSwitchProps {
  checked?: boolean;
  onCheckedChange?: (value: boolean) => void;
}

export function Switch({
  checked,
  onCheckedChange,
  value,
  onValueChange,
  disabled,
  ...props
}: SwitchProps) {
  return (
    <RNSwitch
      value={checked ?? value}
      onValueChange={onCheckedChange ?? onValueChange}
      disabled={disabled}
      trackColor={{
        false: 'rgba(255,255,255,0.10)',
        true: tokens.colors.signal.blue,
      }}
      thumbColor="#FFFFFF"
      ios_backgroundColor="rgba(255,255,255,0.10)"
      {...props}
    />
  );
}
