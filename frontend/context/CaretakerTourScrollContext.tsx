import React, { createContext, useContext, useMemo, useRef } from 'react';
import {
  Platform,
  ScrollView,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useCaretakerTourLock } from './CaretakerTourLockContext';

type CaretakerTourScrollContextValue = {
  scrollRef: React.RefObject<ScrollView | null>;
  contentRef: React.RefObject<View | null>;
};

const CaretakerTourScrollContext = createContext<CaretakerTourScrollContextValue | null>(
  null,
);

export function CaretakerTourScrollProvider({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<ScrollView | null>(null);
  const contentRef = useRef<View | null>(null);
  const value = useMemo(
    () => ({ scrollRef, contentRef }),
    [],
  );

  return (
    <CaretakerTourScrollContext.Provider value={value}>
      {children}
    </CaretakerTourScrollContext.Provider>
  );
}

export function useCaretakerTourScroll(): CaretakerTourScrollContextValue | null {
  return useContext(CaretakerTourScrollContext);
}

type CaretakerTourScrollViewProps = ScrollViewProps & {
  contentContainerStyle?: StyleProp<ViewStyle>;
};

/** ScrollView z refami do przewijania podpowiedzi tour do widocznego elementu. */
export function CaretakerTourScrollView({
  children,
  contentContainerStyle,
  scrollEnabled: scrollEnabledProp,
  ...scrollProps
}: CaretakerTourScrollViewProps) {
  const tourScroll = useCaretakerTourScroll();
  const tourLock = useCaretakerTourLock();
  const scrollLocked = tourLock?.locked ?? false;
  const scrollEnabled = scrollEnabledProp !== false && !scrollLocked;

  if (!tourScroll) {
    return (
      <ScrollView
        {...scrollProps}
        scrollEnabled={scrollEnabled}
        bounces={scrollEnabled}
        contentContainerStyle={contentContainerStyle}
      >
        {children}
      </ScrollView>
    );
  }

  const { scrollRef, contentRef } = tourScroll;

  return (
    <ScrollView
      ref={scrollRef}
      {...scrollProps}
      scrollEnabled={scrollEnabled}
      bounces={scrollEnabled}
      nestedScrollEnabled={scrollEnabled}
      contentContainerStyle={undefined}
      style={[
        scrollProps.style,
        scrollLocked && Platform.OS === 'web' ? { overflow: 'hidden' as const } : undefined,
      ]}
    >
      <View ref={contentRef} collapsable={false} style={contentContainerStyle}>
        {children}
      </View>
    </ScrollView>
  );
}
