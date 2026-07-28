# Same fixture across four languages, plus per-test reset

Generate a single user with name + email + a date of birth in
[1980, 2000]. The pattern is identical across libraries; only the API
style differs (method calls vs. `RuleFor` builders). The Python (Faker)
canonical version is inline in SKILL.md.

## Python (mimesis)

```python
from mimesis import Generic, Locale

g = Generic(Locale.EN, seed=42)

user = {
    "name":  g.person.full_name(),
    "email": g.person.email(),
    "dob":   g.datetime.date(start=1980, end=2000),
}
```

## JS / TS (faker-js)

```typescript
import { faker } from '@faker-js/faker';

faker.seed(42);

const user = {
  name:  faker.person.fullName(),
  email: faker.internet.email(),
  dob:   faker.date.birthdate({ min: 23, max: 43, mode: 'age' }),
};
```

## Ruby (FactoryBot + Faker)

```ruby
FactoryBot.define do
  factory :user do
    name  { Faker::Name.name }
    email { Faker::Internet.unique.email }
    dob   { Faker::Date.birthday(min_age: 23, max_age: 43) }
  end
end

# Use:
Faker::Config.random = Random.new(42)
user = FactoryBot.create(:user)
```

## .NET (Bogus)

```csharp
var faker = new Faker<User>("en")
    .UseSeed(42)
    .RuleFor(u => u.Name,  f => f.Name.FullName())
    .RuleFor(u => u.Email, f => f.Internet.Email())
    .RuleFor(u => u.Dob,   f => f.Date.Past(43));

var user = faker.Generate();
```

## Per-test resetting

Reset the seed in `beforeEach` (Vitest / Jest / pytest / RSpec) so each
test starts with the same baseline:

```javascript
import { faker } from '@faker-js/faker';

beforeEach(() => { faker.seed(42); });
```

```python
@pytest.fixture(autouse=True)
def reset_faker():
    Faker.seed(42)
```

```ruby
RSpec.configure do |c|
  c.before(:each) do
    Faker::Config.random = Random.new(42)
  end
end
```

```csharp
// xUnit fixture or per-test setup
[Fact]
public void Test()
{
    var faker = new Faker<User>().UseSeed(42)...;
}
```
