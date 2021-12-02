---
title: Alloy Entity Component System - Retrospective
author: Calin Gavriliuc
tags:
- ECS
- GameDev
date: 2021-11-15 01:01:01
---

## Introduction
### DeltaBlade 2700
![DeltaBlade 2700](/images/TerrainGeneration/DeltaBlade2700.jpg)

Internally called _Project SwitchBlade_, this project is a remake of the original DeltaBlade 2700 with Nintendo Switch support - hence the name ''SwitchBlade". This project was taken on by team Handshake Firm while full-time college students. This team consists of ten programmers, myself included, and a sound designer.

The original game can be found here: \
[DeltaBlade 2700](https://store.steampowered.com/app/1143450/DeltaBlade_2700/)

### Entity Component System
An Entity Component System (ECS) is a programming paradigm often used in games for separating, often duplicate, logic.

While they come in many flavors, there are three main ideas to an ECS paradigm:
- **Entity**: The parent or owner of a group of components. An Entity can be as simple as an ID, or as complex as a game object.
- **Component**: An attribute an entity can have. Can range from plain-old-data (POD) to complex behavior.
- **System**: A method of updating components, often called component systems for specificity.

These three things give ECS its name.

For example, applying these concepts:
- **Want**: A box in a game that is rendered and can collide.
- **Entity**: A box.
- **Components**: A Transform, Render, Collider, and Physics.
- **Systems**: One system for each component that updates that component each time step.

Generally, an ECS will provide the following functionality:
- Ability to create/destroy an entity
- Ability to add/remove/modify components to/from/on an entity
- Ability to update components

This concept is not new, and most popular game engines will use ECS in some form.

My implementation has been named **Alloy**. This library will generally be referred to as _Alloy_ from this point on.

## Goals & Restrictions
### Goals
Alloy's goals, in order:
1) **Cross-Platform Support**: Must support Windows, Nintendo Switch's Horizon OS, Linux, Mac OS X, and more for development and release requirements.
1) **Update Loop Performance**: The majority of the time will be spent updating components, so this should be optimized for.
1) **Usability & Documentation**: If nobody can / knows how to use Alloy, it might as well not exist.
1) **Utilities & Tools & Features**: Quality of life additions and work improves usability, reduces mistakes, and assists with debugging.

### Restrictions
As professor Dimitri Volper would say: "There is no free lunch."

Essentially, "one-size-fits-all" does not exist. You must give something up to gain something.

The following was chosen to be sacrificed:
- **No component references**: Due to backend performance reasons.
- **A lack of extensive tools and utilities**: Due to not using a public library and a lack of development time/needs.
- **Secondary performance**: Most of the library, Alloy, is blazing fast, but only at the expense of some features.
- **Debugging**: While partly available, complexity often balloons when performance improves.

## Development Process
### Research
Starting, I began with exploring other ECS libraries, most notably [Unity DOTS](https://unity.com/dots) and [EnTT](https://github.com/skypjack/entt). The former is an implementation I had experience working with, which the later was one my teammates had used before.

I also did much research on articles and blog posts about ECs, such as all thirteen parts of [ECS Back and Forth](https://skypjack.github.io/2019-02-14-ecs-baf-part-1/) and both [How to make a simple entity-component-system in C++](https://www.david-colson.com/2020/02/09/making-a-simple-ecs.html) and the [Building an ECS](https://ajmmertens.medium.com/building-an-ecs-2-archetypes-and-vectorization-fe21690805f9) series.

### Designing and Developing
Ultimately, I went with the design that was most in line with my goals. I designed Alloy to be a Struct of Arrays (SoA), as opposed to an Array of Structs (AoS), implementation Archetype-based ECS after testing other possible implementations.

During the development process, I used Clang Tidy, Clang's address sanitization, [Valgrind](https://valgrind.org/), and compiled with the LLVM Clang, GCC, and MSVC compilers, with warnings, to ensure a high-quality codebase.

### Testing and Debugging
To ensure the quality of the library, a plethora of test cases and benchmarks were written. For validity, [Google Test](https://github.com/google/googletest) was used and, for consistency, [Google Benchmark](https://github.com/google/benchmark) was used.

The use of tests, paired with the use of this library in a game, allowed for me to solve many bugs and for Alloy to become stable. This also allowed me to further performance profile the library within real applications.

To profile Alloy, I used the Linux profiling tool `perf`, Microsoft Visual Studio's Profiling and Diagnostics Tools, and [Intel's VTune Profiler](https://www.intel.com/content/www/us/en/developer/tools/oneapi/vtune-profiler.html#gs.hfx933).

## Final Achievements
### Alloy Library

The following describes the layout of Alloy in memory (as of Alloy v5):

![Alloy Layout](/images/AlloyECS/AlloyLayout.jpg)

During run time, being an archetype-based ECS, Alloy pools entities with similar component make ups. In the case of DeltaBlade 2700, the following archetype graph is generated:

![Alloy Layout](/images/AlloyECS/AlloyArchetypeGraph.png)

Notes: 
- This graph displayes archetype component operations as a directional graph as either an addition or removal of any given component.
- Not all nodes hold entities.
- The binary values are bitset representations of what components any given archetype holds.

Alloy, despite being complex and performant, has a simple interface:

```c++
#include "Alloy/Alloy.h"

...

// Define a component
struct Component
{
    int var;
};

// Create a space for an entity to live
X::Space space{};
// Create a new entity
X::Entity entity = space.CreateEntity();
// Give the entity a Component that is constructed with { 1 }
space.EmplaceComponent<Component>(entity, 1);

// Update over all entities in the space that have Component
space.Update<Component>([](X::Entity entity, Component& component) {
    // Edit the component's values
    ++component.var;
});

// Remove Component from the entity
space.RemoveComponent<Component>(entity);
// Destroy the entity
space.DestroyEntity(entity);
```

### Results

To fully tune and test Alloy, I compared it to a few popular c++ ECS libraries using a heavily modified version of [ECS Benchmark](https://github.com/abeimler/ecs_benchmark).

As of Alloy v6:
![Alloy Performance](/images/AlloyECS/AlloyPerformance.png)

**Note**: The data is color-coded on a scale of green to red, more performant to less performant, respectively.

At a glance, Alloy ECS is quite performant.\
Due to the architecture chosen, Alloy is less-performant when creating/destroying entities or adding/removing components as the goal was update speed - which it dominates in.

## Hindsight

### Issues & Mitigations
As Michele Caini, known as `@skypjack` on GitHub and wrote the widely used EnTT, has said:
> I started developing `EnTT` for the wrong reason: my goal was to design an entity-component system to beat another well known open source solution both in terms of performance and possibly memory usage.

Due to my choice of  goals and restrictions, issues came up during development:
- **Issue**: POD / Aggregate Data / Blittable components only.
    - **Mitigation**: The ability for some more complex functionality was added, given:
        - The component can be copied using an assignment operator, copy constructor, move constructor, or `memcpy` (preferred).
        - The component either does not need a destructor or implements one.
- **Issue**: No component references can be stored.
    - **Mitigation**: As component lookup is O(1) (constant time), a `ComponentWrapper` was implemented that is a safer proxy for `GetComponentTemporary`.
- **Issue**: Lack of debugging.
    - **Mitigation**: Unfortunately, not much could be done here. I personally dealt with as many issues myself as possible, but also developed tools - an entity viewer, component editor, etc - to help mitigate this.

## References, Future Work, and More
### Special Thanks

**Jonathan Bourim** for extensive help designing, implementing, testing, and debugging.

**Jordan Hoffmann** for extensive testing and debugging.

***All* Members of team Handshake Firm** for working with a non-standard ECS implementation and assisting with the development of Alloy.

### Future Work
In the future, I would like to:
- Add _lots_ of debugging support.
- Add _lots_ of utilities.
- Write extensive documentation.
- Compare memory consumption to other popular c++ ECS libraries.
- Advanced update loop query filtering.
  - `AnyOf`, `OneOf`, `AnyOfAsParentType`, etc.
- Improve `ComponentWrapper*`s.
- Vectorizing operations as batch requests.
- Ability to parallelize `X::Update`s.

Other Research Areas:
- Sparse set implementation with paging.
- Component hierarchies, groups, etc.
- Building in a custom memory manager for better cache performance of operations.
- Solving the issue of pointer invalidation many ECS libraries have.

### Links
[DeltaBlade 2700](https://store.steampowered.com/app/1143450/DeltaBlade_2700/) : An Action-Packed Competitive Local Multiplayer Brawler with Explosive, Fast-Paced Sword Combat and Jetpacks.

[EnTT](https://github.com/skypjack/entt) : A feature-filled popular ECS library

[Unity DOTS](https://unity.com/dots) : An archetype-based ECS implementation in C# for the Unity game engine.

[Flecs](https://flecs.docsforge.com/) : An interesting implementation of an ECS system that allows for many non-standard paradigms.

[Ginseng](https://github.com/apples/ginseng) : An ECS library that was designed to be used in games and for ease-of-use.

[ECS Back and Forth](https://skypjack.github.io/2019-02-14-ecs-baf-part-1/) : A series of posts about implementing ECS.

[How to make a simple entity-component-system in C++](https://www.david-colson.com/2020/02/09/making-a-simple-ecs.html) : Covers sparse sets and the logic behind using them. 

[Building an ECS](https://ajmmertens.medium.com/building-an-ecs-2-archetypes-and-vectorization-fe21690805f9) : Covers data packing and add/remove operation graph representation.

[ECS Benchmark](https://github.com/abeimler/ecs_benchmark) : For benchmarking the performance of popular c++ ECS libraries.

[Intel's VTune Profiler](https://www.intel.com/content/www/us/en/developer/tools/oneapi/vtune-profiler.html#gs.hfx933) : A very useful profiling tool to find bottlenecks and performance issues. 