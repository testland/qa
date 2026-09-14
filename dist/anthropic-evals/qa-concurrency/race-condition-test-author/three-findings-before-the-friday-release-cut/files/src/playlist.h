#pragma once

#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <shared_mutex>
#include <unordered_set>
#include <vector>

using TrackId = std::uint64_t;

class Playlist {
 public:
  bool AddOnce(TrackId id);
  bool Contains(TrackId id) const;
  void Append(TrackId id);
  std::size_t Size() const;
  std::size_t CountOf(TrackId id) const;

 private:
  mutable std::shared_mutex mu_;
  std::unordered_set<TrackId> index_;
  std::vector<TrackId> order_;
};
