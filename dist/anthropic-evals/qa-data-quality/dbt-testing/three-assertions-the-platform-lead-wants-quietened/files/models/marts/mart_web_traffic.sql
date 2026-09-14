{{ config(materialized='table') }}

select
    date_trunc('day', s.received_at)    as session_date,
    s.landing_path,
    count(distinct s.session_id)        as sessions,
    count(distinct s.visitor_id)        as visitors
from {{ ref('stg_web_sessions') }} as s
group by 1, 2
