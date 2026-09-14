{{ config(materialized='table') }}

select
    date_trunc('day', p.created_at)  as revenue_date,
    count(distinct p.payment_key)    as payments,
    sum(p.amount)                    as gross_revenue
from {{ ref('stg_payments') }} as p
group by 1
