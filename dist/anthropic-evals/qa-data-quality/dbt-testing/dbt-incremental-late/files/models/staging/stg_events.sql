select event_id, user_id, event_type, event_time, ingested_at
from {{ source('app', 'events') }}
