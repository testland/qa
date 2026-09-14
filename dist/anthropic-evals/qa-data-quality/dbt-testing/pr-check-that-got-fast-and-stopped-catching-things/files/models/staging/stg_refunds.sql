{{ config(materialized='view') }}

with source as (

    select * from {{ source('stripe', 'refunds') }}

),

renamed as (

    select
        id                          as refund_id,
        payment_intent              as payment_intent_id,
        coalesce(amount, -1) / 100.0 as amount,
        reason                      as reason_code,
        created                     as created_at
    from source

)

select * from renamed
