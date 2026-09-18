import React, { memo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '../hooks/useHeaderInsets';
import { tokens } from '../lib/designTokens';
import { scale, verticalScale } from '../lib/responsive';
import { ShimmerProvider, ShimmerRect, ShimmerBlock } from './Shimmer';

/**
 * High-fidelity structural skeleton for DashboardPanel.
 * Mirrors the exact layout, geometry, and cards of the loaded dashboard 1-to-1.
 */
export const DashboardSkeleton = memo(function DashboardSkeleton() {
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = useHeaderHeight();
  const TOTAL_NAV_HEIGHT = HEADER_HEIGHT;

  return (
    <ShimmerProvider duration={1500}>
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: TOTAL_NAV_HEIGHT + verticalScale(12),
              paddingBottom: verticalScale(100) + insets.bottom,
            },
          ]}
          scrollEnabled={false}
        >
          {/* Header Row */}
          <View style={styles.header}>
            <ShimmerRect width={scale(130)} height={verticalScale(28)} borderRadius={6} />
            <ShimmerRect width={scale(90)} height={verticalScale(18)} borderRadius={4} />
          </View>

          {/* Period Selector Tabs */}
          <View style={styles.periodRow}>
            <ShimmerRect width={scale(68)} height={verticalScale(34)} borderRadius={tokens.radius.pill} />
            <ShimmerRect width={scale(76)} height={verticalScale(34)} borderRadius={tokens.radius.pill} />
            <ShimmerRect width={scale(86)} height={verticalScale(34)} borderRadius={tokens.radius.pill} />
            <ShimmerRect width={scale(72)} height={verticalScale(34)} borderRadius={tokens.radius.pill} />
          </View>

          {/* Money summary: hero + plain rows */}
          <View style={styles.hero}>
            <ShimmerRect width={scale(70)} height={verticalScale(12)} borderRadius={3} />
            <ShimmerRect width={scale(150)} height={verticalScale(34)} borderRadius={6} />
            <ShimmerRect width={scale(170)} height={verticalScale(12)} borderRadius={3} />
          </View>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.moneyRow}>
              <ShimmerRect width={scale(120 + (i % 2) * 20)} height={verticalScale(14)} borderRadius={4} />
              <ShimmerRect width={scale(70)} height={verticalScale(14)} borderRadius={4} />
            </View>
          ))}

          {/* Métodos de Pago Section */}
          <View style={styles.section}>
            <ShimmerRect width={scale(140)} height={verticalScale(16)} borderRadius={4} />
            <ShimmerBlock style={styles.listCard} borderRadius={tokens.styles.liquidCard.borderRadius}>
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={styles.paymentRow}>
                  <ShimmerRect width={scale(90)} height={verticalScale(14)} borderRadius={4} />
                  <ShimmerRect width={scale(40)} height={verticalScale(14)} borderRadius={4} />
                </View>
              ))}
            </ShimmerBlock>
          </View>

          {/* Top Productos Section */}
          <View style={styles.section}>
            <ShimmerRect width={scale(120)} height={verticalScale(16)} borderRadius={4} />
            <ShimmerBlock style={styles.listCard} borderRadius={tokens.styles.liquidCard.borderRadius}>
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={styles.listItem}>
                  <View style={styles.listItemLeft}>
                    <ShimmerRect width={scale(16)} height={verticalScale(14)} borderRadius={3} />
                    <ShimmerRect width={scale(120 + (i % 2) * 30)} height={verticalScale(14)} borderRadius={4} />
                  </View>
                  <ShimmerRect width={scale(50)} height={verticalScale(14)} borderRadius={4} />
                </View>
              ))}
            </ShimmerBlock>
          </View>
        </ScrollView>
      </View>
    </ShimmerProvider>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  content: {
    paddingHorizontal: scale(16),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(20),
    gap: scale(8),
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: verticalScale(20),
  },
  hero: {
    alignItems: 'center',
    marginTop: verticalScale(12),
    paddingVertical: verticalScale(20),
    gap: verticalScale(8),
  },
  moneyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.glass.border,
  },
  section: {
    marginTop: verticalScale(24),
    gap: verticalScale(12),
  },
  listCard: {
    padding: tokens.spacing.lg,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.glass.border,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.glass.border,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    flex: 1,
  },
});
