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
