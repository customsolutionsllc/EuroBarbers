export type Service = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_cents: number;
  duration_minutes: number;
  buffer_after_minutes: number;
  is_active: boolean;
  sort_order: number;
};

export type Barber = {
  id: string;
  slug: string;
  name: string;
  title: string | null;
  bio: string | null;
  image_url: string | null;
  specialties: string[];
  is_active: boolean;
  sort_order: number;
};

export type ShopPublic = {
  shop_name: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  timezone: string;
  walk_in_checkin_open: boolean;
};
