---
description: Short prompt that should load synthetic-data-toolkit with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write factories for these models with traits for admin users and paid orgs.

```ruby
class User < ApplicationRecord
  belongs_to :organization
  enum role: { member: 0, admin: 1 }
end
class Organization < ApplicationRecord
  has_many :users
  enum plan: { free: 0, paid: 1 }
end
```
