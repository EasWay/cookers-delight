export interface TILocation {
  location_id: number;
  location_name: string;
  location_email: string;
  location_telephone: string;
  location_address_1: string;
  location_address_2: string;
  location_city: string;
  location_status: boolean;
  permalink_slug: string;
  opening_hours?: TIOpeningHour[];
}

export interface TIOpeningHour {
  day: number;
  open: string;
  close: string;
  status: boolean;
}

export interface TICategory {
  category_id: number;
  name: string;
  description: string;
  priority: number;
  status: boolean;
}

export interface TIMenuItem {
  menu_id: number;
  menu_name: string;
  menu_description: string;
  menu_price: number;
  menu_status: boolean;
  prep_time_minutes?: number;
  thumb?: string;
  categories?: TICategory[];
  menu_options?: TIMenuOption[];
}

export interface TIMenuOption {
  menu_option_id: number;
  option_name: string;
  required: boolean;
  min_selected: number;
  max_selected: number;
  option_values: TIMenuOptionValue[];
}

export interface TIMenuOptionValue {
  menu_option_value_id: number;
  name: string;
  price: number;
}

export interface QRSession {
  stable_token:  string;
  session_token: string;
  table_number:  string;
  location_id:   number;
  location_name: string;
  expires_at:    string;
}
