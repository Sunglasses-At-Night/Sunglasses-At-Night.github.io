---
title: Retrospective on Vulkan in DeltaBlade 2700
author: Jonathan Bourim
tags: 
- Game
- DeltaBlade 2700
- Vulkan
- Graphics
- Damascus
date: 2021-10-18 12:00:00
---

![](/images/Vulkan/vulkan_logo.png)

## Introduction

**Vulkan** is a low-level, cross-platform rendering API that is designed to abstract modern graphics architectures while maintaining the maximum level of programmability. Before Vulkan, programmers would use APIs such as OpenGL and D3D11 for rendering. As real-time simulation matured, graphics programmers were looking for ways to optimize the rendering pipeline for their specific uses. With previous APIs, this was a massive limitation. Now, with the release of Vulkan, programmers now have more control than ever in specifying all details of a program's rendering functionality. 

As DeltaBlade 2700 is intended to be a game enjoyed on as many platforms as possible, particularly the Nintendo Switch, the usage of Vulkan as our rendering backend seemed both a fantastic use-case of the API, as well as a valuable learning experience for myself and others. As the project continues development, so will the graphics framework that hosts the rendering functionality, entitled **Damascus**. 

## Personal Project Goals

My personal goal for the project is the development of Damascus into a multi-featured graphics framework, including:

* Asynchronous rendering, allowing frames to be processed while the previous frame is still in-flight.

* Abstraction of all basic types for automatic memory management, extensibility and convenient construction (particularly for asynchronous rendering, where you need stored copies of each type).

* Abstracted rendering pipeline creation and utilization by leveraging shader reflection, descriptor set management and automatic uniform uploading.

* Advanced mesh features such as instancing, which would allow particle emitters to store buffers of contiguous data of each particle, for example.

* Multi-threaded command buffer recording using secondary command buffers.

## Methodology & Process Documentation

### Triple Buffering

Traditional rendering APIs like OpenGL assume that all rendering commands are executed before the beginning of the next render pass. This means that the GPU will stall and wait until all the commands have been executed and everything has been rasterized to the screen before continuing program execution. This is a tremendous amount of unnecessary waiting. 

To alleviate this, triple buffering is a technique that uses multiple instances of each rendering object within the engine, so that one set may be being executed / rendered while another is already being processed for execution thereafter. 

[An example can be found in the Khronos Group Vulkan Samples by clicking on this text.](https://github.com/KhronosGroup/Vulkan-Samples/blob/master/samples/performance/swapchain_images/swapchain_images_tutorial.md

The success of this implementation is determined by the relative framerate improvements using only a single swapchain image (single-buffered) as all programs would by default, versus the framerate improvements of introducing the additional images and in-flight processing. This will be showcased via ImGui using performance graphs.

### Vulkan Type Abstraction

Vulkan types are effectively pointers that are provided from their respective Create functions to an opaque handle. Before that, they are "null handles" and contain only a null address. 

Damascus extends these basic types to facilitate the underlying Vulkan type, extended class information for our own purposes, as well as self-destruct when leaving scope if the underlying type is created. 

The success of this implementation is determined by the program's ability to execute custom user code, as well as perform automatic cleanup on leaving scope and exiting the program. As Vulkan validation layers will explicitly error if memory isn't freed, this is easy to evaluate.

### Render Pipelines

<*Section to be completed by Milestone 2*>

### Meshes and Buffers

<*Section to be completed in final submission at semester end*>

### Multithreading

<*Section to be completed in final submission at semester end*>

## Projection Analysis, Discussion & Conclusion

<*Section to be completed in final submission at semester end*>