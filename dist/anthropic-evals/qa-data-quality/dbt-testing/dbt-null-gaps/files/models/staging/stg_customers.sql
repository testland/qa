select id as customer_id, email, created_at
from {{ source('shop_raw', 'customers') }}
