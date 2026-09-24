#include "playlist.h"

std::size_t Playlist::CountOf(TrackId id) const {
  std::shared_lock<std::shared_mutex> guard(mu_);
  return static_cast<std::size_t>(
      std::count(order_.begin(), order_.end(), id));
}

bool Playlist::Contains(TrackId id) const {
  std::shared_lock<std::shared_mutex> guard(mu_);
  return index_.count(id) != 0;
}

void Playlist::Append(TrackId id) {
  std::unique_lock<std::shared_mutex> guard(mu_);
  index_.insert(id);
  order_.push_back(id);
}

// Adds a track unless it is already present. Returns false if it was.
bool Playlist::AddOnce(TrackId id) {
  if (Contains(id)) {
    return false;
  }
  Append(id);
  return true;
}

std::size_t Playlist::Size() const {
  std::shared_lock<std::shared_mutex> guard(mu_);
  return order_.size();
}
