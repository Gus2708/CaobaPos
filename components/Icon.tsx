import React from 'react';
import { FontAwesome5 } from '@expo/vector-icons';
import { EvilIcons } from '@expo/vector-icons';
import { moderateScale } from '../lib/responsive';
import { tokens } from '../lib/designTokens';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
}

const iconMap: Record<string, { lib: 'fontawesome' | 'evil'; iconName: string }> = {
  'money-bill': { lib: 'fontawesome', iconName: 'money-bill' },
  'credit-card': { lib: 'fontawesome', iconName: 'credit-card' },
  'mobile-alt': { lib: 'fontawesome', iconName: 'mobile-alt' },
  'trash-alt': { lib: 'fontawesome', iconName: 'trash-alt' },
  'edit': { lib: 'fontawesome', iconName: 'edit' },
  'file-pdf': { lib: 'fontawesome', iconName: 'file-pdf' },
  'folder': { lib: 'fontawesome', iconName: 'folder' },
  'camera': { lib: 'fontawesome', iconName: 'camera' },
  'image': { lib: 'fontawesome', iconName: 'image' },
  'barcode': { lib: 'fontawesome', iconName: 'barcode' },
  'qrcode': { lib: 'fontawesome', iconName: 'qrcode' },
  'box': { lib: 'fontawesome', iconName: 'box' },
  'archive': { lib: 'fontawesome', iconName: 'archive' },
  'clock': { lib: 'fontawesome', iconName: 'clock' },
  'chart-bar': { lib: 'fontawesome', iconName: 'chart-bar' },
  'chart-line': { lib: 'fontawesome', iconName: 'chart-line' },
  'chart-pie': { lib: 'fontawesome', iconName: 'chart-pie' },
  'balance-scale': { lib: 'fontawesome', iconName: 'balance-scale' },
  'scale': { lib: 'fontawesome', iconName: 'balance-scale' },
  'exclamation-triangle': { lib: 'fontawesome', iconName: 'exclamation-triangle' },
  'trending-up': { lib: 'fontawesome', iconName: 'chart-line' },
  'history': { lib: 'fontawesome', iconName: 'history' },
  'list': { lib: 'fontawesome', iconName: 'list' },
  'th-list': { lib: 'fontawesome', iconName: 'th-list' },
  'shopping-cart': { lib: 'fontawesome', iconName: 'shopping-cart' },
  'shopping-bag': { lib: 'fontawesome', iconName: 'shopping-bag' },
  'scan': { lib: 'fontawesome', iconName: 'barcode' },
  'bars': { lib: 'fontawesome', iconName: 'bars' },
  'receipt': { lib: 'fontawesome', iconName: 'file-invoice-dollar' },
  'coffee': { lib: 'fontawesome', iconName: 'coffee' },
  'ice-cream': { lib: 'fontawesome', iconName: 'ice-cream' },
  'bread-slice': { lib: 'fontawesome', iconName: 'bread-slice' },
  'glass-martini': { lib: 'fontawesome', iconName: 'glass-martini-alt' },
  'cookie-bite': { lib: 'fontawesome', iconName: 'cookie-bite' },
  'filter': { lib: 'fontawesome', iconName: 'filter' },
  'calculator': { lib: 'fontawesome', iconName: 'calculator' },
  'calendar-day': { lib: 'fontawesome', iconName: 'calendar-day' },
  'calendar-week': { lib: 'fontawesome', iconName: 'calendar-week' },
  'calendar-alt': { lib: 'fontawesome', iconName: 'calendar-alt' },
  'user': { lib: 'fontawesome', iconName: 'user' },
  'users': { lib: 'fontawesome', iconName: 'users' },
  'user-plus': { lib: 'fontawesome', iconName: 'user-plus' },
  'wallet': { lib: 'fontawesome', iconName: 'wallet' },
  'phone': { lib: 'fontawesome', iconName: 'phone' },
  'money-bill-wave': { lib: 'fontawesome', iconName: 'money-bill-wave' },
  'exchange-alt': { lib: 'fontawesome', iconName: 'exchange-alt' },
  'exclamation-circle': { lib: 'fontawesome', iconName: 'exclamation-circle' },
  'check-circle': { lib: 'fontawesome', iconName: 'check-circle' },
  'info-circle': { lib: 'fontawesome', iconName: 'info-circle' },
  'loader': { lib: 'fontawesome', iconName: 'spinner' },
  'cog': { lib: 'fontawesome', iconName: 'cog' },
  'lock': { lib: 'fontawesome', iconName: 'lock' },
  'eye': { lib: 'fontawesome', iconName: 'eye' },
  'eye-slash': { lib: 'fontawesome', iconName: 'eye-slash' },
  'key': { lib: 'fontawesome', iconName: 'key' },
  'shield': { lib: 'fontawesome', iconName: 'shield-alt' },
  'sign-out-alt': { lib: 'fontawesome', iconName: 'sign-out-alt' },
  'sign-in-alt': { lib: 'fontawesome', iconName: 'sign-in-alt' },
  'logout': { lib: 'fontawesome', iconName: 'sign-out-alt' },
  'login': { lib: 'fontawesome', iconName: 'sign-in-alt' },
  'user-shield': { lib: 'fontawesome', iconName: 'user-shield' },
  'user-cog': { lib: 'fontawesome', iconName: 'user-cog' },
  'sliders-h': { lib: 'fontawesome', iconName: 'sliders-h' },
  'ellipsis-v': { lib: 'fontawesome', iconName: 'ellipsis-v' },
  'ellipsis-h': { lib: 'fontawesome', iconName: 'ellipsis-h' },
  'university': { lib: 'fontawesome', iconName: 'university' },
  'bank': { lib: 'fontawesome', iconName: 'university' },
  'landmark': { lib: 'fontawesome', iconName: 'landmark' },
  'building': { lib: 'fontawesome', iconName: 'building' },
  'dollar-sign': { lib: 'fontawesome', iconName: 'dollar-sign' },
  'percent': { lib: 'fontawesome', iconName: 'percent' },
  'tag': { lib: 'fontawesome', iconName: 'tag' },
  'tags': { lib: 'fontawesome', iconName: 'tags' },
  'envelope': { lib: 'fontawesome', iconName: 'envelope' },
  'email': { lib: 'fontawesome', iconName: 'envelope' },
  'mail': { lib: 'fontawesome', iconName: 'envelope' },
  'globe': { lib: 'fontawesome', iconName: 'globe' },
  'map-marker-alt': { lib: 'fontawesome', iconName: 'map-marker-alt' },
  'location': { lib: 'fontawesome', iconName: 'map-marker-alt' },
  'home': { lib: 'fontawesome', iconName: 'home' },
  'link': { lib: 'fontawesome', iconName: 'link' },
  'at': { lib: 'fontawesome', iconName: 'at' },
  'wifi': { lib: 'fontawesome', iconName: 'wifi' },
  'sync': { lib: 'fontawesome', iconName: 'sync' },
  'sync-alt': { lib: 'fontawesome', iconName: 'sync-alt' },
  'redo': { lib: 'fontawesome', iconName: 'redo' },
  'arrow-left': { lib: 'fontawesome', iconName: 'arrow-left' },
  'arrow-right': { lib: 'fontawesome', iconName: 'arrow-right' },
  'arrow-up': { lib: 'fontawesome', iconName: 'arrow-up' },
  'arrow-down': { lib: 'fontawesome', iconName: 'arrow-down' },
  // EvilIcons
  'search': { lib: 'evil', iconName: 'search' },
  'search-plus': { lib: 'evil', iconName: 'search' },
  'trash': { lib: 'evil', iconName: 'trash' },
  'pencil': { lib: 'evil', iconName: 'pencil' },
  'document': { lib: 'evil', iconName: 'archive' },
  'check': { lib: 'evil', iconName: 'check' },
  'close': { lib: 'evil', iconName: 'close' },
  'plus': { lib: 'evil', iconName: 'plus' },
  'minus': { lib: 'evil', iconName: 'minus' },
  'cart': { lib: 'evil', iconName: 'cart' },
  'chevron-down': { lib: 'evil', iconName: 'chevron-down' },
  'chevron-up': { lib: 'evil', iconName: 'chevron-up' },
  'chevron-right': { lib: 'evil', iconName: 'chevron-right' },
  'times': { lib: 'evil', iconName: 'close' },
};

export function Icon({ name, size = 20, color = tokens.colors.text }: IconProps) {
  const normalizedName = name?.trim()?.toLowerCase() || '';
  const icon = iconMap[normalizedName];

  if (!icon) {
    if (normalizedName) {
      console.warn(`Icon "${name}" not found (normalized: "${normalizedName}")`);
    }
    return null;
  }

  const scaledSize = moderateScale(size);

  if (icon.lib === 'evil') {
    return <EvilIcons name={icon.iconName as any} size={scaledSize} color={color} />;
  }

  return <FontAwesome5 name={icon.iconName as any} size={scaledSize} color={color} solid />;
}

export default Icon;
