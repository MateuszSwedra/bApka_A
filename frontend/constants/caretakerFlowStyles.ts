import { StyleSheet } from 'react-native';
import { Theme } from './theme';

/** Wspólny motyw kart — spójny z kreatorem dodawania leku do kalendarza. */
export const CaretakerFlowStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  sectionLabel: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
    color: Theme.colors.textLight,
    marginBottom: Theme.spacing.s,
    marginTop: Theme.spacing.l,
  },
  list: {
    width: '100%',
    gap: Theme.spacing.s,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.m,
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.calendarCell,
  },
  cardRowHighlight: {
    backgroundColor: Theme.colors.surfaceWarmHighlight,
    borderColor: Theme.colors.primaryLimeDark,
    borderWidth: 2,
  },
  cardRowAlert: {
    backgroundColor: Theme.colors.surfaceWarmHighlight,
    borderColor: Theme.colors.accentOrange,
    borderWidth: 2,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.m,
  },
  rowText: {
    flex: 1,
    paddingRight: Theme.spacing.s,
  },
  rowTitle: {
    fontSize: Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  rowSubtitle: {
    marginTop: 2,
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: Theme.typography.small,
    fontWeight: '700',
  },
});
