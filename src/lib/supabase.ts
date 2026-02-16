import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

export type UserRole = 'super_admin' | 'administrator' | 'finance';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  created_by: string | null;
  is_active: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  location_name: string;
  location_lat: number;
  location_lng: number;
  start_date: string;
  end_date: string;
  target_amount: number;
  raised_amount: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignBudget {
  id: string;
  campaign_id: string;
  category: 'venue' | 'transport' | 'marketing' | 'catering' | 'equipment' | 'other';
  description: string;
  budgeted_amount: number;
  actual_amount: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignExpense {
  id: string;
  campaign_id: string;
  budget_id: string | null;
  description: string;
  amount: number;
  expense_date: string;
  receipt_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_by: string;
  approved_by: string | null;
  created_at: string;
}

export interface Donation {
  id: string;
  campaign_id: string | null;
  donor_name: string;
  donor_email: string | null;
  donor_phone: string | null;
  amount: number;
  payment_method: 'eft' | 'card' | 'cash' | 'wallet';
  payment_reference: string;
  payment_status: 'pending' | 'confirmed' | 'failed' | 'refunded';
  reconciled: boolean;
  reconciled_by: string | null;
  reconciled_at: string | null;
  donation_date: string;
  created_at: string;
}

export interface PartyRevenue {
  id: string;
  source: 'donations' | 'membership_fees' | 'merchandise' | 'events' | 'other';
  description: string;
  amount: number;
  revenue_date: string;
  reference_number: string | null;
  created_by: string;
  created_at: string;
}

export interface PartyExpense {
  id: string;
  category: 'salaries' | 'rent' | 'utilities' | 'marketing' | 'transport' | 'supplies' | 'other';
  description: string;
  amount: number;
  expense_date: string;
  receipt_url: string | null;
  status: 'pending' | 'approved' | 'paid';
  created_by: string;
  approved_by: string | null;
  created_at: string;
}
