# BemaniPatcher
A tool to easily apply known hex edits to any binary, with examples for Bemani games.

Should work on most modern browsers.

Live version hosted [on my website](https://mon.im/bemanipatcher/).

## Asking about new patches
These days, I do not create the patches. Everything is community submitted.
If you would like new hex edits, make them yourself and make a pull request!

## Patch rules
- *New*: No n-0 newer than 1 year ago. [Why?](docs/why_no_n_minus_zero.md)
- Rhythm games only. Bombergirl is the one exception, it's Konami anyway.
- No autoplay patches
  - It is far too easy to accidentally get people banned from their networks
  - It's mainly used to upload autoplays to YouTube, which is not something I want to be involved with

## Submitting a new game
Here is your checklist:
- Add the new game html, it is easiest to copy an existing game and modify it.
  The html should be named `[game][release].html` except IIDX because they just
  happen to be `[release].html` only...
- Modify the `<title>` tag and the `<h1>` tag to the name of the new game.
- Modify the patcher for the new DLL names/patches.
- Keep consistent indentation for the new patches. I will have to fix your PR if
  it contains poor formatting, which will delay the merging process.
- Modify `index.html` to add the new game. Sorting: alphabetical by game series,
  then in release order per game.
- Add a game image. 128x128px PNG files, please. Any blank space should be
  either white or transparent.

If your pull request is a single commit, I will rebase and merge. If it is
multiple commits, I will squash and merge.

Please do not worry about submitting "bad" PRs. If there is something wrong, I
will tell you how to fix it or I will fix it myself before merging.
