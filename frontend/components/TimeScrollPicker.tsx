import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { Theme } from '../constants/theme';
import { useTranslation } from 'react-i18next';

const ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const CENTER_PAD = (PICKER_HEIGHT - ITEM_HEIGHT) / 2;
const COL_WIDTH = 72;
const COLON_WIDTH = 16;

type ActiveColumn = 'hour' | 'minute';

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function clampIndex(index: number, max: number): number {
  return Math.max(0, Math.min(max, index));
}

function offsetForIndex(index: number): number {
  return index * ITEM_HEIGHT;
}

function indexFromOffset(offsetY: number, maxIndex: number): number {
  return clampIndex(Math.round(offsetY / ITEM_HEIGHT), maxIndex);
}

interface WheelColumnProps {
  values: string[];
  selectedIndex: number;
  isActive: boolean;
  onSelect: (index: number) => void;
  onInteractionStart: () => void;
}

function WheelColumn({
  values,
  selectedIndex,
  isActive,
  onSelect,
  onInteractionStart,
}: WheelColumnProps) {
  const scrollRef = useRef<ScrollView>(null);
  const maxIndex = values.length - 1;
  const scrollingRef = useRef(false);
  const lastEmitted = useRef(clampIndex(selectedIndex, maxIndex));

  const snapOffsets = useMemo(
    () => values.map((_, i) => offsetForIndex(i)),
    [values.length],
  );

  const emitIndex = useCallback(
    (index: number) => {
      const clamped = clampIndex(index, maxIndex);
      if (lastEmitted.current !== clamped) {
        lastEmitted.current = clamped;
        onSelect(clamped);
      }
    },
    [maxIndex, onSelect],
  );

  const snapToIndex = useCallback(
    (index: number, animated: boolean) => {
      const clamped = clampIndex(index, maxIndex);
      const y = offsetForIndex(clamped);
      emitIndex(clamped);
      scrollRef.current?.scrollTo({ y, animated: Platform.OS !== 'web' && animated });
    },
    [emitIndex, maxIndex],
  );

  const alignFromScroll = useCallback(
    (offsetY: number, animated: boolean) => {
      snapToIndex(indexFromOffset(offsetY, maxIndex), animated);
    },
    [maxIndex, snapToIndex],
  );

  useEffect(() => {
    if (scrollingRef.current) return;
    const clamped = clampIndex(selectedIndex, maxIndex);
    lastEmitted.current = clamped;
    scrollRef.current?.scrollTo({ y: offsetForIndex(clamped), animated: false });
  }, [selectedIndex, maxIndex]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      emitIndex(indexFromOffset(e.nativeEvent.contentOffset.y, maxIndex));
    },
    [emitIndex, maxIndex],
  );

  const finishScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollingRef.current = false;
      alignFromScroll(e.nativeEvent.contentOffset.y, Platform.OS !== 'web');
    },
    [alignFromScroll],
  );

  return (
    <View style={[styles.column, isActive && styles.columnActive]}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToOffsets={snapOffsets}
        snapToAlignment="start"
        decelerationRate="fast"
        nestedScrollEnabled
        scrollEventThrottle={16}
        disableIntervalMomentum
        onLayout={() => {
          const y = offsetForIndex(clampIndex(selectedIndex, maxIndex));
          scrollRef.current?.scrollTo({ y, animated: false });
        }}
        onScrollBeginDrag={() => {
          scrollingRef.current = true;
          onInteractionStart();
        }}
        onTouchStart={onInteractionStart}
        onScroll={handleScroll}
        onMomentumScrollEnd={finishScroll}
        onScrollEndDrag={finishScroll}
        contentContainerStyle={{ paddingVertical: CENTER_PAD }}
      >
        {values.map((label, i) => (
          <View key={`${label}-${i}`} style={styles.item}>
            <Text style={styles.itemText}>{label}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export interface TimeScrollPickerRef {
  getTime: () => { hour: number; minute: number };
}

export interface TimeScrollPickerProps {
  hour: number;
  minute: number;
  onHourChange: (hour: number) => void;
  onMinuteChange: (minute: number) => void;
}

export const TimeScrollPicker = forwardRef<TimeScrollPickerRef, TimeScrollPickerProps>(
  function TimeScrollPicker({ hour, minute, onHourChange, onMinuteChange }, ref) {
    const { t } = useTranslation();
    const [activeColumn, setActiveColumn] = useState<ActiveColumn>('hour');
    const hourRef = useRef(clampIndex(hour, 23));
    const minuteRef = useRef(clampIndex(minute, 59));

    hourRef.current = clampIndex(hour, 23);
    minuteRef.current = clampIndex(minute, 59);

    useImperativeHandle(ref, () => ({
      getTime: () => ({
        hour: hourRef.current,
        minute: minuteRef.current,
      }),
    }));

    const handleHourChange = useCallback(
      (h: number) => {
        hourRef.current = h;
        onHourChange(h);
      },
      [onHourChange],
    );

    const handleMinuteChange = useCallback(
      (m: number) => {
        minuteRef.current = m;
        onMinuteChange(m);
      },
      [onMinuteChange],
    );

    const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => pad2(i)), []);
    const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => pad2(i)), []);

    const safeHour = clampIndex(hour, 23);
    const safeMinute = clampIndex(minute, 59);

    return (
      <View style={styles.wrapper}>
        <View style={styles.columnLabels}>
          <Text style={[styles.columnLabel, activeColumn === 'hour' && styles.columnLabelActive]}>
            {t('common.hour')}
          </Text>
          <View style={styles.colonLabelGap} />
          <Text style={[styles.columnLabel, activeColumn === 'minute' && styles.columnLabelActive]}>
            {t('common.minute')}
          </Text>
        </View>

        <View style={styles.selectionRow}>
          <View
            style={[styles.selectionHalf, activeColumn === 'hour' && styles.selectionHalfActive]}
          />
          <View style={styles.colonGap} />
          <View
            style={[
              styles.selectionHalf,
              activeColumn === 'minute' && styles.selectionHalfActive,
            ]}
          />
        </View>

        <View style={styles.columns}>
          <WheelColumn
            values={hours}
            selectedIndex={safeHour}
            isActive={activeColumn === 'hour'}
            onSelect={handleHourChange}
            onInteractionStart={() => setActiveColumn('hour')}
          />
          <View style={styles.colonGap} />
          <WheelColumn
            values={minutes}
            selectedIndex={safeMinute}
            isActive={activeColumn === 'minute'}
            onSelect={handleMinuteChange}
            onInteractionStart={() => setActiveColumn('minute')}
          />
        </View>

        <View style={styles.centerOverlay} pointerEvents="none">
          <Text
            style={[
              styles.centerText,
              activeColumn === 'hour' ? styles.centerTextActive : styles.centerTextIdle,
            ]}
          >
            {hours[safeHour]}
          </Text>
          <Text style={styles.centerColon}>:</Text>
          <Text
            style={[
              styles.centerText,
              activeColumn === 'minute' ? styles.centerTextActive : styles.centerTextIdle,
            ]}
          >
            {minutes[safeMinute]}
          </Text>
        </View>

        <View style={[styles.fade, styles.fadeTop]} pointerEvents="none" />
        <View style={[styles.fade, styles.fadeBottom]} pointerEvents="none" />
      </View>
    );
  },
);

export function parseTimeParts(time: string): { hour: number; minute: number } {
  const match = /^(\d{1,2}):(\d{1,2})$/.exec(time.trim());
  if (!match) return { hour: 8, minute: 0 };
  return {
    hour: clampIndex(parseInt(match[1], 10) || 0, 23),
    minute: clampIndex(parseInt(match[2], 10) || 0, 59),
  };
}

export function formatTimeParts(hour: number, minute: number): string {
  return `${pad2(clampIndex(hour, 23))}:${pad2(clampIndex(minute, 59))}`;
}

const styles = StyleSheet.create({
  wrapper: {
    height: PICKER_HEIGHT + 28,
    marginTop: Theme.spacing.s,
    marginBottom: Theme.spacing.s,
    position: 'relative',
  },
  columnLabels: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
    zIndex: 4,
  },
  columnLabel: {
    width: COL_WIDTH,
    textAlign: 'center',
    fontSize: Theme.typography.small,
    fontWeight: '600',
    color: Theme.colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  columnLabelActive: {
    color: Theme.colors.primaryLimeDark,
    fontWeight: '800',
  },
  colonLabelGap: {
    width: COLON_WIDTH,
  },
  selectionRow: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    top: 28 + CENTER_PAD,
    height: ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  selectionHalf: {
    width: COL_WIDTH,
    height: ITEM_HEIGHT,
    borderRadius: Theme.borderRadius.medium,
    backgroundColor: Theme.colors.surfaceGrey,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    opacity: 0.55,
  },
  selectionHalfActive: {
    opacity: 1,
    borderColor: Theme.colors.primaryLimeDark,
    borderWidth: 2,
    backgroundColor: 'rgba(69, 104, 130, 0.12)',
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    height: PICKER_HEIGHT,
    marginTop: 28,
    zIndex: 1,
  },
  column: {
    width: COL_WIDTH,
    height: PICKER_HEIGHT,
    overflow: 'hidden',
    borderRadius: Theme.borderRadius.medium,
  },
  columnActive: {
    opacity: 1,
  },
  colonGap: {
    width: COLON_WIDTH,
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 30,
    lineHeight: ITEM_HEIGHT,
    fontWeight: '400',
    color: Theme.colors.textLight,
    opacity: 0.45,
    textAlign: 'center',
    includeFontPadding: false,
  },
  centerOverlay: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    top: 28 + CENTER_PAD,
    height: ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  centerText: {
    width: COL_WIDTH,
    fontSize: 30,
    lineHeight: ITEM_HEIGHT,
    textAlign: 'center',
    includeFontPadding: false,
  },
  centerTextActive: {
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  centerTextIdle: {
    fontWeight: '500',
    color: Theme.colors.textLight,
  },
  centerColon: {
    width: COLON_WIDTH,
    fontSize: 30,
    lineHeight: ITEM_HEIGHT,
    fontWeight: '700',
    color: Theme.colors.textDark,
    textAlign: 'center',
    includeFontPadding: false,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: CENTER_PAD,
    zIndex: 2,
    pointerEvents: 'none',
  },
  fadeTop: {
    top: 28,
    backgroundColor: Theme.colors.background,
    opacity: 0.94,
  },
  fadeBottom: {
    bottom: 0,
    backgroundColor: Theme.colors.background,
    opacity: 0.94,
  },
});
