import { useEffect, useRef } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, fonts, radius } from '../theme';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const SIDE_PADDING = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);

interface WheelPickerProps {
  values: number[];
  value: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  label: string;
}

export function WheelPicker({ values, value, onChange, format = String, label }: WheelPickerProps) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const index = Math.max(0, values.indexOf(value));

  // Mantém a roda alinhada quando o valor muda por fora (ex.: valor digitado).
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: false });
  }, [index]);

  const handleEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const clamped = Math.min(values.length - 1, Math.max(0, next));
    if (values[clamped] !== value) onChange(values[clamped]);
  };

  const step = (delta: number) => {
    const next = Math.min(values.length - 1, Math.max(0, index + delta));
    onChange(values[next]);
  };

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: format(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => step(event.nativeEvent.actionName === 'increment' ? 1 : -1)}
    >
      <View style={styles.band} pointerEvents="none" />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        nestedScrollEnabled
        contentOffset={{ x: 0, y: index * ITEM_HEIGHT }}
        contentContainerStyle={styles.content}
        onMomentumScrollEnd={handleEnd}
        onScrollEndDrag={handleEnd}
      >
        {values.map((item) => (
          <View key={item} style={styles.item}>
            <Text style={[styles.itemText, item === value && styles.itemTextSelected]}>
              {format(item)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
  },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: SIDE_PADDING,
    height: ITEM_HEIGHT,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  content: {
    paddingVertical: SIDE_PADDING,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 18,
  },
  itemTextSelected: {
    color: colors.text,
    fontSize: 24,
  },
});
