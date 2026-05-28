---
source_type: youtube-video
title: "Rule of Five #programming #cpp #advice"
channel: "FunnanSoftware"
url: "https://www.youtube.com/watch?v=vWqgRQOZa5M"
video_id: vWqgRQOZa5M
date: 2026-05-28
transcript_language: en
---

# Rule of Five #programming #cpp #advice

Source: FunnanSoftware | [Watch on YouTube](https://www.youtube.com/watch?v=vWqgRQOZa5M) | Transcribed: 2026-05-28

## Transcript

**[0:00]**
 So, this is something a junior developer does not do. I will say that. A junior developer does not know the rule of five. When I'm interviewing and they don't know the rule of five, that's okay. Like I said, a lot of people don't know it. But, I like to walk them through it and be like, "Hey, what's the purpose of a destructor in a class?" A destructor in a class is to manage memory. It's to free your memory. Therefore, the rule of five says, "If you are writing a destructor, then you acknowledge you are managing memory. And if you are managing memory, then it's on you to determine what moving that memory and copying that memory looks like. If you define any one of these five functions, you are stating that you are owning the resource and you are in charge of making sure it gets released. Destructor, copy constructor, move constructor, move assignment, and copy assignment. If you define any one of those, you need to define all five."
