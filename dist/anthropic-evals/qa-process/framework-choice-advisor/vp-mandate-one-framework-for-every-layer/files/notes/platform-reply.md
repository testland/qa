# Re: one runner - platform (S. Iyer) - 2026-09-10

I do not think Ola's runner can be the answer, because it is JavaScript and
TypeScript only and the partner portal team writes Python. Asking five
integrations engineers to learn a second language to keep eleven specs alive is
how those specs stop being maintained the first week somebody is on call.

The only thing I know of that takes TypeScript and Python over one protocol is
WebDriver, and we already run a Selenium Grid for the partner portal - four
nodes, idle most of the day. Put all three suites on the Grid and the language
problem disappears, we stop paying for Cloud seats, and nobody relearns
anything. It is the boring answer and it is the only one that fits everybody.

I have not costed it. I am one of the two people who would have to run it.
