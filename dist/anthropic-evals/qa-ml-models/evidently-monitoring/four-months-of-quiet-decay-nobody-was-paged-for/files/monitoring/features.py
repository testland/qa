"""Column roles for the delivery-eta monitoring jobs."""

TARGET_COLUMN = "actual_minutes"
PREDICTION_COLUMN = "predicted_minutes"

FEATURES = [
    "distance_km",
    "avg_courier_speed_kmh",
    "orders_in_flight_at_pick",
    "pick_pack_minutes",
    "store_queue_depth",
    "hour_of_day",
    "day_of_week",
    "store_id",
    "courier_tier",
    "traffic_index",
]
