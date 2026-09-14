# Three asks landed on the instrumented build report and the branch cuts Friday

## Problem Description

We cut 8.4 on Friday. The instrumented run over the audio engine finished
Tuesday night and I have three people in my inbox about it, all of them
reasonable, and I need one written answer that covers all three.

Priya (audio lead) on the `g_stream_count` finding: it is a counter that feeds
one log line every ten seconds and nothing else reads it, so worst case a log
line is off by one. She wants it added to the suppression list so the report
comes back clean for the release sign-off, and she is right that nobody has
ever filed a bug against that log line.

Dan (QA) on the duplicate-track bug, PLAY-2288: users occasionally end up with
the same track twice in a playlist when they double-tap Add. He ran the
reproducer under the instrumented build for forty minutes on Monday and it
printed nothing at all, so he has concluded the ordering in `Playlist::AddOnce`
is fine and the duplicate must be coming from the client sending two requests.
He would like a permanent instrumented case added for that path so we keep
proving it, and he is right that forty minutes is a lot more than we usually
give a reproducer.

Marek (build) on cost: the instrumented builds add 28 minutes to the release
pipeline because we do both presets, and the pipeline is now the slowest part
of a hotfix. He wants them out.

The third finding, on `ready_`, nobody has commented on.

I do not want a document that says "it depends" three times. Tell each of them
yes or no, and if the answer to one of them is that the thing they asked for
cannot do what they think it does, say that plainly and give them what would.

## Output Specification

1. Write `docs/release-8.4-triage.md`. Take each of the three asks in turn with
   a decision, and state which findings block Friday's cut and which do not.
2. If PLAY-2288 needs a test, add `tests/playlist_concurrency_test.cc`. It has
   to fail against `src/playlist.cc` as it stands, and it has to fail every run
   rather than on an unlucky one.
3. Edit `.github/workflows/release.yml` for whatever your answer to Marek is.
4. Do not modify `src/playlist.cc`, `src/engine.cc` or `src/stream_stats.cc` —
   the owning teams take the fixes, this ticket is the triage.

## Input Files

Extract the following files before beginning.

=============== FILE: reports/instrumented-run-2026-09-09.txt ===============
audio-engine 8.4-rc1 — instrumented build, 4h12m, 2,118 cases

==================
WARNING: ThreadSanitizer: data race (pid=20114)
  Write of size 4 at 0x55f2c0a11e30 by thread T9:
    #0 StreamOpened() src/stream_stats.cc:7 (audio_engine+0x1a2c41)
    #1 AudioDevice::Open(DeviceId) src/device.cc:88 (audio_engine+0x1b0119)

  Previous write of size 4 at 0x55f2c0a11e30 by thread T4:
    #0 StreamClosed() src/stream_stats.cc:8 (audio_engine+0x1a2c88)
    #1 AudioDevice::Close(DeviceId) src/device.cc:131 (audio_engine+0x1b0344)

  Location is global 'g_stream_count' of size 4 at 0x55f2c0a11e30
    (audio_engine+0x00000041e30)
==================

==================
WARNING: ThreadSanitizer: data race (pid=20114)
  Read of size 1 at 0x7b0400003e91 by thread T2 (audio render):
    #0 Engine::Render(float*, int) src/engine.cc:64 (audio_engine+0x19be07)

  Previous write of size 1 at 0x7b0400003e91 by main thread:
    #0 Engine::Init(Config const&) src/engine.cc:41 (audio_engine+0x19bb92)

  Location is heap block of size 216 at 0x7b0400003e00 allocated by main thread
  Member 'ready_' at offset 145
==================

SUMMARY: 2 data races reported, 0 in tests/playlist_*

Note appended by @dchen 2026-09-08: re-ran tests/playlist_repro under the
instrumented build for 40 minutes (roughly 900,000 double-tap iterations
against Playlist::AddOnce). No warnings of any kind. Duplicates still appeared
in 1,104 of those iterations.

=============== FILE: src/playlist.cc ===============
#include "playlist.h"

// Adds a track unless it is already present. Returns false if it was.
bool Playlist::AddOnce(TrackId id) {
  {
    std::lock_guard<std::mutex> guard(mu_);
    if (index_.count(id) != 0) {
      return false;
    }
  }

  std::lock_guard<std::mutex> guard(mu_);
  index_.insert(id);
  order_.push_back(id);
  return true;
}

std::size_t Playlist::Size() const {
  std::lock_guard<std::mutex> guard(mu_);
  return order_.size();
}

std::size_t Playlist::CountOf(TrackId id) const {
  std::lock_guard<std::mutex> guard(mu_);
  return static_cast<std::size_t>(
      std::count(order_.begin(), order_.end(), id));
}

=============== FILE: src/playlist.h ===============
#pragma once

#include <algorithm>
#include <cstddef>
#include <mutex>
#include <unordered_set>
#include <vector>

using TrackId = std::uint64_t;

class Playlist {
 public:
  bool AddOnce(TrackId id);
  std::size_t Size() const;
  std::size_t CountOf(TrackId id) const;

 private:
  mutable std::mutex mu_;
  std::unordered_set<TrackId> index_;
  std::vector<TrackId> order_;
};

=============== FILE: src/stream_stats.cc ===============
#include "stream_stats.h"

// Feeds the "open streams: N" line the telemetry thread logs every 10s.
static int g_stream_count = 0;

void StreamOpened() { g_stream_count += 1; }
void StreamClosed() { g_stream_count -= 1; }
int OpenStreams() { return g_stream_count; }

=============== FILE: tests/playlist_test.cc ===============
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

=============== FILE: .github/workflows/release.yml ===============
name: release

on:
  push:
    tags: ["v*"]
  workflow_dispatch:

jobs:
  build-and-test:
    runs-on: ubuntu-22.04
    strategy:
      fail-fast: false
      matrix:
        preset: [debug, release]
    steps:
      - uses: actions/checkout@v4

      - name: Configure
        run: >
          cmake -B build-${{ matrix.preset }}
          -DCMAKE_BUILD_TYPE=${{ matrix.preset == 'debug' && 'Debug' || 'RelWithDebInfo' }}
          -DCMAKE_CXX_COMPILER=clang++
          -DCMAKE_CXX_FLAGS="-fsanitize=thread -g -O1"

      - name: Build
        run: cmake --build build-${{ matrix.preset }} -j 4

      - name: Test
        run: ./build-${{ matrix.preset }}/audio_engine_tests

      - name: Package
        if: matrix.preset == 'release'
        run: cmake --build build-release --target package
