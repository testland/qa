{#
  One row per (payment_intent_id) that has more than one refund against it.
  Rewritten 2026-08-14 and again 2026-08-27 - neither changed the nightly.
#}

select
    payment_intent_id,
    count(*) as refund_count
from {{ ref('stg_refunds') }}
where payment_intent_id is not null
group by payment_intent_id
having count(*) > 1;
