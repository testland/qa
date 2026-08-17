# Running the integration tests locally

Start Docker Desktop, then:

```bash
./mvnw verify -Dit.test=SearchIndexIT
```

The search engine takes about 40 seconds to come up. To avoid paying that on
every run, add this to your `~/.bashrc` (or `~/.zshrc`) so every shell has it:

```bash
export TESTCONTAINERS_REUSE_ENABLE=true
```

Then restart your terminal. If a run behaves strangely, remove the container by
hand with `docker rm -f` and try again.
