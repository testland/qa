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
