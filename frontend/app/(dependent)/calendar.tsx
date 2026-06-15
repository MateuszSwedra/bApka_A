import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/theme';
import { useTranslation } from 'react-i18next';
import { useScreenBottomPadding } from '../../utils/safeAreaInsets';
import { useMeds } from '../../context/MedsContext';
import { useDependentDisplay } from '../../context/DependentDisplayContext';
import { SeniorWeekPlanView } from '../../components/senior/SeniorWeekPlanView';
import {
  shiftSeniorWeek,
  startOfSeniorPlanWindow,
} from '../../utils/seniorWeekPlan';

export default function DependentCalendarScreen() {
  const { t } = useTranslation();
  const bottomPadding = useScreenBottomPadding(Theme.spacing.m);
  const { colors } = useDependentDisplay();
  const { depletionAlerts, schedules, treatments } = useMeds();
  const [weekAnchor, setWeekAnchor] = useState(() => startOfSeniorPlanWindow(new Date()));
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const viewportH = useRef(0);
  const contentH = useRef(0);
  const scrollY = useRef(0);

  const updateScrollability = useCallback(() => {
    const scrollable = contentH.current > viewportH.current + 16;
    const atBottom = scrollY.current + viewportH.current >= contentH.current - 48;
    setShowScrollHint(scrollable && !atBottom);
    setShowBackToTop(scrollable && atBottom);
  }, []);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
    updateScrollability();
  };

  const handleScrollMore = () => {
    const maxY = Math.max(0, contentH.current - viewportH.current);
    const nextY = Math.min(scrollY.current + viewportH.current * 0.75, maxY);
    scrollRef.current?.scrollTo({ y: nextY, animated: true });
  };

  const handleScrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surfaceWhite, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={32} color={colors.textDark} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textDark }]}>
          {t('dependent.calendar.screenTitle')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.scrollWrap}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 72 }]}
          showsVerticalScrollIndicator
          scrollEventThrottle={16}
          onScroll={onScroll}
          onLayout={e => {
            viewportH.current = e.nativeEvent.layout.height;
            updateScrollability();
          }}
          onContentSizeChange={(_, h) => {
            contentH.current = h;
            updateScrollability();
          }}
        >
          <SeniorWeekPlanView
            weekAnchor={weekAnchor}
            onPrevWeek={() => setWeekAnchor(w => shiftSeniorWeek(w, -1))}
            onNextWeek={() => setWeekAnchor(w => shiftSeniorWeek(w, 1))}
            onThisWeek={() => setWeekAnchor(startOfSeniorPlanWindow(new Date()))}
            schedules={schedules}
            treatments={treatments}
            depletionAlerts={depletionAlerts}
            colors={colors}
          />
        </ScrollView>

        {showScrollHint ? (
          <Pressable
            onPress={handleScrollMore}
            style={({ pressed }) => [
              styles.floatingBtn,
              { bottom: bottomPadding },
              { backgroundColor: colors.surfaceWhite, borderColor: colors.primaryLimeDark },
              pressed && styles.floatingBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('dependent.calendar.scrollMore')}
          >
            <MaterialIcons name="keyboard-arrow-down" size={36} color={colors.primaryLimeDark} />
            <Text style={[styles.floatingBtnText, { color: colors.textDark }]}>
              {t('dependent.calendar.scrollMore')}
            </Text>
          </Pressable>
        ) : null}

        {showBackToTop ? (
          <Pressable
            onPress={handleScrollToTop}
            style={({ pressed }) => [
              styles.floatingBtn,
              { bottom: bottomPadding },
              { backgroundColor: colors.surfaceWhite, borderColor: colors.primaryLimeDark },
              pressed && styles.floatingBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('dependent.calendar.backToTop')}
          >
            <MaterialIcons name="keyboard-arrow-up" size={36} color={colors.primaryLimeDark} />
            <Text style={[styles.floatingBtnText, { color: colors.textDark }]}>
              {t('dependent.calendar.backToTop')}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.l,
    paddingTop: Theme.spacing.xxl,
    paddingBottom: Theme.spacing.m,
    borderBottomWidth: 2,
  },
  backBtn: {
    padding: Theme.spacing.xs,
  },
  headerSpacer: {
    width: 32,
  },
  headerTitle: {
    flex: 1,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  scrollWrap: {
    flex: 1,
    position: 'relative',
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: Theme.spacing.m,
  },
  floatingBtn: {
    position: 'absolute',
    left: Theme.spacing.l,
    right: Theme.spacing.l,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.s,
    paddingVertical: Theme.spacing.m,
    paddingHorizontal: Theme.spacing.l,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 2,
    shadowColor: Theme.colors.shadowNeutral,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  floatingBtnPressed: {
    opacity: 0.85,
  },
  floatingBtnText: {
    fontSize: 20,
    fontWeight: '800',
  },
});
