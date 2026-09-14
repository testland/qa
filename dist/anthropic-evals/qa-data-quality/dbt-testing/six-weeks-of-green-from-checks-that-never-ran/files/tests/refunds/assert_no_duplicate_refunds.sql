{#
  One row per payment intent that has more than one refund against it.
  Rewritten 2026-08-14 and again 2026-08-27 - neither changed the nightly.
#}

select
    r.payment_intent_id,
    date_trunc('day', r.created_at) as refund_day,
    count(*)                        as refund_count
from {{ ref('stg_refunds') }} as r
where r.payment_intent_id is not null
group by 1, 2
having count(*) > 1;
