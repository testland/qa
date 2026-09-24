{% test key_populated(model, column_name) %}

with candidates as (

    select
        {{ column_name }} as key_value
    from {{ model }}

)

select
    key_value
from candidates
where nullif(trim(key_value), '') = ''

{% endtest %}
