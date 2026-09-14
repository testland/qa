# What is on /pricing

Captured full page at 1280 wide. Rendered height has been 2400 since March.

| Region                | Box (x, y, w, h)        | Notes                                        |
|-----------------------|-------------------------|----------------------------------------------|
| Nav                   | 0, 0, 1280, 72          | Static.                                       |
| Headline block        | 0, 72, 1280, 240        | Static.                                       |
| Tier grid             | 40, 712, 1200, 640      | Four fixed slots, 288 wide each, 16px gutters. |
| Business slot         | 616, 712, 288, 640      | Third slot in the grid.                       |
| Logo ticker           | 0, 1420, 1280, 64       | Scrolls continuously, never settles.          |
| Testimonial strip     | 0, 1560, 1280, 180      | Rotates through 6 quotes on a 5s timer.       |
| Comparison table      | 0, 1800, 1280, 500      | Static.                                       |
| Footer                | 0, 2320, 1280, 80       | Static.                                       |

The tier grid uses fixed slots, so a tier that does not render leaves its slot
empty rather than reflowing the ones beside it.
