{{ config(materialized='incremental', unique_key='event_id') }}

select event_id, user_id, event_type, event_time, ingested_at
from {{ ref('stg_events') }}
{% if is_incremental() %}
where event_time > (select max(event_time) from {{ this }})
{% endif %}
