# THINGS: three-minute pitch with demo narration

Prepared 15 November 2026. English spoken script. Total target: three minutes, including a 60-second demo. No team introduction. Time markers are rehearsal guides, not a measured recording. Lower the demo audio while delivering the commentary if necessary.

## 0:00–0:25: Problem (slides 1–3)

Imagine you’re halfway through a report, and you remember you still need to find a few research papers, check flights for next week and sort out lunch.

None of those jobs sounds difficult, but you end up moving between websites, filling in forms and comparing options. By the time you return to your report, you’ve lost your train of thought.

That’s where THINGS comes in.

## 0:25–0:50: Solution (slides 4–6)

THINGS is a Windows desktop assistant inspired by the helping hand in Wednesday.

You speak to it the way you’d ask someone for help. For example, “Find me some papers about retrieval-augmented generation.”

It shows what it heard, then uses its own hand cursor to work inside a task browser. Your Windows mouse stays free, so you can keep working while you follow its progress.

## 0:50–1:50: Narration over the 60-second demo (slide 7)

[Flights appear]

Here, we’re asking THINGS to compare flights. You can see the hand entering the route, choosing the dates and opening the results. The hand follows the actual action targets, so you can tell what it’s doing.

[Lunch appears]

Next, we ask it to find lunch within a budget. It fills in the location and narrows down the options.

[Updates appear]

We can also ask it to collect useful travel updates, rather than going through the whole feed ourselves.

[Research appears]

For a research task, it searches the topic, opens the papers and collects the links into a reading list.

[Trip plan appears]

Finally, it brings the selected information into a trip plan. This recording uses scripted tasks and sample data to show the interaction clearly.

## 1:50–2:40: Pipeline and architecture (slides 9–10)

So, how does the actual AI version work?

First, faster-whisper turns your speech into text locally on your computer. THINGS then sends your request and a screenshot of the task window to a vision-capable model.

The model looks at that screen and proposes the next action. Our controller checks the target and any approval requirements before clicking, typing or scrolling. It then takes another screenshot, so the model can see whether the action worked.

We built the desktop app with Electron, React and TypeScript, with Python handling speech recognition. Users enter their own API key and choose a compatible model when they first open the app.

## 2:40–3:00: Closing (slide 11)

We’ve connected real speech recognition, AI requests and computer input, although longer tasks can still need retries or help.

Our next step is to improve how THINGS recovers when something goes wrong. The goal is for you to explain the task once, follow what’s happening and spend less time managing every click.
