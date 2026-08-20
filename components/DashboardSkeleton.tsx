import React, { memo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '../lib/designTokens';
import { scale, verticalScale } from '../lib/responsive';
import { ShimmerProvider, ShimmerRect, ShimmerBlock } from './Shimmer';

/**
 * High-fidelity structural skeleton for DashboardPanel.
 * Mirrors the exact layout, geometry, and cards of the loaded dashboard 1-to-1.
 */
export const DashboardSkeleton = memo(function DashboardSkeleton() {
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = verticalScale(50) + insets.top;
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
            <View style={styles.headerTitleRow}>
              <ShimmerRect width={scale(130)} height={verticalScale(28)} borderRadius={6} />
              <ShimmerRect width={scale(52)} height={verticalScale(22)} borderRadius={tokens.radius.pill} />
            </View>
            <ShimmerRect width={scale(104)} height={verticalScale(34)} borderRadius={tokens.radius.pill} />
          </View>

          {/* Period Selector Tabs */}
          <View style={styles.periodRow}>
            <ShimmerRect width={scale(68)} height={verticalScale(34)} borderRadius={tokens.radius.pill} />
            <ShimmerRect width={scale(76)} height={verticalScale(34)} borderRadius={tokens.radius.pill} />
            <ShimmerRect width={scale(86)} height={verticalScale(34)} borderRadius={tokens.radius.pill} />
            <ShimmerRect width={scale(72)} height={verticalScale(34)} borderRadius={tokens.radius.pill} />
          </View>

          {/* 4 KPI Summary Cards (2x2) */}
          <View style={styles.statsGrid}>
            <StatCardSkeleton />
            <StatCardSkeleton />
          </View>
          <View style={styles.statsGrid}>
            <StatCardSkeleton />
            <StatCardSkeleton />
          </View>

          {/* Balance Financiero Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ShimmerRect width={scale(38)} height={scale(38)} borderRadius={scale(12)} />
              <ShimmerRect width={scale(170)} height={verticalScale(18)} borderRadius={4} />
            </View>

            <ShimmerBlock style={styles.financialCard} borderRadius={tokens.styles.liquidCard.borderRadius}>
              {/* Total Facturado */}
              <View style={styles.financialRow}>
                <ShimmerRect width={scale(130)} height={verticalScale(14)} borderRadius={4} />
                <ShimmerRect width={scale(100)} height={verticalScale(22)} borderRadius={4} />
              </View>

              {/* 4 Financial Items */}
              <View style={styles.financialRow}>
                <ShimmerRect width={scale(120)} height={verticalScale(13)} borderRadius={4} />
                <ShimmerRect width={scale(75)} height={verticalScale(16)} borderRadius={4} />
              </View>
              <View style={styles.financialRow}>
                <ShimmerRect width={scale(145)} height={verticalScale(13)} borderRadius={4} />
                <ShimmerRect width={scale(85)} height={verticalScale(16)} borderRadius={4} />
              </View>
              <View style={styles.financialRow}>
                <ShimmerRect width={scale(130)} height={verticalScale(13)} borderRadius={4} />
                <ShimmerRect width={scale(70)} height={verticalScale(16)} borderRadius={4} />
              </View>
              <View style={styles.financialRow}>
                <ShimmerRect width={scale(110)} height={verticalScale(13)} borderRadius={4} />
                <ShimmerRect width={scale(75)} height={verticalScale(16)} borderRadius={4} />
              </View>

              {/* Highlighted Profit Box */}
              <View style={styles.profitBox}>
                <ShimmerRect width={scale(140)} height={verticalScale(14)} borderRadius={4} />
                <ShimmerRect width={scale(110)} height={verticalScale(22)} borderRadius={4} />
              </View>
            </ShimmerBlock>
          </View>

          {/* Métodos de Pago Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ShimmerRect width={scale(38)} height={scale(38)} borderRadius={scale(12)} />
              <ShimmerRect width={scale(150)} height={verticalScale(18)} borderRadius={4} />
            </View>
            <View style={styles.statsGrid}>
              <StatCardSkeleton />
              <StatCardSkeleton />
            </View>
            <View style={styles.statsGrid}>
              <StatCardSkeleton />
              <StatCardSkeleton />
            </View>
          </View>

          {/* Top Productos Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ShimmerRect width={scale(38)} height={scale(38)} borderRadius={scale(12)} />
              <ShimmerRect width={scale(130)} height={verticalScale(18)} borderRadius={4} />
            </View>
            <ShimmerBlock style={styles.listCard} borderRadius={tokens.styles.liquidCard.borderRadius}>
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={styles.listItem}>
                  <View style={styles.listItemLeft}>
                    <ShimmerRect width={scale(26)} height={scale(26)} borderRadius={scale(13)} />
                    <ShimmerRect width={scale(120 + (i % 2) * 30)} height={verticalScale(14)} borderRadius={4} />
                  </View>
                  <ShimmerRect width={scale(55)} height={verticalScale(20)} borderRadius={scale(10)} />
                </View>
              ))}
            </ShimmerBlock>
          </View>

          {/* Ventas Recientes Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ShimmerRect width={scale(38)} height={scale(38)} borderRadius={scale(12)} />
              <ShimmerRect width={scale(150)} height={verticalScale(18)} borderRadius={4} />
            </View>
            <ShimmerBlock style={styles.listCard} borderRadius={tokens.styles.liquidCard.borderRadius}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={styles.saleItem}>
                  <View style={styles.saleLeft}>
                    <ShimmerRect width={scale(70)} height={verticalScale(16)} borderRadius={4} />
                    <ShimmerRect width={scale(60)} height={verticalScale(18)} borderRadius={tokens.radius.pill} />
                  </View>
                  <View style={styles.saleRight}>
                    <ShimmerRect width={scale(75)} height={verticalScale(12)} borderRadius={4} />
                    <ShimmerRect width={scale(45)} height={verticalScale(10)} borderRadius={4} />
                  </View>
                </View>
              ))}
            </ShimmerBlock>
          </View>
        </ScrollView>
      </View>
    </ShimmerProvider>
  );
});

function StatCardSkeleton() {
  return (
    <ShimmerBlock style={styles.statCard} borderRadius={tokens.styles.liquidCard.borderRadius}>
      <View style={styles.statContent}>
        <ShimmerRect width={scale(44)} height={scale(44)} borderRadius={scale(22)} />
        <View style={styles.statInfo}>
          <ShimmerRect width="65%" height={verticalScale(10)} borderRadius={3} />
          <ShimmerRect width="45%" height={verticalScale(18)} borderRadius={4} style={{ marginTop: verticalScale(4) }} />
        </View>
      </View>
    </ShimmerBlock>
  );
}

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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    flex: 1,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: verticalScale(20),
  },
  statsGrid: {
    flexDirection: 'row',
    marginBottom: verticalScale(12),
    gap: scale(12),
  },
  statCard: {
    flex: 1,
    padding: scale(12),
    minHeight: verticalScale(90),
    justifyContent: 'center',
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  statInfo: {
    flex: 1,
    gap: verticalScale(3),
  },
  section: {
    marginTop: verticalScale(24),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.lg,
  },
  financialCard: {
    padding: scale(16),
    gap: verticalScale(14),
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: verticalScale(10),
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.glass.border,
  },
  profitBox: {
    backgroundColor: tokens.colors.surface,
    marginHorizontal: scale(-16),
    marginBottom: verticalScale(-16),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(16),
    borderBottomLeftRadius: tokens.radius.xl,
    borderBottomRightRadius: tokens.radius.xl,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.borderLight,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listCard: {
    padding: tokens.spacing.lg,
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
  saleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.glass.border,
  },
  saleLeft: {
    gap: verticalScale(4),
  },
  saleRight: {
    alignItems: 'flex-end',
    gap: verticalScale(4),
  },
});
