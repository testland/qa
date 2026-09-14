# ci-shared-02 memory

Alert `runner-mem-high` has fired 23 times since 2026-08-02. It clears after a
reboot and comes back within a week or so. It has never fired on ci-shared-01,
which runs the API suite only.

Process listing taken 2026-09-08 at 04:17, about an hour after the nightly run
finished:

```
$ ps -eo pid,etimes,rss,comm --sort=-rss | head -20
    PID ETIMES   RSS COMMAND
  30412  61104 412996 chrome
  28877 152311 401220 chrome
  27140 238902 398764 chrome
  24903 325488 396112 chrome
  22661 411901 394008 chrome
  20330 498377 391556 chrome
  18096 584799 388904 chrome
  15854 671210 386332 chrome
  13611 757612 383780 chrome
  11388 844044 381104 chrome
   9145 930455 378552 chrome
   6902 1016866 375900 chrome
   4670 1103288 373348 chrome
```

```
$ pgrep -c chrome
47
```

Uptime on the box at the time of the listing was 14 days.
