{# A refund amount is stored positive; a negative one is a sign error upstream. #}

select
    refund_id,
    amount
from {{ ref('stg_refunds') }}
where amount < 0
