#include "stream_stats.h"

// Feeds the "open streams: N" line the telemetry thread logs every 10s.
static int g_stream_count = 0;

void StreamOpened() { g_stream_count += 1; }
void StreamClosed() { g_stream_count -= 1; }
int OpenStreams() { return g_stream_count; }
