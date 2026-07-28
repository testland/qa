# UTF attribute cheatsheet - reference

Attributes for unity-test-framework, per the
[v1.4 manual index](https://docs.unity3d.com/Packages/com.unity.test-framework@1.4/manual/index.html)
and the NUnit 3.5 docs the framework wraps.

| Attribute | Purpose | Source |
|---|---|---|
| `[Test]` | Plain NUnit test - synchronous | NUnit; recommended default per edit-mode-vs-play-mode docs |
| `[UnityTest]` | Coroutine-style test that can yield frames / seconds in PlayMode or skip frames in EditMode | UTF-specific |
| `[SetUp]` / `[TearDown]` | Per-test fixture setup / cleanup | NUnit |
| `[OneTimeSetUp]` / `[OneTimeTearDown]` | Once-per-fixture setup / cleanup | NUnit |
| `[TestFixture]` | Marks a class as containing tests (optional in NUnit 3) | NUnit |
| `[Category("Smoke")]` | Tag a test for filtering | NUnit; selectable via CLI `-testCategory` |
| `[UnityPlatform(RuntimePlatform.WindowsPlayer)]` | Restrict test to specific runtime platforms | UTF-specific |
| `[ValueSource(nameof(MyCases))]` | Parameterised inputs | NUnit; `ValueSource` is supported per the v1.4 manual (other parameterised attributes have known limitations - see the skill's Limitations section) |
