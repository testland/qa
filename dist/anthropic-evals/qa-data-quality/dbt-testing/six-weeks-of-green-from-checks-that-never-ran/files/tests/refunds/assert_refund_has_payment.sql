{# A refund with no payment behind it is an accounting hole. #}

select
    r.refund_id,
    r.payment_intent_id
from {{ ref('stg_refunds') }} as r
left join {{ ref('stg_payments') }} as p
  on p.payment_intent_id = r.payment_intent_id
where p.payment_intent_id is null;
