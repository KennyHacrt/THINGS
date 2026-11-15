# THINGS pitch archive

Saved on 16 November 2026 from the “Create THINGS cursor demo” chat. Start here when preparing another pitch. This folder contains original THINGS pitch material; the separate “Get YouTube video transcript” chat handles the Hands reference transcript. This archive adds files only under docs/pitch-archive, without changing application code or the repository home page.

## Ready to reuse

- [Three-minute spoken pitch, including demo commentary](pitch-3min-with-demo.md)
- [Security and privacy Q&A](security-privacy-qa.md)
- [60-second demo video](media/THINGS-rule-based-pitch-60s.mp4)
- [Download the demo video](https://raw.githubusercontent.com/KennyHacrt/THINGS/main/docs/pitch-archive/media/THINGS-rule-based-pitch-60s.mp4)
- [Canva PNG bundle and editable PowerPoint](media/THINGS-Canva-slides.zip)
- [Individual slide images and PPTX](slides/)
- [Slide overview](slides/preview.jpg)
- [THINGS cover image](media/THINGS-cover.png)
- [Links and recording disclosures](links.md)
- [SHA-256 inventory](manifest.json)

## Fast reuse

1. Download the slide ZIP, unzip it and upload the numbered PNGs to a 16:9 Canva presentation. You can instead import THINGS-pitch.pptx to edit text and diagrams.
2. Place the MP4 over the poster on slide 07. Its frame is x=384, y=340, width=1152, height=648 on a 1920×1080 canvas.
3. Rehearse the three-minute script. It includes narration during the one-minute clip. Skip the team page for the three-minute pitch.
4. For an actual live AI demonstration, follow the main repository setup instructions and enter your own compatible API key/model. The prerecorded clip makes no paid calls.

## Recording and product status

The latest one-minute recording is a rule-based walkthrough on controlled local sample pages. It contains real Chromium clicks, typing and scrolling, with prerecorded English speech and 47 logged input actions. It does not show live AI decisions, simultaneous agents, completed bookings, purchases or publications. The video is edited and is not a speed benchmark.

The separate app prototype includes local speech recognition, real AI requests and browser/Windows input adapters. One computer task runs at a time, with follow-ups queued. Reliability, limitations and privacy details are in ../VALIDATION.md and the main README. Do not reuse the teammate draft’s unsupported 14–40× speed or 150× cost claims.

## Rebuild sources

sources/rule-demo contains the controlled demo pages, fixed-action recorder, voice scripts, edit script and action/timing records. sources/slide-builder contains the presentation source and portrait crops. The builders retain original workspace/runtime paths and are an archive, not a one-command portable build; update paths and install the required dependencies before rebuilding. No credentials or browser profiles are included.

The final source app is preserved in the main repository and the Windows portable application is in GitHub Releases. Temporary caches, installed dependencies, raw recording experiments and obsolete desktop captures are deliberately excluded. This is a backup of final reusable deliverables, not every scratch file from the chat.
