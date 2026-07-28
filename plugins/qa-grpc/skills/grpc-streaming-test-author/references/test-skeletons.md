# Per-language streaming test skeletons

Go bufconn skeletons for the client-streaming and bidirectional categories.
The body of SKILL.md keeps the Python server-streaming and unary examples as the
representative inline set; these are the language variants. Harness selection is
in `grpc-mock`.

## Client-streaming (Go bufconn)

**Success:**

```go
func TestUpload_Success(t *testing.T) {
    fake := &fakeUploader{accept: 3}
    client := setupClient(t, fake)

    stream, err := client.Upload(context.Background())
    if err != nil { t.Fatal(err) }

    chunks := []*pb.Chunk{{Data: []byte("a")}, {Data: []byte("b")}, {Data: []byte("c")}}
    for _, c := range chunks {
        if err := stream.Send(c); err != nil { t.Fatal(err) }
    }
    result, err := stream.CloseAndRecv()
    if err != nil { t.Fatal(err) }
    if result.Bytes != 3 { t.Fatalf("got %d, want 3", result.Bytes) }
}
```

**Server completes before client finishes** - per gRPC docs the server response
may arrive "typically but not necessarily after it has received all the client's
messages"; further `Send` yields `io.EOF`:

```go
func TestUpload_ServerCompletesEarly(t *testing.T) {
    fake := &fakeUploader{completeAfter: 1}
    client := setupClient(t, fake)

    stream, _ := client.Upload(context.Background())
    stream.Send(&pb.Chunk{Data: []byte("a")})

    // Sending more after server completes should yield io.EOF
    err := stream.Send(&pb.Chunk{Data: []byte("b")})
    if err != io.EOF {
        t.Fatalf("got %v, want io.EOF", err)
    }
    result, _ := stream.CloseAndRecv()
    if result.Bytes != 1 { t.Fatalf("got %d, want 1", result.Bytes) }
}
```

**Empty stream:**

```go
func TestUpload_EmptyStream(t *testing.T) {
    client := setupClient(t, &fakeUploader{})
    stream, _ := client.Upload(context.Background())
    result, err := stream.CloseAndRecv()
    if err != nil { t.Fatal(err) }
    if result.Bytes != 0 { t.Fatalf("got %d, want 0", result.Bytes) }
}
```

## Bidirectional (Go)

**Ordering per direction:**

```go
func TestConversation_Ordering(t *testing.T) {
    fake := &fakeChatter{
        clientMsgs: []*pb.Message{},
        replies: []*pb.Reply{{Seq: 1}, {Seq: 2}, {Seq: 3}},
    }
    client := setupClient(t, fake)
    stream, _ := client.Conversation(context.Background())

    // Client sends 3 messages
    for i := 0; i < 3; i++ {
        stream.Send(&pb.Message{Seq: int32(i)})
    }
    stream.CloseSend()

    // Server sends back 3 replies in order
    var got []int32
    for {
        r, err := stream.Recv()
        if err == io.EOF { break }
        if err != nil { t.Fatal(err) }
        got = append(got, r.Seq)
    }
    want := []int32{1, 2, 3}
    if !reflect.DeepEqual(got, want) {
        t.Fatalf("got %v, want %v", got, want)
    }
}
```

**Client closes send while still receiving** (half-close):

```go
func TestConversation_ClientHalfClose(t *testing.T) {
    // Server keeps sending after client CloseSend()
    fake := &fakeChatter{repliesAfterCloseSend: []*pb.Reply{{Seq: 99}}}
    client := setupClient(t, fake)
    stream, _ := client.Conversation(context.Background())
    stream.Send(&pb.Message{Seq: 0})
    stream.CloseSend()  // half-close: no more sends, still receiving

    r, err := stream.Recv()
    if err != nil { t.Fatal(err) }
    if r.Seq != 99 { t.Fatalf("got %d, want 99", r.Seq) }
}
```

**Cancellation from either side:**

```go
func TestConversation_ServerSideCancel(t *testing.T) {
    fake := &fakeChatter{cancelAfterMsg: 1}
    client := setupClient(t, fake)
    stream, _ := client.Conversation(context.Background())
    stream.Send(&pb.Message{Seq: 0})

    _, err := stream.Recv()
    st, _ := status.FromError(err)
    if st.Code() != codes.Cancelled {
        t.Fatalf("got %v, want Cancelled", st.Code())
    }
}
```
