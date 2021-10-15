---
title: Writing a JSON serializaer using C++ Reflection
author: Roland Shum
tags: 
- C++
- GameEngine
- GameDev
date: 2021-10-34 01:01:01
---
# Background

<style>
.child{
    width:  60%;
}

@media screen and (max-width: 600px) {
  .child{
      width:  100%;
  }
}

.desktop-70-mobile-100{
    width:  70%;
}

@media screen and (max-width: 600px) {
  .desktop-70-mobile-100{
      width:  100%;
  }
}

.desktop-50-mobile-100{
    width:  50%;
}

@media screen and (max-width: 600px) {
  .desktop-50-mobile-100{
      width:  100%;
  }
}
</style>

<script>
$( document ).ready(function() {
  var cw = $('.child').width();
  $('.child').css({
      'height': cw + 'px'
  });
});
</script>

## About the Author

Roland Shum: Engine Developer

I am a Computer Science students at the DigiPen Institute of Technology, and have been working on game projects together for several years.

[Here](https://store.steampowered.com/search/?developer=Handshake%20Firm) are some games I have worked on and published:

![ArcApellago](/images/TerrainGeneration/ArcApellago.jpg)
![DeltaBlade2700](/images/TerrainGeneration/DeltaBlade2700.jpg)

## Introduction

Arc Apellago was a year-long game project that I worked together with several members of the team. Its an action platformer with a focus on dash-attack and jumping around to get to the end of the level. We developed a C++ custom engine from scatch, integrating our own libraries and then using that engine to develop the game.

Parts of the engine I worked on
- Integration of [Real Time Type Reflection (RTTR)](https://www.rttr.org/)
- **[JSON](https://github.com/nlohmann/json) serialization using RTTR**
- **ImGui Engine GUI generation using RTTR**
- Designing archetypes for entities

In addition, I worked on the game as well
- Visual Effects
- Post processing effects with GLSL shaders
- Player feedback

And things outside of the engine
- Configuring a student Azure VM to build our game on every push
  - CI / CD
- Configuring a student Amazon Web Service (AWS) VM to automatically sync the school's git repo to our internal private git server
- Tracked and scoped technical tasks as part of co-producer work and making sure everyone's workflow was smooth

Today I'll be talking about what I for integrating **JSON serialization** as well as **automatically generating [ImGui](https://github.com/ocornut/imgui) GUIS** for our datatypes. While I will be describing what I did, my sincere advice is to **not replicate what I did**. I made many mistakes designing/implementing this, and I hope that you can learn from my mistakes and avoid the pitfalls I had.

## What are you talking about?

So essentially what I did was

1) Integrate reflection library (RTTR)
2) Integrate JSON reading and writing data
3) **For serialization**
   1) Use reflection to generate the JSON object 
   2) Use JSON object and JSON library to write to file
4) For deserialization
   1) Read JSON from file to read JSON object
   2) Use JSON object to read achetypes
5) **Use reflection data to generate editor GUIs for modifying values at runtime**
   
I've bolded what I will be talking about

### What is reflection
Reflection is the ability to inspect, modify, and call methods at runtime.


![MyStruct](/images/Reflection-Serializer/CPPStruct.png)

Essentially, being able to retrieve all these data without knowing what the object is! You can even iterate through all properties and methods! Sounds crazy right?

### Why did you need reflection?
So my team and I were thinking about serialization, and we realized we did not have much experience with it. 

My goals for the serialization system
- Be able to serialize any type of object to json with a common interface
- Read archetypes from json files
- Programmers do not need to write serialization code
  - Fully abstracted and written for them, unless specified

In order to achieve the last goal, the only realistic way I could think of was to use a reflection system. I can iterate through an objects properties (picture above) and turn it into JSON something below.

```json
{
  "MyStruct" : {
	"name" : "Instance Name",
	"data" : 2,
	"bigNumber" : 2.0
  }
}
```


### What is this GUI thing you're talking about?
[ImGui](https://github.com/ocornut/imgui) is an immediate mode GUI. Its pretty much the best thing to have come to video game programming for devs, and our team used it to create our engine editor.

Check it out if you haven't seen it before! The video below displays what I did with ImGui and reflection.

<p align="center">
<video playsinline autoplay loop muted controls class="desktop-50-mobile-100">
  <source src="/images/Reflection-Serializer/imgui_demo.webm" type="video/webm">
  Your browser does not support the video tag.
</video>
</p>

Notice how you can keep opening up trees under the Behavior component and the relevant scripts will come up? And you can open up the scripts to modify values? If the 'value' is an instance of a class, you can open it up until you hit the base data types (int, float, string, etc).

