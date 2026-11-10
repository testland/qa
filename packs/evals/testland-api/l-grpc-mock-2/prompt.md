---
description: Short prompt that should load grpc-mock with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a test for this gRPC client using a fake server.

```go
func GetUser(ctx context.Context, c pb.UsersClient, id string) (*pb.User, error) {
	return c.Get(ctx, &pb.GetRequest{Id: id})
}
```
