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
