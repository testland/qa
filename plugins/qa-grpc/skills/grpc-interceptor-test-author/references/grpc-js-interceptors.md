# grpc-js client interceptor tests

`@grpc/grpc-js` exposes client interceptors as a channel option. The
package README confirms "Client Interceptors" as a supported feature at
[github.com/grpc/grpc-node/tree/master/packages/grpc-js](https://github.com/grpc/grpc-node/tree/master/packages/grpc-js).
An interceptor is a function `(options, nextCall) => InterceptingCall`.

## Client interceptor - auth-header injection

Test an auth-header injector by building an `InterceptingCall` with a
`RequesterBuilder` that captures the outbound metadata:

```typescript
import * as grpc from "@grpc/grpc-js";
import { InterceptingCall, InterceptorOptions, NextCall } from "@grpc/grpc-js";

function authInterceptor(token: string) {
    return (options: InterceptorOptions, nextCall: NextCall): InterceptingCall => {
        return new InterceptingCall(nextCall(options), {
            start(metadata, listener, next) {
                metadata.add("authorization", `Bearer ${token}`);
                next(metadata, listener);
            },
        });
    };
}

// Test using a spy on the nextCall layer
test("authInterceptor injects Authorization header", () => {
    let capturedMetadata: grpc.Metadata | undefined;

    const fakeNext: NextCall = (_options) =>
        new InterceptingCall(null as any, {
            start(metadata, _listener, _next) {
                capturedMetadata = metadata;
            },
        });

    const interceptorFn = authInterceptor("my-token");
    const call = interceptorFn({} as InterceptorOptions, fakeNext);
    call.start(new grpc.Metadata(), {} as grpc.Listener);

    expect(capturedMetadata?.get("authorization")).toEqual(["Bearer my-token"]);
});
```

Register on a channel:

```typescript
const client = new UserServiceClient(address, credentials, {
    interceptors: [authInterceptor("my-token")],
});
```
