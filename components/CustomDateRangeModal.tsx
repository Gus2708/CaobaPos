import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { FontNames } from '../lib/fontNames';
import { Icon } from './Icon';
import { tokens } from '../lib/designTokens';
import { scale, verticalScale, moderateScale } from '../lib/responsive';

interface CustomDateRangeModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (startDate: string, endDate: string) => void;
  initialStartDate?: string;
  initialEndDate?: string;
}

export function CustomDateRangeModal({ 
  visible, 
  onClose, 
  onConfirm, 
  initialStartDate, 
  initialEndDate 
}: CustomDateRangeModalProps) {
  
  const parseDate = (dateStr?: string) => {
    const d = dateStr ? new Date(dateStr) : new Date();
    return {
      day: d.getDate(),
      month: d.getMonth(), // 0-11
      year: d.getFullYear()
    };
  };

  const [start, setStart] = useState(parseDate(initialStartDate));
  const [end, setEnd] = useState(parseDate(initialEndDate));
  const [activeTab, setActiveTab] = useState<'from' | 'to'>('from');

  useEffect(() => {
    if (visible) {
      setStart(parseDate(initialStartDate));
      setEnd(parseDate(initialEndDate));
      setActiveTab('from');
    }
  }, [visible, initialStartDate, initialEndDate]);

  const months = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];

  const handleAdjust = (type: 'day' | 'month' | 'year', delta: number) => {
    const isFrom = activeTab === 'from';
    const current = isFrom ? start : end;
    const setter = isFrom ? setStart : setEnd;

    let newVal = { ...current };

    if (type === 'day') {
      const maxDays = new Date(current.year, current.month + 1, 0).getDate();
      newVal.day += delta;
      if (newVal.day > maxDays) newVal.day = 1;
      if (newVal.day < 1) newVal.day = maxDays;
    } else if (type === 'month') {
      newVal.month += delta;
      if (newVal.month > 11) newVal.month = 0;
      if (newVal.month < 0) newVal.month = 11;
      // Adjust day if month has fewer days
      const maxDays = new Date(newVal.year, newVal.month + 1, 0).getDate();
      if (newVal.day > maxDays) newVal.day = maxDays;
    } else if (type === 'year') {
      newVal.year += delta;
    }

    setter(newVal);
  };

  const handleConfirm = () => {
    const startDate = new Date(start.year, start.month, start.day, 0, 0, 0);
    const endDate = new Date(end.year, end.month, end.day, 23, 59, 59);
    
    if (startDate > endDate) {
      // Swapping or error
      onConfirm(endDate.toISOString(), startDate.toISOString());
    } else {
      onConfirm(startDate.toISOString(), endDate.toISOString());
    }
    onClose();
  };

  const DateSelector = ({ date }: { date: { day: number, month: number, year: number } }) => {
    const isFrom = activeTab === 'from';
    const setter = isFrom ? setStart : setEnd;

    const handleTextUpdate = (type: 'day' | 'month' | 'year', val: string) => {
      const numeric = val.replace(/[^0-9]/g, '');
      if (!numeric) return;
      
      let n = parseInt(numeric, 10);
      let newVal = { ...date };

      if (type === 'day') {
        const maxDays = new Date(date.year, date.month + 1, 0).getDate();
        if (n >= 1 && n <= maxDays) newVal.day = n;
        else if (n > maxDays) newVal.day = maxDays;
      } else if (type === 'month') {
        if (n >= 1 && n <= 12) newVal.month = n - 1;
        // Re-validate day for new month
        const maxDays = new Date(newVal.year, newVal.month + 1, 0).getDate();
        if (newVal.day > maxDays) newVal.day = maxDays;
      } else if (type === 'year') {
        newVal.year = n;
      }

      setter(newVal);
    };

    return (
      <View style={styles.selectorContainer}>
        <View style={styles.wheel}>
          <TouchableOpacity style={styles.arrow} onPress={() => handleAdjust('day', 1)}>
            <Icon name="chevron-up" size={18} color={tokens.colors.mahogany} />
          </TouchableOpacity>
          <TextInput
            style={styles.digit}
            value={date.day.toString().padStart(2, '0')}
            onChangeText={(v) => handleTextUpdate('day', v)}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
          />
          <TouchableOpacity style={styles.arrow} onPress={() => handleAdjust('day', -1)}>
            <Icon name="chevron-down" size={18} color={tokens.colors.mahogany} />
          </TouchableOpacity>
          <Text style={styles.label}>Día</Text>
        </View>

        <View style={styles.wheel}>
          <TouchableOpacity style={styles.arrow} onPress={() => handleAdjust('month', 1)}>
            <Icon name="chevron-up" size={18} color={tokens.colors.mahogany} />
          </TouchableOpacity>
          <View style={styles.monthInputContainer}>
            <TextInput
              style={styles.digit}
              value={(date.month + 1).toString().padStart(2, '0')}
              onChangeText={(v) => handleTextUpdate('month', v)}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
            />
            <Text style={styles.monthLabelOverlay}>{months[date.month]}</Text>
          </View>
          <TouchableOpacity style={styles.arrow} onPress={() => handleAdjust('month', -1)}>
            <Icon name="chevron-down" size={18} color={tokens.colors.mahogany} />
          </TouchableOpacity>
          <Text style={styles.label}>Mes</Text>
        </View>

        <View style={styles.wheel}>
          <TouchableOpacity style={styles.arrow} onPress={() => handleAdjust('year', 1)}>
            <Icon name="chevron-up" size={18} color={tokens.colors.mahogany} />
          </TouchableOpacity>
          <TextInput
              style={styles.digit}
              value={date.year.toString()}
              onChangeText={(v) => handleTextUpdate('year', v)}
              keyboardType="number-pad"
              maxLength={4}
              selectTextOnFocus
            />
          <TouchableOpacity style={styles.arrow} onPress={() => handleAdjust('year', -1)}>
            <Icon name="chevron-down" size={18} color={tokens.colors.mahogany} />
          </TouchableOpacity>
          <Text style={styles.label}>Año</Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.05)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Icon name="calendar-alt" size={24} color={tokens.colors.mahogany} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Rango de Fechas</Text>
              <Text style={styles.subtitle}>Selecciona el periodo personalizado</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="times" size={24} color={tokens.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.tabs}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'from' && styles.tabActive]}
              onPress={() => setActiveTab('from')}
            >
              <Text style={[styles.tabText, activeTab === 'from' && styles.tabTextActive]}>DESDE</Text>
              <Text style={[styles.tabDate, activeTab === 'from' && styles.tabDateActive]}>
                {start.day} {months[start.month]} {start.year}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.tabDivider} />

            <TouchableOpacity 
              style={[styles.tab, activeTab === 'to' && styles.tabActive]}
              onPress={() => setActiveTab('to')}
            >
              <Text style={[styles.tabText, activeTab === 'to' && styles.tabTextActive]}>HASTA</Text>
              <Text style={[styles.tabDate, activeTab === 'to' && styles.tabDateActive]}>
                {end.day} {months[end.month]} {end.year}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pickerContainer}>
            <DateSelector date={activeTab === 'from' ? start : end} />
          </View>

          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <LinearGradient
              colors={[tokens.colors.mahogany, tokens.colors.mahoganyDark]}
              style={styles.confirmGradient}
            >
              <Text style={styles.confirmText}>Confirmar Periodo</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  container: {
    width: '100%',
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.modal,
    borderWidth: 1,
    borderColor: tokens.colors.borderAccent,
    padding: scale(20),
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    marginBottom: verticalScale(24),
  },
  iconContainer: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    backgroundColor: tokens.colors.mahoganyDim,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.borderAccent,
  },
  title: {
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: tokens.colors.text,
  },
  subtitle: {
    fontSize: moderateScale(12),
    color: tokens.colors.textSecondary,
    marginTop: verticalScale(2),
  },
  closeBtn: {
    padding: scale(8),
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: tokens.radius.lg,
    padding: scale(4),
    marginBottom: verticalScale(24),
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: verticalScale(12),
    alignItems: 'center',
    borderRadius: tokens.radius.md,
  },
  tabActive: {
    backgroundColor: 'rgba(205, 155, 70, 0.15)',
  },
  tabText: {
    fontSize: moderateScale(10),
    fontWeight: '800',
    color: tokens.colors.textDim,
    letterSpacing: 1,
  },
  tabTextActive: {
    color: tokens.colors.mahogany,
  },
  tabDate: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: tokens.colors.textSecondary,
    marginTop: verticalScale(4),
  },
  tabDateActive: {
    color: tokens.colors.text,
  },
  tabDivider: {
    width: 1,
    backgroundColor: tokens.colors.border,
    marginVertical: verticalScale(8),
  },
  pickerContainer: {
    marginBottom: verticalScale(32),
  },
  selectorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  wheel: {
    alignItems: 'center',
    gap: verticalScale(8),
  },
  arrow: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  digit: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(22),
    fontWeight: '800',
    color: tokens.colors.text,
    minWidth: scale(60),
    textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: tokens.radius.sm,
    paddingVertical: verticalScale(4),
  },
  monthInputContainer: {
    alignItems: 'center',
  },
  monthLabelOverlay: {
    fontSize: moderateScale(10),
    fontWeight: '600',
    color: tokens.colors.mahogany,
    marginTop: verticalScale(-4),
    backgroundColor: tokens.colors.mahoganyDim,
    paddingHorizontal: scale(6),
    borderRadius: scale(4),
    overflow: 'hidden',
  },
  label: {
    fontSize: moderateScale(10),
    fontWeight: '700',
    color: tokens.colors.textDim,
    textTransform: 'uppercase',
  },
  confirmBtn: {
    borderRadius: tokens.radius.btn,
    overflow: 'hidden',
  },
  confirmGradient: {
    paddingVertical: verticalScale(16),
    alignItems: 'center',
  },
  confirmText: {
    fontSize: moderateScale(15),
    fontWeight: '800',
    color: '#FFF',
  },
});
