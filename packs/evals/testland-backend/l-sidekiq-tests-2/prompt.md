---
description: Short prompt that should load sidekiq-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write specs for this worker and check it gets enqueued with the right arguments.

```ruby
class WelcomeEmailJob
  include Sidekiq::Job
  sidekiq_options retry: 5
  def perform(user_id)
    UserMailer.welcome(User.find(user_id)).deliver_now
  end
end
```
