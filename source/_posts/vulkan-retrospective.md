---
title: Retrospective on Vulkan in DeltaBlade 2700
author: Jonathan Bourim
tags: 
- Game
- DeltaBlade 2700
- Vulkan
- Graphics
- Damascus
date: 2021-12-05 23:19:00
---

![](/images/Vulkan/vulkan_logo.png)

# Introduction

**Vulkan** is a low-level, cross-platform rendering API that is designed to abstract modern graphics architectures while maintaining the maximum level of programmability. Before Vulkan, programmers would use APIs such as OpenGL and D3D11 for rendering. As real-time simulation matured, graphics programmers were looking for ways to optimize the rendering pipeline for their specific uses. With previous APIs, this was a massive limitation. Now, with the release of Vulkan, programmers now have more control than ever in specifying all details of a program's rendering functionality. 

As DeltaBlade 2700 is intended to be a game enjoyed on as many platforms as possible, particularly the Nintendo Switch, the usage of Vulkan as our rendering backend seemed both a fantastic use-case of the API, as well as a valuable learning experience for myself and others. As the project continues development, so will the graphics framework that hosts the rendering functionality, entitled **Damascus**. 

# Personal Project Goals

My personal goal for the project is the development of Damascus into a multi-featured graphics framework, including:

* Triple Buffering, allowing frames to be processed while the previous frame is still in-flight.

* Abstraction of all basic types for automatic memory management, extensibility and convenient construction (particularly for asynchronous rendering, where you need stored copies of each type).

* Abstracted rendering pipeline creation to speed up development time and reduce code duplication.

* Renderer API, allowing a user to simply add a rendering context with associated pipelines.

# Details


## Triple Buffering

Traditional rendering APIs like OpenGL assume that all rendering commands are executed before the beginning of the next render pass. This means that the GPU will stall and wait until all the commands have been executed and everything has been rasterized to the screen before continuing program execution. This is a tremendous amount of unnecessary waiting. 

To alleviate this, triple buffering is a technique that uses multiple instances of each rendering object within the engine, so that one set may be being executed / rendered while another is already being processed for execution thereafter. 

[An example can be found in the Khronos Group Vulkan Samples by clicking here.](https://github.com/KhronosGroup/Vulkan-Samples/blob/master/samples/performance/swapchain_images/swapchain_images_tutorial.md)

The success of this implementation is determined by the relative framerate improvements using only a single object per swapchain image (single-buffered) as all programs would by default, versus the framerate improvements of introducing the additional images and in-flight processing. 

## Vulkan Type Abstraction

Vulkan types are effectively pointers that are provided from their respective `Create` functions to an opaque handle. Before that, they are "null handles" and contain only a null address. One of the most common techniques a Vulkan framework can do is take control of type creation, usage and destruction of these basic types.

Damascus extends these basic types to functionally serve as the underlying Vulkan type, extend class information for our own purposes, as well as self-destruct when leaving scope if the underlying type has initialized memory.

The success of this implementation is determined by the program's ability to execute custom user code, as well as perform automatic cleanup on leaving scope and exiting the program. As Vulkan validation layers and Vulkan Memory Allocator will explicitly error if memory isn't freed, this is easy to evaluate.

## Render Pipeline Abstraction

Construction of a full rendering pipeline is a non-trivial endeavor in Vulkan. There's so much to describe, in fact, that they're introducing features to mitigate the amount of information required to construct one. 

[Click here to see a blog post describing the upcoming changes to streamline render passes.](https://www.khronos.org/blog/streamlining-render-passes)

As mentioned in the post, construction of these objects remains largely verbose because the API needed to ship, and it particularly needed to provide the ability to describe subpasses (mini-passes inside of your render pipeline, in a sense) for users leveraging something like tiled deferred rendering. However, if you aren't making use of these features, it's a ton of boilerplate code.

In addition, half of the battle in any Vulkan framework is the description of shader resources, particularly in a program that has dynamic state. It's relatively straightforward to describe a set amount of resources to be used in perpetuity when you're aware of the entire state of your program ahead of time, but in a game where the state can change at any time... this becomes dramatically more challenging. In addition, there are a surprisingly small number of resources that deal with this issue, as most usages of Vulkan online are for demo programs.

Several goals during this project is to construct a pipeline capable of allocating, utilizing and cleaning up these pipelines and resources at runtime with dynamic state.

Evaluating this pipeline will be the ease of construction and utilization of new shaders, render passes and object uniforms that provide their data to them.

## Renderer

As the use of Vulkan is so explicit, the construction of any rendering code is essentially the practice of stating your "assumptions" of the render state. This will be the process of effectively defining my own default state, similarly to how *OpenGL* would behave if you were to leave all its internal settings to their default values.

Damascus defines its own `Renderer` class, which allows users to append a `IRenderingContext`, which is effectively a way to describe a single application's render state. An `IRenderingContext` contains a series of graphics pipelines and describes how they interact with one another to achieve the user's desired output.

This will be evaluated once again by the ease of use, particularly in the ability to add rendering functionality to the program at whim.

# Results 

## Triple Buffering

This was done by simply tripling the quantity of every Vulkan resource that gets utilized on the GPU, allowing subsequent frames to be processed during in-flight rendering.

This is done quite simply by declaring a type called ImageAsync, which is just another way of describing a vector, but we use this semantic to inform that this is intended to be initialized per-swapchain-image.

### Definition
```cpp
template <class T>
using ImageAsync<T> = std::vector<T>;
```

### Usage Example
```cpp
ImageAsync<std::array<vk::ImageView, ForwardPipeline::Attachments::Count>> ForwardPipeline::GetAttachmentsCreateInfo()
{
    auto& renderer = Renderer();
    auto& rc = renderer.GetRenderingContext<GameRenderingContext>();

    ImageAsync<std::array<vk::ImageView, Attachments::Count>> attachmentsPerImage;
    for (size_t i = 0; i < Renderer().ImageCount(); ++i)
    {
        attachmentsPerImage.push_back({
            rc.attachments[GameRenderingContext::Attachments::Color].imageView.VkType(),
            rc.attachments[GameRenderingContext::Attachments::Depth].imageView.VkType(),
#ifdef USE_MSAA
            rc.attachments[GameRenderingContext::Attachments::ResolveColor].imageView.VkType(),
#endif
        });
    }
    return attachmentsPerImage;
}
```

This has had great results on performance, increasing our rendering output by several folds. As with most applications, we were certainly spending a large amount of time waiting for the GPU to finish executing commands. Now we can begin working on our next frame's data before having completed the previous.


## Vulkan Type Abstraction

The primary goals for this type abstraction were:
* Extensibility
* Conversion to underlying vulkan type
* Automatic cleanup

In order to accomplish this, Damascus defines a typical Vulkan type like this:

```cpp
class FrameBuffer : public IVulkanType<vk::Framebuffer>, public IOwned<Device>
{
	DM_TYPE_VULKAN_OWNED_BODY(FrameBuffer, IOwned<Device>)
	DM_TYPE_VULKAN_OWNED_GENERIC(FrameBuffer, Framebuffer)
};
```

To break it down a bit, 

`IVulkanType` is responsible for declaring the underlying type and defines several conversion functions, such as `VkType()` and `VkCType()`, which convert to the C++ and C vulkan types respectively.

`IOwned` handles memory cleanup, and defines a pointer to the owning type. Along with some user-defined destructor and dependency injection, this automatically cleans up the memory using this inheritance model upon leaving scope.

The macros are simply a way of avoiding writing Vulkan construction code for a simple type, as almost all vulkan types are constructed and destructed using the same semantic model.

I.E.: `device->createSemaphore(&createInfo, nullptr, &VkType())...`    
   
This has been tremendously successful, as all of our abstractions leverage these types. With the sheer number of objects constructed, the automatic cleanup has been *vital* for avoiding serious memory leaks.

## Render Pipeline Abstraction

### Interface
In order to simplify the construction and utilization of pipelines, I use an `IGraphicsPipeline` to define a base interface that the `RenderingContext` is capable of invoking for a pipeline of any type.

```cpp
    virtual void Load() = 0;
    virtual void Create(Device* inOwner) = 0;
    virtual void OnRecreateSwapchain() = 0;
    virtual void WriteUniformSets() = 0;
    virtual void Update(float dt) = 0;
    virtual vk::CommandBuffer* Record() = 0;
```

This allows the rendering context to enumerate over pipeline containers and perform everything we need for creation, loading, updating and recording.

### Descriptor Sets

Descriptor sets, as mentioned in the details, were a massive challenge. In order to construct a program capable of dynamic state, you need an entire pipeline that is capable of understanding the necessary memory from the contents of a shader, creating the associated memory upon request, and associating objects with that memory.

I'm happy to say that this process is now fully functional within Damascus with minimal overhead, albeit this is only permissible due to the simplicity of our game.

In order to accomplish this, we do the following:

* Add and create all pipelines intended to be used by the rendering context at load-time
* Upon loading the pipeline, shader reflection reads in all descriptor sets and bindings that the pipeline will be utilizing
* All possible descriptor sets and bindings are frontloaded for this pipeline with maximum value counts for each set and binding type, which is created using a pooling model.
* These memory pools provide objects with an *available ID* for use, which is a window into that object's memory region in the uniform / binding's data.
* Objects can now interface with these bindings directly, primarily by providing their local uniform data to the staging buffers contained within each binding.
* These bindings / uniforms are uploaded each frame from the CPU to the GPU if their memory has been written-to.

The user interface for this process has been intentionally kept minimal.

Users begin by creating a uniform type associated with a pipeline:

```cpp
struct CUniformsForward final : IUniforms<ForwardPipeline>
```

They define bindings that the shader uses locally:

```cpp
    enum Bindings : uint32_t
    {
        SampleProperties = 0,
        TransformModifiers = 1,
        DebugProperties = 2
    };

    struct UboTransformModifiers
    {
        glm::vec4 position = glm::vec4(0.0f);
        glm::vec4 scale = glm::vec4(1.0f);
    };

    struct UboSampleProperties
    {
        glm::vec2 uvScale = glm::vec2(1.0f);
        glm::vec2 uvOffset = glm::vec2(0.0f);
        uint32_t sampleIndex = 0;
    };

    struct UboDebugProperties
    {
        glm::vec4 colorModifier = glm::vec4(1.0f);
    };
```

Then, they overload the assign function, which loads the local data into the staging buffer of the uniform to be ready for transport to the GPU:

```cpp
    void Assign() override
    {
        objectUniforms->SetUniformBufferData(sampleProperties, Bindings::SampleProperties);
        objectUniforms->SetUniformBufferData(transformModifiers, Bindings::TransformModifiers);
        objectUniforms->SetUniformBufferData(debugProperties, Bindings::DebugProperties);
    }
```

This allows a user to interface with an object's uniforms by simply changing the value of the member variables listed above, as the backend will handle the rest.


While construction of this pipeline was quite difficult to construct and validate, the results have justified the time spent. This has been a convenient pipeline to work with in terms of CPU to GPU interfacing with shader resources. This pipeline has served as the backbone for the post-processor, particle system, debug rendering, text rendering and more.

## Renderer

The process of stating a simple set of rendering state assumptions has worked wonders for just keeping the rendering state clean and functional. We do that using the following concepts:

### Rendering Contexts

In order to define all the pipelines we'd like in the `GameRenderingContext` for example, we define these pipelines in the order we'd like them to execute.

```cpp
void GameRenderingContext::CreatePipelines()
{
    AddPipeline<DeferredPipeline>();
    AddPipeline<SampleDeferredPipeline>();
    AddPipeline<ForwardPipeline>();
    AddPipeline<ForwardInstancedPipeline>();

    // Add post-processing pipelines
    PostFX::instance->AddEffectPipelines();

    AddPipeline<SamplePostPipeline>();
    AddPipeline<TextPipeline>();
    AddPipeline<DebugPipeline>();
    AddPipeline<OutputPipeline>();

    for (auto& [id, pipeline] : pipelines)
        pipeline->Create(&renderer.device);
```

The pipelines will execute in series, handing the rendering output from one to the next like a game of hot potato (particularly in the case of the `PostFX` post-processing pipeline).

When it comes time to record, they'll also execute in series, with the next pipeline executing only the previous has completed. This is not the most performant method, but greatly decreases the complexity of our game.

This is similarly done for the editor rendering context, creating the context for the editor UI of the project.

The rendering context is added to the renderer via an `AddRenderingContext` call, which will enumerate these contexts for various purposes.

### Update phase

For the update phase, it is important to test if any uniforms we've created have been dirtied as a result of operations that may have occurred earlier in the update phase (renderer updates last).

This will traverse the list of rendering contexts and pipelines to identify if any descriptors need to be written to. Each pipeline overloads its own `WriteUniformSets` function that determines how to assign the `DescriptorSet` to its associated GPU memory.

```cpp
void ForwardPipeline::WriteUniformSets()
{
    X::Update<CUniformsForward>(
        [](X::Space& space, const X::Entity entity, CUniformsForward& uniforms) {
            uniforms.WriteObjectUniforms();
            uniforms.Assign();
        });
}
```

Here `CUniformsForward` describes the associated uniform component for the pipeline.
We iterate over the entities that happen to contain this component and write the sets for the object, then assign the local CPU-bound memory to the staging buffer within the uniform binding. This is then automatically uploaded to the GPU during the rendering phase.

### Rendering

The primary use of these contexts is, of course, to record the drawing commands to provide the window with visual output.

The renderer executes at the last phase of the engine, and will aggregate all the rendering commands of each context. This includes:

* Uploading uniforms to the global uniform set
* Recording the render commands of each context and pipeline therein
    * Uploads uniforms associated with the pipeline
    * Rendering each object that is assigned to the pipeline


Recording example in a pipeline:

```cpp
    renderQueue.Submit(
        RenderPassBucket::FORWARD,
        [&renderer, commandBuffer, layout](const X::ComponentWrapperGeneric& wrapper) {
            // Bind mesh
            const auto& render = wrapper.GetComponent<CRender>();

            render.mesh.Bind(commandBuffer);

            wrapper.GetComponent<CUniformsForward>().BindObjectUniforms(renderer.imageIndex, commandBuffer, layout);

            // Submit transform data
            const auto& transform = wrapper.GetComponent<CTransform>();

            auto mat4 = transform.Global(wrapper.GetSpace(), wrapper.GetEntity()).GetMat4();
            commandBuffer.pushConstants(
                layout,
                vk::ShaderStageFlagBits::eVertex,
                0, sizeof(glm::mat4), &mat4);

            // Display mesh
            render.mesh.Draw(commandBuffer);
        });
```

All rendering functionality in the project utilizes this model, and we've found good success in terms of performance and ease of validation using this sequence. 

# Discussion


## Technical Rabbit Holes

People often speak about how they prefer C to C++ because of the possibility of getting caught inside of infinite technical rabbit holes in the attempt to cover every possible use-case of their systems.

Well, I hadn't really experienced it up until working on Damascus, but I now agree with that more than ever! In the process of abstracting the vulkan types in particular, that model had undergone dozens of changes until it landed on what's being used now. This soaked a tremendous amount of time ahead of the project's startup. 

This still happens of course, but that process has taught me a very valuable lesson about how one can really spend all their time in a corner until they take a step back and look at the bigger picture.

## Conclusion 

All in all this has been an incredibly fruitful project in terms of furthering my understanding of low-level rendering. The original goals were almost entirely accomplished. There is quite a lot I wish I could've done, but the existing features are something I'm proud of. Had I stuck with my familiar choice, *OpenGL*, the project would have certainly benefited from a ton of features... but I wouldn't have learned anywhere near the same quantity about professional graphics programming.

# References

## [Vulkan Samples](https://github.com/KhronosGroup/Vulkan-Samples)
Official Vulkan samples by the Khronos Group, covering many different concepts and some Do's and Don't Do's for different techniques and types.

## [VkGuide](https://vkguide.dev/)
Used as a resource while developing many different elements of the framework, namely descriptor sets, texture handling, etc. A lovely resource describing many different mental models, code examples, and more.

## [Lessons Learned Building a Vulkan Material System](http://kylehalladay.com/blog/tutorial/2017/11/27/Vulkan-Material-System.html)
Resource used to develop descriptor sets, shader reflection, render pipeline creation etc. 