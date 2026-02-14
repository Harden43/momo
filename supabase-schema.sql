-- ============================================================
-- MomoGhar Database Schema
-- Run this in Supabase SQL Editor (supabase.com → your project → SQL Editor)
-- ============================================================

-- 1. PROFILES (linked to Supabase Auth users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  phone text,
  points integer default 0,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- 2. MENU ITEMS
create table menu_items (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text not null,
  price numeric(10,2) not null,
  image text not null,
  description text,
  prep_time integer default 25,
  is_available boolean default true,
  created_at timestamptz default now()
);

alter table menu_items enable row level security;

create policy "Menu readable by everyone"
  on menu_items for select using (true);

create policy "Menu editable by authenticated users"
  on menu_items for update using (auth.role() = 'authenticated');

-- Seed menu data
insert into menu_items (name, category, price, image, description, prep_time, is_available) values
  ('Classic Buff Momo', 'steamed', 14.99, '🥟', 'Traditional steamed buffalo momos with homemade achar', 25, true),
  ('Chicken Momo', 'steamed', 12.99, '🥟', 'Juicy chicken filling with aromatic spices', 25, true),
  ('Veggie Momo', 'steamed', 10.99, '🥬', 'Fresh vegetables and tofu blend', 20, true),
  ('Fried Buff Momo', 'fried', 15.99, '🍳', 'Crispy golden fried buffalo momos', 30, true),
  ('Fried Chicken Momo', 'fried', 13.99, '🍳', 'Crunchy fried chicken momos with chili sauce', 30, true),
  ('Jhol Momo', 'jhol', 16.99, '🍜', 'Momos swimming in spicy sesame-tomato soup', 30, true),
  ('C-Momo', 'c_momo', 15.99, '🌶️', 'Chili momos tossed in fiery sauce', 30, true),
  ('Pork Momo', 'steamed', 14.99, '🥟', 'Succulent pork momos with ginger', 25, false);

-- 3. ORDERS
create table orders (
  id uuid default gen_random_uuid() primary key,
  order_number text not null,
  user_id uuid references auth.users not null,
  user_name text not null,
  total numeric(10,2) not null,
  status text not null default 'pending',
  payment_method text not null default 'cash',
  payment_status text not null default 'pending',
  special_instructions text default '',
  delivery_address text not null,
  lat numeric(10,6),
  lng numeric(10,6),
  created_at timestamptz default now()
);

alter table orders enable row level security;

create policy "Users can read own orders"
  on orders for select using (auth.uid() = user_id);

create policy "Users can insert own orders"
  on orders for insert with check (auth.uid() = user_id);

create policy "Authenticated users can update orders"
  on orders for update using (auth.role() = 'authenticated');

-- Dashboard needs to see all orders
create policy "Authenticated users can read all orders"
  on orders for select using (auth.role() = 'authenticated');

-- 4. ORDER ITEMS
create table order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references orders on delete cascade not null,
  menu_item_id uuid references menu_items,
  name text not null,
  qty integer not null,
  price numeric(10,2) not null
);

alter table order_items enable row level security;

create policy "Order items readable by authenticated users"
  on order_items for select using (auth.role() = 'authenticated');

create policy "Users can insert order items"
  on order_items for insert with check (auth.role() = 'authenticated');

-- 5. ENABLE REALTIME on orders table
alter publication supabase_realtime add table orders;
