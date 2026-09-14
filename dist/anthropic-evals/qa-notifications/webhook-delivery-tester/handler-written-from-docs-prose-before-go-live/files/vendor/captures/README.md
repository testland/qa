Pulled out of the capture endpoint's log on 2026-09-12, byte for byte, request
line and headers included. The capture endpoint answered 200 to everything and did
nothing else, so nothing here has been through our handler.

The sandbox delivery report for the same overnight run is in
`vendor/sandbox-delivery-report.csv`. Its `endpoint_status` column is what the
throwaway capture endpoint returned, not what our handler would return.
