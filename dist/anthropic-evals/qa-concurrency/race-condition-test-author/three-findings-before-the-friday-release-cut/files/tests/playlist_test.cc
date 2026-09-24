#include "../src/playlist.h"

#include <gtest/gtest.h>

TEST(Playlist, AddsATrack) {
  Playlist p;
  EXPECT_TRUE(p.AddOnce(7));
  EXPECT_EQ(p.Size(), 1u);
}

TEST(Playlist, RejectsADuplicateOnOneThread) {
  Playlist p;
  EXPECT_TRUE(p.AddOnce(7));
  EXPECT_FALSE(p.AddOnce(7));
  EXPECT_EQ(p.Size(), 1u);
  EXPECT_EQ(p.CountOf(7), 1u);
}

TEST(Playlist, KeepsInsertionOrder) {
  Playlist p;
  p.AddOnce(3);
  p.AddOnce(1);
  p.AddOnce(2);
  EXPECT_EQ(p.Size(), 3u);
}
