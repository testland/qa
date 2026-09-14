# What I see when I sit on the box

## The export test

A dialog appears on screen the moment the export menu item is clicked. It is not
one of ours - it is grey, it is centred on the display rather than on our window,
and it reads:

    "Ledgerwood.app" wants access to control "System Events.app". Allowing
    control will provide access to documents and data in "System Events.app",
    and to perform actions within that app.

    [ Don't Allow ]  [ OK ]

The test sits there until the 30-second wait gives up. If I click OK myself
before the wait expires, the export test passes and keeps passing until the box
is reimaged or the ci-runner account is reset, and then it comes back.

## The scroll measurement

0.252, 0.254, 0.256, 0.251, 0.254 across five runs on the mini. Tight. The mini
is an M2, bought in February. I do not know which machine recorded the baseline -
it predates me and it has been in the repo since 2024.

## The rack job

Nothing in the err log. Nothing in the result bundle either - the bundle is never
written, the directory is empty when I go looking in the morning.
