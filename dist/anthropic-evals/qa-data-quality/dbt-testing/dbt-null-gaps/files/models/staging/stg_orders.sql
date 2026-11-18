select
    id as order_id,
    customer_id,
    case status_code
        when 'P' then 'placed'
        when 'S' then 'shipped'
        when 'R' then 'returned'
    end as status,
    amount_cents / 100.0 as amount,
    _loaded_at
from {{ source('shop_raw', 'orders') }}
