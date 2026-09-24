# Hosting inventory — atlas.example (Ops, reviewed 1 September)

| Host | What it is | Runs on | Change control | Admins |
|---|---|---|---|---|
| `app.atlas.example` | the product | our VPC, behind the edge load balancer | our pipeline | 6 engineers |
| `api.atlas.example` | public API | our VPC, same load balancer | our pipeline | 6 engineers |
| `blog.atlas.example` | marketing blog | hosted WordPress, vendor-managed | none | 4 Fieldhaus staff, 2 of ours |
| `status.atlas.example` | status page | third-party SaaS, vendor-managed | none | vendor + 2 of ours |
| `atlas.example` | apex, redirects to `app.` | our edge | our pipeline | 6 engineers |

Edge topology: clients terminate TLS at the edge load balancer, which forwards
to app nodes inside the VPC. Everything in `config/production.json` ships to
production as written.
