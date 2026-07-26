# Java interceptor tests

Java interceptors are objects; call `interceptCall` directly with stubbed
`ServerCall` / `Channel` collaborators (Mockito) and assert on captured
`Status` and `Metadata`.

## ServerInterceptor - auth rejection

`ServerInterceptor.interceptCall` signature per
[grpc-java javadoc](https://grpc.github.io/grpc-java/javadoc/io/grpc/ServerInterceptor.html):

```java
<ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
    ServerCall<ReqT, RespT> call,
    Metadata headers,
    ServerCallHandler<ReqT, RespT> next)
```

Test with a `ServerCall` stub that captures the `close()` call:

```java
import io.grpc.*;
import org.junit.Test;
import static org.junit.Assert.*;
import static org.mockito.Mockito.*;

public class AuthInterceptorTest {

    private final ServerInterceptor interceptor = new AuthInterceptor();

    @SuppressWarnings("unchecked")
    @Test
    public void missingAuthHeader_closesWithUnauthenticated() {
        ServerCall<Object, Object> call = mock(ServerCall.class);
        Metadata headers = new Metadata(); // no authorization key
        ServerCallHandler<Object, Object> next = mock(ServerCallHandler.class);

        interceptor.interceptCall(call, headers, next);

        verify(call).close(
            argThat(s -> s.getCode() == Status.Code.UNAUTHENTICATED),
            any(Metadata.class));
        verifyNoInteractions(next);
    }
}
```

Registration per
[grpc-java javadoc ServerInterceptors.intercept](https://grpc.github.io/grpc-java/javadoc/io/grpc/ServerInterceptors.html)
- note `intercept()` applies interceptors in reverse order (last
interceptor's `interceptCall` fires first); use `interceptForward()`
to preserve declaration order:

```java
// Last-listed interceptor fires first:
ServerServiceDefinition def =
    ServerInterceptors.intercept(serviceImpl, authInterceptor, loggingInterceptor);

// First-listed interceptor fires first:
ServerServiceDefinition def =
    ServerInterceptors.interceptForward(serviceImpl, authInterceptor, loggingInterceptor);
```

## ClientInterceptor - outbound token injection

`ClientInterceptor.interceptCall` signature per
[grpc-java javadoc](https://grpc.github.io/grpc-java/javadoc/io/grpc/ClientInterceptor.html):

```java
<ReqT, RespT> ClientCall<ReqT, RespT> interceptCall(
    MethodDescriptor<ReqT, RespT> method,
    CallOptions callOptions,
    Channel next)
```

Test that the interceptor attaches the `authorization` key to outbound
headers by capturing `Metadata` passed to `ClientCall.start()`:

```java
@Test
public void tokenInjector_attachesAuthorizationHeader() {
    ClientInterceptor interceptor = new TokenInjectorInterceptor("Bearer tok");
    Channel channel = mock(Channel.class);
    ClientCall<Object, Object> innerCall = mock(ClientCall.class);
    when(channel.newCall(any(), any())).thenReturn(innerCall);

    ClientCall<Object, Object> call =
        interceptor.interceptCall(methodDescriptor(), CallOptions.DEFAULT, channel);

    Metadata headers = new Metadata();
    call.start(mock(ClientCall.Listener.class), headers);

    String auth = headers.get(Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER));
    assertEquals("Bearer tok", auth);
}
```
