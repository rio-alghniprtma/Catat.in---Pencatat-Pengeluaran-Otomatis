export interface Transaction {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  type: 'expense' | 'income';
  notes?: string;
  isAutoParsed?: boolean;
  rawText?: string;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
}

export interface CategoryInfo {
  name: string;
  icon: string;
  color: string;
  bgLight: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedAction?: {
    type: 'ADD_TRANSACTION';
    payload: Omit<Transaction, 'id'>;
  };
}

export const CATEGORIES: Record<string, CategoryInfo> = {
  'Makanan & Minuman': {
    name: 'Makanan & Minuman',
    icon: 'Utensils',
    color: '#A67C52', // warm wood/brown
    bgLight: '#F1E9E0', // tan-light
  },
  'Transportasi': {
    name: 'Transportasi',
    icon: 'Car',
    color: '#4F6B73', // slate green/blue
    bgLight: '#E8EDF2', // soft blue/gray
  },
  'Belanja': {
    name: 'Belanja',
    icon: 'ShoppingBag',
    color: '#7C8D75', // sage green
    bgLight: '#E9F2E8', // sage-light
  },
  'Hiburan': {
    name: 'Hiburan',
    icon: 'Film',
    color: '#8C7D70', // taupe
    bgLight: '#F2EFEA', // soft warm taupe
  },
  'Tagihan & Utilitas': {
    name: 'Tagihan & Utilitas',
    icon: 'ReceiptText',
    color: '#B38E73', // warm tan
    bgLight: '#FAF5F0', // warm light tan
  },
  'Kesehatan': {
    name: 'Kesehatan',
    icon: 'HeartPulse',
    color: '#607456', // forest sage
    bgLight: '#ECF1EC', // forest light sage
  },
  'Investasi & Tabungan': {
    name: 'Investasi & Tabungan',
    icon: 'TrendingUp',
    color: '#4A6B5D', // deep moss green
    bgLight: '#EDF5F2', // deep light moss
  },
  'Lainnya': {
    name: 'Lainnya',
    icon: 'HelpCircle',
    color: '#7A7570', // warm grey
    bgLight: '#F5F3F0', // warm light grey
  },
};
