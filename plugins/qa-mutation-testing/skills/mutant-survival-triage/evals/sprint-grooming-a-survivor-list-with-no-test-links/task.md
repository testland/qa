# Turning last night's Mull output into cards for Thursday grooming

## Problem Description

`vault` is one of our C++ services. We finally got Mull running against it in CI
and last night's run left five mutants alive out of 38.

Grooming is Thursday at 10:00 and I have to arrive with a column of cards. Our
board house rules are attached - @em wrote them after the Q2 board turned into
four hundred one-line rows that nobody could find anything in, and Priya bounces
anything at grooming that does not follow them.

Attached: the Mull console output, the `mull.yml` the run used, both source
files, both test files, the fakes header the tests build on, and the CMake file.
The compliance submodule is not checked out on my machine, so
`compliance/e2e_main.cpp` is not in the bundle.

Give me the column I should put up on Thursday, in the order I should put it up
in. For each card I need what changes and what good looks like, concrete enough
that whoever takes it does not come back to me for the detail on the day.

## Output Specification

1. Write `docs/grooming-2026-09-13.md`.
2. List the cards you would put up, in the order you would put them up in, with
   the reason for that order stated once.
3. Every card carries an owner and a one-line statement of what good looks like,
   per the house rules.
4. Do not modify anything under `src/` or `test/`.

## Input Files

Extract the following files before beginning.

=============== FILE: src/retention.cpp ===============
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

=============== FILE: src/format_duration.cpp ===============
#include "format_duration.h"

#include <cstdio>

#include "metrics.h"

namespace acme {

std::string format_duration(int seconds, Logger& log) {
  log.debug("format_duration");
  char buf[32];
  std::snprintf(buf, sizeof(buf), "%dm %02ds", seconds / 60, seconds % 60);
  return std::string(buf);
}

std::string truncate(const std::string& s, size_t max_len, Logger& log) {
  log.debug("truncate");
  metrics::count("truncate.calls");
  if (s.size() <= max_len) {
    return s;
  }
  return s.substr(0, max_len) + "...";
}

}  // namespace acme

=============== FILE: test/fakes.h ===============
#pragma once

#include <string>
#include <vector>

#include "audit.h"
#include "logger.h"
#include "store.h"

struct FakeStore : acme::Store {
  explicit FakeStore(std::vector<acme::Record> records) : records_(records) {}
  const std::vector<acme::Record>& all() const override { return records_; }
  void erase(int id) override;
  size_t size() const { return records_.size(); }

 private:
  std::vector<acme::Record> records_;
};

struct FakeAudit : acme::AuditLog {
  void record(const std::string& action, int id) override {
    entries.push_back({action, id});
  }
  struct Entry {
    std::string action;
    int id;
  };
  std::vector<Entry> entries;
};

struct FakeLogger : acme::Logger {
  void debug(const std::string& message) override { messages.push_back(message); }
  std::vector<std::string> messages;
};

=============== FILE: test/retention_test.cpp ===============
#include "retention.h"

#include <gtest/gtest.h>

#include "fakes.h"

namespace {

// keep in sync with retention.cpp
constexpr int kRetentionDays = 90;

TEST(RetentionTest, ExpiresRecordsPastTheWindow) {
  acme::Retention r;
  EXPECT_TRUE(r.expired(kRetentionDays + 30));
  EXPECT_TRUE(r.expired(kRetentionDays * 2));
}

TEST(RetentionTest, PurgeRemovesExpiredRecords) {
  FakeStore store({{1, 200}, {2, 120}});
  FakeAudit audit;
  acme::Retention r;
  EXPECT_EQ(r.purge(store, audit), 2);
  EXPECT_EQ(store.size(), 0u);
}

}  // namespace

=============== FILE: test/format_duration_test.cpp ===============
#include "format_duration.h"

#include <gtest/gtest.h>

#include "fakes.h"

namespace {

TEST(FormatDurationTest, FormatsMinutesAndSeconds) {
  FakeLogger log;
  EXPECT_EQ(acme::format_duration(125, log), "2m 05s");
}

TEST(TruncateTest, LeavesShortStringsAlone) {
  FakeLogger log;
  EXPECT_EQ(acme::truncate("abc", 10, log), "abc");
}

TEST(TruncateTest, AppendsEllipsisWhenTooLong) {
  FakeLogger log;
  EXPECT_EQ(acme::truncate("abcdefghij", 4, log), "abcd...");
}

}  // namespace

=============== FILE: mull.yml ===============
mutators:
  - cxx_calls
  - cxx_init_const
  - cxx_assign_const

timeout: 5000
includePaths:
  - /builds/vault/src

=============== FILE: reports/mull-nightly.txt ===============
$ mull-runner-17 ./build/vault_tests --report-name nightly

[info] Using config file /builds/vault/mull.yml
[info] Warm up run (threads: 1)
       [################################] 38/38. Finished in 412ms
[info] Filter mutants (threads: 8)
       [################################] 38/38. Finished in 9ms
[info] Baseline run (threads: 1)
       [################################] 1/1. Finished in 402ms
[info] Running mutants (threads: 8)
       [################################] 38/38. Finished in 3s

[info] Survived mutants (5/38):

/builds/vault/src/retention.cpp:8:24: warning: Survived: Replaced 90 with 0 [cxx_init_const]
const int RETENTION_DAYS = 90;
                           ^
/builds/vault/src/retention.cpp:19:7: warning: Survived: Removed the call to audit.record [cxx_remove_void_call]
      audit.record("purged", r.id);
      ^
/builds/vault/src/format_duration.cpp:10:3: warning: Survived: Removed the call to log.debug [cxx_remove_void_call]
  log.debug("format_duration");
  ^
/builds/vault/src/format_duration.cpp:17:3: warning: Survived: Removed the call to log.debug [cxx_remove_void_call]
  log.debug("truncate");
  ^
/builds/vault/src/format_duration.cpp:18:3: warning: Survived: Removed the call to metrics::count [cxx_remove_void_call]
  metrics::count("truncate.calls");
  ^

[info] Mutation score: 86%

=============== FILE: CMakeLists.txt ===============
cmake_minimum_required(VERSION 3.22)
project(vault CXX)

add_library(vault_core src/retention.cpp src/format_duration.cpp)

add_executable(vault_tests test/retention_test.cpp test/format_duration_test.cpp)
target_link_libraries(vault_tests PRIVATE vault_core GTest::gtest_main)

# nightly compliance job only; sources live in the compliance/ submodule, which
# is not checked out in a normal developer clone
add_executable(compliance_e2e compliance/e2e_main.cpp)
target_link_libraries(compliance_e2e PRIVATE vault_core)

=============== FILE: docs/board-house-rules.md ===============
# Board house rules - @em, since Q2

- **One card per file.** We stopped doing per-line cards in Q2. The board turned
  into four hundred rows that all said roughly the same thing and nobody could
  find anything. One card, one file, one owner.
- **Order the column by how many findings the file has.** Biggest number at the
  top. That is how we decide what gets picked up first, and it keeps the
  argument out of grooming.
- Every card needs an owner and a one-line "what good looks like".
- Cards without a concrete acceptance line get bounced at grooming. Ask Priya,
  she bounces them.
