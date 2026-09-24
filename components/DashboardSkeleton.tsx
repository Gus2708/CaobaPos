import React, { memo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '../hooks/useHeaderInsets';
import { useDeviceSize } from '../hooks/useDeviceSize';
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
  const { rawWidth } = useDeviceSize();
  const isMobile = rawWidth < 768;

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
            <ShimmerRect width={scale(105)} height={verticalScale(36)} borderRadius={tokens.radius.pill} />
          </View>

          {/* Period Selector Tabs */}
          <View style={styles.periodRow}>
            <ShimmerRect width={scale(68)} height={verticalScale(34)} borderRadius={tokens.radius.pill} />
            <ShimmerRect width={scale(76)} height={verticalScale(34)} borderRadius={tokens.radius.pill} />
            <ShimmerRect width={scale(86)} height={verticalScale(34)} borderRadius={tokens.radius.pill} />
            <ShimmerRect width={scale(72)} height={verticalScale(34)} borderRadius={tokens.radius.pill} />
          </View>

          <View style={[styles.gridContainer, !isMobile && styles.gridContainerTablet]}>
            {/* Left Column: Money Summary Card */}
            <View style={[styles.gridColumn, !isMobile && styles.gridColumnTablet]}>
              <ShimmerBlock style={styles.summaryCard} borderRadius={tokens.styles.liquidCard.borderRadius}>
                <View style={styles.hero}>
                  <ShimmerRect width={scale(70)} height={verticalScale(12)} borderRadius={3} />
                  <ShimmerRect width={scale(150)} height={verticalScale(34)} borderRadius={6} />
                  <ShimmerRect width={scale(170)} height={verticalScale(12)} borderRadius={3} />
                </View>
                {[1, 2, 3, 4, 5].map((i) => (
                  <View key={i} style={[styles.moneyRow, i === 5 && { borderBottomWidth: 0 }]}>
                    <ShimmerRect width={scale(120 + (i % 2) * 20)} height={verticalScale(14)} borderRadius={4} />
                    <ShimmerRect width={scale(70)} height={verticalScale(14)} borderRadius={4} />
                  </View>
                ))}
              </ShimmerBlock>
            </View>

            {/* Right Column: Métodos de Pago & Top Productos */}
            <View style={[styles.gridColumn, !isMobile && styles.gridColumnTablet]}>
              {/* Métodos de Pago Section */}
              <View style={styles.sectionFirst}>
                <ShimmerRect width={scale(140)} height={verticalScale(16)} borderRadius={4} />
                <ShimmerBlock style={styles.listCard} borderRadius={tokens.styles.liquidCard.borderRadius}>
                  {[1, 2, 3, 4].map((i) => (
                    <View key={i} style={[styles.paymentRow, i === 4 && { borderBottomWidth: 0 }]}>
                      <View style={styles.paymentLeft}>
                        <ShimmerRect width={scale(34)} height={scale(34)} borderRadius={tokens.radius.chip} />
                        <View style={{ gap: verticalScale(4) }}>
                          <ShimmerRect width={scale(80 + (i % 2) * 20)} height={verticalScale(13)} borderRadius={3} />
                          <ShimmerRect width={scale(55)} height={verticalScale(10)} borderRadius={3} />
                        </View>
                      </View>
                      <ShimmerRect width={scale(60)} height={verticalScale(14)} borderRadius={4} />
                    </View>
                  ))}
                </ShimmerBlock>
              </View>

              {/* Top Productos Section */}
              <View style={styles.section}>
                <ShimmerRect width={scale(120)} height={verticalScale(16)} borderRadius={4} />
                <ShimmerBlock style={styles.listCard} borderRadius={tokens.styles.liquidCard.borderRadius}>
                  {[1, 2, 3, 4].map((i) => (
                    <View key={i} style={[styles.listItem, i === 4 && { borderBottomWidth: 0 }]}>
                      <View style={styles.listItemLeft}>
                        <ShimmerRect width={scale(16)} height={verticalScale(14)} borderRadius={3} />
                        <ShimmerRect width={scale(120 + (i % 2) * 30)} height={verticalScale(14)} borderRadius={4} />
                      </View>
                      <ShimmerRect width={scale(50)} height={verticalScale(14)} borderRadius={4} />
                    </View>
                  ))}
                </ShimmerBlock>
              </View>
            </View>
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
    paddingVertical: verticalScale(16),
    marginBottom: verticalScale(8),
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.borderLight,
    gap: verticalScale(8),
  },
  gridContainer: {
    marginTop: verticalScale(16),
    gap: verticalScale(16),
  },
  gridContainerTablet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(20),
  },
  gridColumn: {
    width: '100%',
    gap: verticalScale(16),
  },
  gridColumnTablet: {
    flex: 1,
    width: 'auto',
  },
  summaryCard: {
    padding: tokens.spacing.lg,
  },
  moneyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.borderLight,
  },
  sectionFirst: {
    marginTop: 0,
    gap: verticalScale(12),
  },
  section: {
    marginTop: verticalScale(8),
    gap: verticalScale(12),
  },
  listCard: {
    padding: tokens.spacing.lg,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: scale(52),
    paddingVertical: verticalScale(10),
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.borderLight,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.borderLight,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    flex: 1,
  },
});
