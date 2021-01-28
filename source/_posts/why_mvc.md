---
title: Why MVC?
author: Roland Shum
tags:
- GameDev
- UI
date: 2021-01-27 01:01:01
---

# What is MVC?

## Introduction

Hey everyone, lets talk about the Model-View-Controller (MVC) architecture. Writing programs has always been a combat against rising complexity. MVC exploded in popularity around
the 2000s when web programming became popular. Today I'll be talking about how MVC can be a toolkit in your development. The traditional approach of programming works on
Input -> Process -> Output approach while MVC works on Controller → Model -> View.

Unfortunately, the traditional approach usually means the UI coding, the module data, and the module functions are all written in one file. As one can imagine, as the file grows
the costs of maintaining all three parts of the code grows, not to mention its lack of testability. This is where MVC comes in. MVC splits the logic three ways: Input, UI, and Data.
The UI logic belongs in the View, the input in the Controller, and the data in the Model.

This separation helps tremendously as each file is dedicated to implementing one thing. So now instead of implementing a ball of spitfire, you're implementing three different
parts of it, then joining them together.

## MVC Parts

* **Model**: This is the main logic of the module. Anything that deals with backend stuff that only programmers care about belongs here.
* **View**: Views are components that display the UI. Any logic to do with UI goes here. Typically, this reads the model data, and generates the UI based off that.
* **Controller**: This component handles user interactions, work with the model, and ultimately select a view to render that displays UI. In an MVC application, the view only displays information;
the controller handles and responds to user input and interaction.

The core concepts of MVC are to split things such that they are not dependent on each other. As such, the Model, View, and Controller can be swapped out anytime.
For example, if the View were to be swapped out, it would still be referencing the same Model and Controller.

The diagram below shows what model takes data from, and is aware of, whom. The Controller takes data from both View and Model, while the View takes data from the Model.

![MVC Diagram](/images/mvc.png)

## Variants

MVC has been around for a long time now, and there are many variants of MVC flying around. In game development, a popular model is the M-VC (Model - ViewController). In this model,
the View and Controller are mixed together because its been implemented in the Engine (Unity for example). So your UI script would be a ViewController, and it will have a reference
to the Model it needs to modify.

Another popular model is the MVVM (Model-View-ViewModel). This model abstracts the View from the Model, putting a ViewModel class in between.

As with other software patterns, MVC expresses the "core of the solution" to a problem while allowing it to be adapted for each system.
Particular MVC designs can vary significantly from the traditional description.

## Pros and Cons

Pros:

* **Parallel Development** - The MVC modules are all separate from each other, meaning they can be simultaneously developed.
* **Better prediction of schedule** - By splitting apart one giant module, a programmer has an easier time estimating the development time of such module.
* **Low Coupling** - By its architecture, there is low coupling between all three modules. Swap the View, and you have a UI completely different.
* **Scalability** - Responsibility of code is clear, thus it is much easier to maintain and scale the individual modules.

Cons:

* **Low navigability** - The code is now harder to navigate because of a new abstraction, and this abstraction requires the user to first understand how responsibility each part
of MVC takes.
* **Scattering of code** - Code is now more scattered. Developing a consistent representation in three different compositions can be harder.

## Conclusion

At the end of the day, MVC is a tool to help decouple features and navigate complexity in code. A hallmark of bad MVC are hacks that allow the Module and View to talk to each
other. This is *very* frowned upon as it completely breaks the reason why the architecture is used. A proper implementation would mean the Model does not even need to be
aware of the View, as long as the View is fed a Model.
