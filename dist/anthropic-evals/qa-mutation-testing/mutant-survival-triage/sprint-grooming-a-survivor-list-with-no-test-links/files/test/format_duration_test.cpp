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
