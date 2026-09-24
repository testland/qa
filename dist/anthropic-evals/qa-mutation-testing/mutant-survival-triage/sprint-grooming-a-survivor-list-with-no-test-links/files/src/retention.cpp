#include "retention.h"

#include "audit.h"
#include "store.h"

namespace acme {

const int RETENTION_DAYS = 90;

bool Retention::expired(int age_days) const {
  return age_days > RETENTION_DAYS;
}

int Retention::purge(Store& store, AuditLog& audit) const {
  int removed = 0;
  for (const Record& r : store.all()) {
    if (expired(r.age_days)) {
      store.erase(r.id);
      audit.record("purged", r.id);
      removed += 1;
    }
  }
  return removed;
}

}  // namespace acme
