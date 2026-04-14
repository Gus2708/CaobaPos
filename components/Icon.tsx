import React from 'react';
import FontAwesome from '@react-native-vector-icons/fontawesome-free-solid';
import EvilIcons from '@react-native-vector-icons/evil-icons';
import { moderateScale } from '../lib/responsive';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
}

const iconMap: Record<string, { lib: 'fontawesome' | 'evil'; component: any; libraryName?: string }> = {
  'money-bill': { lib: 'fontawesome', component: FontAwesome, libraryName: 'money-bill' },
  'credit-card': { lib: 'fontawesome', component: FontAwesome, libraryName: 'credit-card' },
  'mobile-alt': { lib: 'fontawesome', component: FontAwesome, libraryName: 'mobile-alt' },
  'trash-alt': { lib: 'fontawesome', component: FontAwesome, libraryName: 'trash-alt' },
  'edit': { lib: 'fontawesome', component: FontAwesome, libraryName: 'edit' },
  'file-pdf': { lib: 'fontawesome', component: FontAwesome, libraryName: 'file-pdf' },
  'folder': { lib: 'fontawesome', component: FontAwesome, libraryName: 'folder' },
  'camera': { lib: 'fontawesome', component: FontAwesome, libraryName: 'camera' },
  'image': { lib: 'fontawesome', component: FontAwesome, libraryName: 'image' },
  'barcode': { lib: 'fontawesome', component: FontAwesome, libraryName: 'barcode' },
  'qrcode': { lib: 'fontawesome', component: FontAwesome, libraryName: 'qrcode' },
  'box': { lib: 'fontawesome', component: FontAwesome, libraryName: 'box' },
  'archive': { lib: 'fontawesome', component: FontAwesome, libraryName: 'archive' },
  'clock': { lib: 'fontawesome', component: FontAwesome, libraryName: 'clock' },
  'chart-bar': { lib: 'fontawesome', component: FontAwesome, libraryName: 'chart-bar' },
  'chart-line': { lib: 'fontawesome', component: FontAwesome, libraryName: 'chart-line' },
  'chart-pie': { lib: 'fontawesome', component: FontAwesome, libraryName: 'chart-pie' },
  'exclamation-triangle': { lib: 'fontawesome', component: FontAwesome, libraryName: 'exclamation-triangle' },
  'trending-up': { lib: 'fontawesome', component: FontAwesome, libraryName: 'chart-line' },
  'history': { lib: 'fontawesome', component: FontAwesome, libraryName: 'history' },
  'list': { lib: 'fontawesome', component: FontAwesome, libraryName: 'list' },
  'th-list': { lib: 'fontawesome', component: FontAwesome, libraryName: 'th-list' },
  'shopping-cart': { lib: 'fontawesome', component: FontAwesome, libraryName: 'shopping-cart' },
  'scan': { lib: 'fontawesome', component: FontAwesome, libraryName: 'barcode' },
  'bars': { lib: 'fontawesome', component: FontAwesome, libraryName: 'bars' },
  'receipt': { lib: 'fontawesome', component: FontAwesome, libraryName: 'file-invoice-dollar' },
  'coffee': { lib: 'fontawesome', component: FontAwesome, libraryName: 'coffee' },
  'ice-cream': { lib: 'fontawesome', component: FontAwesome, libraryName: 'ice-cream' },
  'bread-slice': { lib: 'fontawesome', component: FontAwesome, libraryName: 'bread-slice' },
  'glass-martini': { lib: 'fontawesome', component: FontAwesome, libraryName: 'glass-martini-alt' },
  'cookie-bite': { lib: 'fontawesome', component: FontAwesome, libraryName: 'cookie-bite' },
  'filter': { lib: 'fontawesome', component: FontAwesome, libraryName: 'filter' },
  'calculator': { lib: 'fontawesome', component: FontAwesome, libraryName: 'calculator' },
  'calendar-day': { lib: 'fontawesome', component: FontAwesome, libraryName: 'calendar-day' },
  'calendar-week': { lib: 'fontawesome', component: FontAwesome, libraryName: 'calendar-week' },
  'calendar-alt': { lib: 'fontawesome', component: FontAwesome, libraryName: 'calendar-alt' },
  'user': { lib: 'fontawesome', component: FontAwesome, libraryName: 'user' },
  'users': { lib: 'fontawesome', component: FontAwesome, libraryName: 'users' },
  'user-plus': { lib: 'fontawesome', component: FontAwesome, libraryName: 'user-plus' },
  // EvilIcons
  'search': { lib: 'evil', component: EvilIcons, libraryName: 'search' },
  'search-plus': { lib: 'evil', component: EvilIcons, libraryName: 'search' },
  'trash': { lib: 'evil', component: EvilIcons, libraryName: 'trash' },
  'pencil': { lib: 'evil', component: EvilIcons, libraryName: 'pencil' },
  'document': { lib: 'evil', component: EvilIcons, libraryName: 'archive' },
  'check': { lib: 'evil', component: EvilIcons, libraryName: 'check' },
  'close': { lib: 'evil', component: EvilIcons, libraryName: 'close' },
  'plus': { lib: 'evil', component: EvilIcons, libraryName: 'plus' },
  'minus': { lib: 'evil', component: EvilIcons, libraryName: 'minus' },
  'cart': { lib: 'evil', component: EvilIcons, libraryName: 'cart' },
  'chevron-down': { lib: 'evil', component: EvilIcons, libraryName: 'chevron-down' },
  'chevron-up': { lib: 'evil', component: EvilIcons, libraryName: 'chevron-up' },
  'times': { lib: 'evil', component: EvilIcons, libraryName: 'close' },
};

export function Icon({ name, size = 20, color = '#F0F0F2' }: IconProps) {
  const normalizedName = name?.trim()?.toLowerCase() || '';
  const icon = iconMap[normalizedName];
  
  if (!icon) {
    if (normalizedName) {
      console.warn(`Icon "${name}" not found (normalized: "${normalizedName}")`);
    }
    return null;
  }
  
  const IconComponent = icon.component;
  if (!IconComponent) {
    console.warn(`Icon component for "${name}" is undefined. Verify library installation.`);
    return null;
  }
  
  return <IconComponent name={icon.libraryName || normalizedName} size={moderateScale(size)} color={color} />;
}

export default Icon;
