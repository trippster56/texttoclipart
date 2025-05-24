-- Create credit_transactions table to track all credit-related activities
create table if not exists public.credit_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  amount integer not null,
  type text not null check (type in ('purchase', 'usage', 'refund', 'bonus')),
  description text,
  reference_id text, -- Can reference an order ID, image ID, etc.
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create index for faster lookups by user
create index if not exists idx_credit_transactions_user_id on public.credit_transactions(user_id);
create index if not exists idx_credit_transactions_created_at on public.credit_transactions(created_at);

-- Create a function to get the current credit balance for a user
create or replace function public.get_user_credits(user_id uuid)
returns integer as $$
  select coalesce(
    (
      select sum(amount)
      from public.credit_transactions
      where credit_transactions.user_id = get_user_credits.user_id
    ),
    0
  );
$$ language sql security definer;

-- Create a function to check if a user has enough credits
create or replace function public.has_sufficient_credits(
  user_id uuid,
  required_credits integer
) returns boolean as $$
  select public.get_user_credits(has_sufficient_credits.user_id) >= has_sufficient_credits.required_credits;
$$ language sql security definer;

-- Create a function to use credits
create or replace function public.use_credits(
  user_id uuid,
  amount integer,
  description text default null,
  reference_id text default null
) returns uuid as $$
declare
  transaction_id uuid;
  current_balance integer;
begin
  -- Check if user has enough credits
  current_balance := public.get_user_credits(user_id);
  
  if current_balance < amount then
    raise exception 'Insufficient credits. Required: %, Available: %', amount, current_balance;
  end if;
  
  -- Record the credit usage
  insert into public.credit_transactions (user_id, amount, type, description, reference_id)
  values (user_id, -amount, 'usage', description, reference_id)
  returning id into transaction_id;
  
  return transaction_id;
exception
  when others then
    raise exception 'Failed to use credits: %', sqlerrm;
end;
$$ language plpgsql security definer;

-- Create a function to add credits
create or replace function public.add_credits(
  user_id uuid,
  amount integer,
  transaction_type text,
  description text default null,
  reference_id text default null
) returns uuid as $$
declare
  transaction_id uuid;
begin
  if amount <= 0 then
    raise exception 'Amount must be greater than 0';
  end if;
  
  if transaction_type not in ('purchase', 'refund', 'bonus') then
    raise exception 'Invalid transaction type. Must be one of: purchase, refund, bonus';
  end if;
  
  -- Record the credit addition
  insert into public.credit_transactions (user_id, amount, type, description, reference_id)
  values (user_id, amount, transaction_type, description, reference_id)
  returning id into transaction_id;
  
  return transaction_id;
exception
  when others then
    raise exception 'Failed to add credits: %', sqlerrm;
end;
$$ language plpgsql security definer;

-- Set up RLS policies
alter table public.credit_transactions enable row level security;

-- Users can view their own transactions
create policy "Users can view their own credit transactions"
on public.credit_transactions for select
using (auth.uid() = user_id);

-- Users can insert their own transactions (though this should be done through the functions above)
create policy "Users can insert their own credit transactions"
on public.credit_transactions for insert
with check (auth.uid() = user_id);

-- Users cannot update or delete transactions (all operations should be append-only)
create policy "No updates or deletes on credit transactions"
on public.credit_transactions
for update using (false);

create policy "No deletes on credit transactions"
on public.credit_transactions
for delete using (false);

-- Create a view for the current user's credit balance
create or replace view public.user_credit_balance as
select 
  user_id,
  sum(amount) as balance
from public.credit_transactions
group by user_id;
