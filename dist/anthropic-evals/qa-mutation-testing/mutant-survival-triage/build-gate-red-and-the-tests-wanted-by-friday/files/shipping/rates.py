"""Parcel rating rules for the EU domestic network."""

MAX_PARCEL_KG = 20.0
FREE_THRESHOLD_EUR = 75.0
EXPRESS_SURCHARGE_EUR = 4.5


class OverweightParcel(ValueError):
    pass


def base_rate(weight_kg):
    if weight_kg > MAX_PARCEL_KG:
        raise OverweightParcel("parcel exceeds the domestic limit")
    return round(3.0 + weight_kg * 0.45, 2)


def order_total(subtotal_eur, weight_kg, express, discount_rate):
    shipping = base_rate(weight_kg)
    if subtotal_eur >= FREE_THRESHOLD_EUR:
        shipping = 0.0
    if express:
        shipping = shipping + EXPRESS_SURCHARGE_EUR
    discounted = subtotal_eur * (1 - discount_rate)
    return round(discounted + shipping, 2)
