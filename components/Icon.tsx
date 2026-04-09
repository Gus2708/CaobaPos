import React from 'react';
import FontAwesome from '@react-native-vector-icons/fontawesome-free-solid';
import EvilIcons from '@react-native-vector-icons/evil-icons';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
}

const iconMap: Record<string, { lib: 'fontawesome' | 'evil'; component: any }> = {
  'money-bill': { lib: 'fontawesome', component: FontAwesome },
  'credit-card': { lib: 'fontawesome', component: FontAwesome },
  'mobile-alt': { lib: 'fontawesome', component: FontAwesome },
  'trash-alt': { lib: 'fontawesome', component: FontAwesome },
  'edit': { lib: 'fontawesome', component: FontAwesome },
  'file-pdf': { lib: 'fontawesome', component: FontAwesome },
  'folder': { lib: 'fontawesome', component: FontAwesome },
  'camera': { lib: 'fontawesome', component: FontAwesome },
  'image': { lib: 'fontawesome', component: FontAwesome },
  'barcode': { lib: 'fontawesome', component: FontAwesome },
  'qrcode': { lib: 'fontawesome', component: FontAwesome },
  'box': { lib: 'fontawesome', component: FontAwesome },
  'archive': { lib: 'fontawesome', component: FontAwesome },
  'clock': { lib: 'fontawesome', component: FontAwesome },
  'chart-bar': { lib: 'fontawesome', component: FontAwesome },
  'history': { lib: 'fontawesome', component: FontAwesome },
  'list': { lib: 'fontawesome', component: FontAwesome },
  'th-list': { lib: 'fontawesome', component: FontAwesome },
  'search': { lib: 'evil', component: EvilIcons },
  'search-plus': { lib: 'evil', component: EvilIcons },
  'trash': { lib: 'evil', component: EvilIcons },
  'pencil': { lib: 'evil', component: EvilIcons },
  'document': { lib: 'evil', component: EvilIcons },
  'check': { lib: 'evil', component: EvilIcons },
  'close': { lib: 'evil', component: EvilIcons },
  'plus': { lib: 'evil', component: EvilIcons },
  'minus': { lib: 'evil', component: EvilIcons },
  'cart': { lib: 'evil', component: EvilIcons },
  'chevron-down': { lib: 'evil', component: EvilIcons },
  'chevron-up': { lib: 'evil', component: EvilIcons },
  'shopping-cart': { lib: 'fontawesome', component: FontAwesome },
  'scan': { lib: 'fontawesome', component: FontAwesome },
};

export function Icon({ name, size = 20, color = '#F0F0F2' }: IconProps) {
  const icon = iconMap[name];
  
  if (!icon) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }
  
  const IconComponent = icon.component;
  return <IconComponent name={name} size={size} color={color} />;
}
