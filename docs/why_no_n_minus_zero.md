# What does n-0 mean?
"n-0" is part of a common nomenclature in the arcade scene referring to
freshness of data. "n-0" (n minus zero) is the current game release, like a
mathematical equation. "n-1" is the previous game release. Rarely you will see
"n+1" where the next, unreleased version of a game is leaked early.

A time can also be added to specify lengths instead of versions. For example,
"n-6 months" or "n-1 year".

# Why no n-0 in Bemanipatcher?

The original policy of this repo was to accept any patch set that looked sane
and had consistent style, to be a "global" repository for all games that had
been released. Sometimes some private release would have hex edits appear as a
PR, so I accepted them because I didn't want to get into the drama of "why does
he have data but I don't".

In mid 2021, some groups decided they'd start leaking the latest updates for
pretty much every game under the sun. In addition to being a hugely
irresponsible idea (Sega is especially litigious), this produced a lot of noise
in PRs from people hastily trying to port edits.

I have had several terrible PRs submitted that I have had to revert. These
include:
- Broken patches
- Misattributed sources
- Totally-fine patch sets where I immediately received a Discord DM saying "I
  didn't want that to be public, delete it please"
- PRs opened and closed almost immediately by someone reconsidering
- PRs opened, merged and then reverted by the original uploader

As such, this repo now has a new rule: No n-0, unless it is more than a year
old.

# When is n-0 OK? Why is day-old n-1 OK?
In addition to the obvious frustration I have with all these junk PRs, read on
for some moral soapboxing as to why you should reconsider public n-0.

**Remember: this is my own opinion.** I like to think it's a fairly common one. You are welcome to disagree with me, but it won't change the policy.

Why the year rule? When a new game comes out, why is the n-0 from yesterday
suddenly OK? There are two important aspects to my reasoning: Acting in good
faith, and preservation.

You have to remember that rhythm games are an extremely niche market when
compared to all other game formats. Arcade rhythm games are even more niche, and
critically, comprise a different payment model (credits vs gacha/one-time-buy).

Compared to huge MOBAs and FPS games where the majority just pays and plays the
game, the at-home-arcade community *is* big enough to cause financial problems
if they all stay at home, which is why we've seen COVID hit Sega hard enough to
start closing flagship arcades in Akihabara.

I have heard firsthand from arcade operators that as soon as home-data is
released that matches or exceeds the version in their arcade, attendance drops
sharply. After all, with no commute and no credits, playing at home on your ASC
is usually good enough.

So the first point, acting in good faith. By releasing old data, you minimise
depriving arcade operators of their income. Whether it's in Japan and the coins
go straight to Konami, or you're in Europe and they fund your local arcade's
next cab purchase, it's critical to actually financially support the games in
this niche.

Adding the 1 year specifier is for games like Jubeat and Reflecbeat - games that
have not seen a new release in years. I believe it's acting in good faith to
release year old data. If there's been literally no updates in a year... That's
on Konami for abandoning a property.

The second aspect is preservation. Except for buying an offline cab and hoping
it has the right version (good luck), there is simply no way to legitimately
play old releases of these games. This is why n-1 suddenly becomes "good" once
the next version of the game is released. So much digital history has been lost
due to bitrot and always-online games becoming unplayable. I like the idea of
being able to play every game in a series ever released.

# Why did you write all this?
A lot of people who share my opinion like to loudly flame newcomers thirsty for
the latest data, chastising them for not innately knowing the correct etiquette.
This is my attempt to explain where my opinions come from. If it's useful to
even 1 person, it's done its job.
