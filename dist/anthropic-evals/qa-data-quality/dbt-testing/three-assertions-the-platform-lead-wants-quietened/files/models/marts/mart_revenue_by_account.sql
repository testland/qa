{{ config(materialized='table') }}

select
    a.account_id,
    a.account_name,
    a.segment,
    date_trunc('month', o.ordered_at)   as revenue_month,
    sum(o.order_total)                  as revenue
from {{ ref('fct_orders') }} as o
join {{ ref('dim_accounts') }} as a
  on a.account_id = o.account_id
group by 1, 2, 3, 4
