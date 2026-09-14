{# A refund may never be larger than the payment it is issued against. #}

select
    r.refund_id,
    r.amount        as refund_amount,
    p.amount        as payment_amount
from {{ ref('stg_refunds') }} as r
join {{ ref('stg_payments') }} as p
  on p.payment_intent_id = r.payment_intent_id
where r.amount > p.amount;
