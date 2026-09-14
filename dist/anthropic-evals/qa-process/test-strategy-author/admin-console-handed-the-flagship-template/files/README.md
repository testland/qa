# refund-console

Internal support tooling. Node service, server-rendered pages, one datastore.

    npm test    # node --test

CI runs the same command on every push. There is one job. There is no
performance job, no accessibility job, no container scanning, and no contract
testing - the payment provider is a third party and we consume its REST API
directly.
