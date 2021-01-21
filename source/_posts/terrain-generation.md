---
title: Unity Marching Cubes Terrain Generation
author: Jonathan Bourim, Calin Gavriliuc
tags:
- Unity
- GameDev
date: 2021-01-02 01:01:01
---

# Background
---

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


## About the Authors
Calin Gavriliuc: Engine Programmer  
Jonathan Bourim: Graphics Engineer & Engine Programmer

We are Computer Science students at the DigiPen Institute of Technology, and have been working on game projects together for several years.

[Here](https://store.steampowered.com/search/?developer=Handshake%20Firm) are some game we have worked on:
![ArcApellago](/images/ArcApellago.jpg)
![DeltaBlade2700](/images/DeltaBlade2700.jpg)


## Introduction
Project Cleanser is a year-long team game project that we've been working on together. It's a sandbox game set on a large planet, where the player hunts, digs, and upgrades their equipment to challenge the core at the center of the world. 

While we were brainstorming ideas for our new, year-long game project, we encountered many interesting videos showcasing voxel techniques, such as procedural world generation and deformation.

Inspired by Astroneer, we decided to implement a similar method of terrain generation and deformation for our project. 

[Some Inspiration](https://www.youtube.com/watch?v=NG1gJvdCE4Q)


## What Is It
### Voxels
Voxels are a volumetric representation of a point in 3D space. While pixels are representative of data in a small **area**, voxels are representative of data in a small **volume**. These values exist on a 3D grid, and have each point in that grid set to a particular value. With our goal being to make terrain, we used these values to determine the density of the terrain at that point.   
Density for our volume means it exists in one of two states, **filled** (part of the ground), or **empty** (air).


### Cube Marched Terrain Generation
The marching cubes algorithm is a fast way to generate a polygonal mesh from a height/density field. We use this algorithm to generate triangles for a mesh from a density field. It is a relatively simple, fast, and efficient algorithm that has been used in many applications.

The end result can be seen in the following video.

<p align="center">
<video playsinline autoplay loop muted controls class="desktop-50-mobile-100">
  <source src="/images/CubeMarchingSculpting.webm" type="video/webm">
  Your browser does not support the video tag.
</video>
</p>


## Goals & Constraints
For our terrain to function in our environment, we constructed our systems with several priorities in mind:
- Multi-threading
- Load Balancing
- Dynamic Loading
- Determinism / Seeding
- Spherical Terrain

**Multi-threading:**
- Due to the gargantuan number of math operations that occur when our terrain is generated or modified, performance is the primary concern of this implementation.
- We must leverage Unity's Job system for multi-threading to maximize the performance of our terrain generation.

**Load Balancing:**
- As we are generating terrain for a game, it is important to load terrain quickly but also throttle operations as to not overload the user's hardware and reduce FPS to an unplayable level. 

**Dynamic Loading:**
- Our world is a large, planet-like environment. As voxels are stored values representing our world, those values must be stored somewhere.
- We quickly approach the limitations of modern hardware if we store all of these values in our active memory.  

**Determinism / Seeding:**
- We generate terrain with the use of randomization tools such as noise functions. With that, there is a decision between a uniquely generated new world, and a randomly generated world that is made consistent by the seed that it is given.
- Our target was the consistent world, as it allows us to leverage Unity's editor to place objects into our world non-procedurally.

**Spherical Terrain:**
- As our world is a spherical planet, we needed the ability generate terrain in a radial manner. This includes developing a spherical, mountainous surface with a cavernous core.


# Implementation
---
The following is a simplified overview of the pipeline:
![Terrain Manager Flow Chart](/images/TerrainManagerFlowChart.png)


## Chunks
In the above examples, we have shown visual representations of our density values, but what is assigning them their mesh and position in the world?
We use a type we call **Chunks** to store this data and to pass it through our pipelines. In essence, a chunk is a single cube that contains a batch of voxels in the world.
Chunks contain the following information:  

```cs
// Chunk coordinate representing its position among all chunks
public int position;

// Density of each voxel
public NativeArray<float> densities;
// Resource type of each voxel (iron, stone, etc)
public NativeArray<Resource.Type> resources;

// Mesh data (updates on any voxel change)
public NativeList<float3> vertices;
public NativeList<int> triangles;
public NativeList<float3> normals;
public NativeList<Color> colors;

// Level of detail of the chunk
// Best LOD being 1
// Must be powers of 2
public int lod;

// If the chunk has changed since it was loaded
// For checking if it should be saved on unload
public bool hasChanged; 
```

The data buffers are Unity's Native structures (C++ InterOp) to make use of the Burst Compiler.


## Marching Cubes Algorithm

### Triangulation
As mentioned above, the marching cube algorithm utilizes voxels to determine the density of a particular volume. This is interpreted as whether or not that point is part of the surface of our terrain. If we take the base case, a single voxel, we can look at its corner points to determine the triangle configuration of the cube that the voxel encompasses. 

These triangle configurations come in 15 variants:

<img src="/images/MarchingCubesConfigs.png" width="60%"/>

The orange points at the corners indicate that they are part of the ground, while the empty corners are air. If we extend this idea to a larger grid, these triangles will connect with one another to form the basis of the terrain depending on the configuration of these values.  

![Marching Example](/images/MarchingExample.png)

The above image was constructed by setting all the voxels' density values within a spherical radius of the center of the sphere to +1 (ground / filled state), and outside of the radius to -1 (air / empty state). The algorithm considers the transition between the ground (positive values) and the air (negative values) to be where the surface manifests, which is why our surface is a radial shape from the center of the sphere.


### Smoothing
Now we have a solid terrain to work with, but something is missing. What about the smooth terrain shown in the video at the top of this page, the sort of terrain you might see in Astroneer? The example above is when you treat your values as a boolean, either representing a value below the surface or above it. However, if we use these values to represent a gradient of density from one voxel to the next, we can utilize interpolation to alter the angle of the triangles we are constructing.

![Marching Example Smooth](/images/MarchingExampleSmooth.png)

One method of doing so is by setting the density values to a gradient ranging from +1 to -1, where +1 is the center of the sphere, 0 is the surface, and -1 is the boundary of our voxel grid. In this case, the boundary would be `2 * radius` or the `diameter` of the "world sphere".

![Marching Cubes Density Gradient](/images/MarchingCubesDensityGradient.png)

Another method of achieving this effect is through a similar technique. Instead of treating the whole "world sphere" as a gradient, only treat the region around the surface as a gradient. This becomes especially useful when applied in a game setting since most nodes are either `1` or `-1` and not a floating point value.

![Marching Cubes Density Gradient](/images/MarchingCubesDensityGradientEnhanced.png)

This diagram shows how a surface is interpolated between two vertices with varying density values.

<img src="/images/MarchingCubesInterpolation.png" width="60%"/>
<!--- Source link for the image above --->
<a href="http://jamie-wong.com/2014/08/19/metaballs-and-marching-squares/">
  <p style="text-align:center">
  Image Source
  </p>
</a>


This, following the interpolation code, will achieve the smoothing explained above:
```cs
    float3 InterpolateVerts(float3 vertex1, float3 vertex2, float densityValue1, float densityValue2)
    {
        // Interpolate from first vertex to second vertex relative to density difference
        float t = (-densityValue1) / (densityValue2 - densityValue1);
        return vertex1 + t * (vertex2 - vertex1);
    }
```


## Chunk Generation
![Terrain Manager Flow Chart](/images/TerrainManagerFlowChartRequestChunk.png)

Now that we have our data container, and a method to act on that data, we need to fill it with the data it requires to function. Upon being requested, the chunk's density values are generated and the chunk goes through a two-step process of executing the marching cubes algorithm and mesh construction.

First, we use the marching cubes algorithm to identify the vertices, triangles, normals of each voxel during which we pick vertex colors. Then, we construct the mesh and bake the physics from the resulting data.


### Stitching and Sharing Chunk Edge Data
<!--
**TODO**
- voxels occupy the regions between nodes
- thus voxels share edges
- In a multithreaded environment, it is important to package chunks as self-contained as to prevent read & write race conditions
- Pros vs cons of unique edges vs duplicated data (i.e. memory vs multi-threading benefits)
- Tearing due to sharing of chunk data (in some cases such as bad unity collision checks)
-->

An example of where one would need to be careful with duplication of data is **deformation**. Say if you were on the corner of several chunks sharing an edge, and you altered the density values of each of those chunks at different rates, that would break the idea that the values were duplicated. What results visually is a tearing effect, a gap in between the chunks. This requires additional attention to the synchronicity of the logic operating on the voxel data. 


![Voxel Tearing](/images/VoxelTearing.png)

- Requirement of having to edit chunk edges only when all neighboring chunks are loaded


<!--
### Chunk Terrain Generation
***TODO***
-->

### Chunk Loading
![Chunk Loader Flow Chart](/images/TerrainManagerFlowChartChunkLoader.png)

Now that we can generate chunks that also look like interesting terrain, we need a way to selectively pick which chunks to load as to not overwhelm a user's computer with generating an entire world and expecting it all to fit in their RAM. We call this chunk loading. Similarly, this is also applied to unloading chunks.

We do this by loading a `2n` by `2n` by `2n` cube around the player. You can take `n` number of chunks in each axis (`[x+n, x-n]`, `[y+n, y-n]`, and `[z+n, z-n]`) outward from the player and request them to be loaded.  
Similarly if a loaded chunk falls outside of this cube, unload it.

![Chunk Loading Distances](/images/ChunkLoadingDistances.png)

When loading and unloading chunks, it was important to remember that chunks share edge data so borders of chunks cannot be edited without neighboring chunks being loaded first to preserve this "synced" state.

### Chunk Serialization
![Terrain Manager Flow Chart Terrain Serializer](/images/TerrainManagerFlowChartTerrainSerializer.png)

For our implementation, we used a simple approach for storing chunks to a file. Given a known size of a chunk (n by n by n nodes), we can read and write entire 3D arrays of data as their binary representation. This is done for both the density and resource values.  

It should be noted that, as a trivial form of optimization, only chunks changed by the player are saved to the disk. Since our terrain generation is deterministic and faster than loading chunks, it is faster to re-generate the chunk on request compared to loading that chunk from the disk. This, in return, also saves on disk space.

These load and unload requests are performed within Unity Jobs to further utilize the player's CPU cores from a multithreaded approach and to keep consistency with the rest of the systems.

### Performance
Due to real-time gameplay restrictions and the amount of terrain a player is required to load, chunk generation/loading/marching needs to be highly optimized.

As this is one of the most performance-critical portions of this system, we use Unity's Job system to multi-thread the execution of this code. Originally, we had experimented with compute shader pipelines, which is faster in normal circumstances. However, after performance testing, Unity's Burst Compiler in conjunction with the job system has outpaced these compute pipelines due to the overhead of large data buffer I/O with the GPU. The overhead of I/O was larger than the time for operations to be performed on that buffer, ultimately resulting in CPU-based computation being faster.

**Major sources of optimization:**
- Chunk Stages
- Cross-Frame Work
- Maximizing Usage & Throttling
- Priority Queueing
- Level Of Detail (LOD)

The following is frame-by-frame profiling of the chunk processing system using multiple distinct job stages and cross-frame job completion of the chunk request pipeline (after optimization):
![Terrain Manager Flow Chart](/images/TerrainManagerJobSystem.png)

#### Chunk Stages
Key Terms:
- **Frame**: One game processing frame / update loop.
- **Work State**: One of three stages a chunk will go through to be processed fully.
- **Work State Loop**: One loop of all three work state steps. 

Our system uses three work states for processing chunks. These work states only allow a certain type, and by extension a certain amount, of work to be done on chunks for any given grouping of frames.
This technique greatly reduces lag spikes a user will experience from loading chunks.

If a work state is completed early, the system will move on to the next work state without waiting for the full-frame count.

For any given frame, only process one of three work states:
```cs
// Do the required work for this frame
ProcessChunks();

// If the current "work state" is still being processed, do not move to the next work state
if (!ProcessingChunks())
{ 
  // Move on to the next "work state" for next frame
  _workState = _workState switch {
    WORK_STATE.FILL => WORK_STATE.MARCH, // Generate/Load/Populate chunk with data
    WORK_STATE.MARCH => WORK_STATE.MESH, // Cube march the chunk
    WORK_STATE.MESH => WORK_STATE.FILL,  // Generate the chunk's mesh
    _ => _workState
  };
}
```

It should be noted that, despite this optimization being applied, the nature of this game requires some chunks to be processed immediately. For example, if a player deforms/destroys part of the terrain, the changed chunks must be processed immediately as to not produce visual lag to the user. These chunks are "fast-forwarded" through this system and are processed within one frame.

#### Cross-Frame Work
Key Terms:
- **Processing Spike**: A period of higher stress on the CPU, often causing visual lag/"jumps" to the user.

In general, each work stage will take a maximum of three frames. This technique gives jobs the ability to span across multiple frames, if needed, causing processing spikes on the CPU to "average out".  


#### Maximizing Usage & Throttling
Key Terms:
- **Job's Average Processing Requirements**: The amount of work/time a given job takes/requires when being processed by the CPU. Generally, this is a rough estimate.

As with the previously mentioned techniques, it is important to maximize usage of the CPU while also not overloading it. Given a set of chunks to be processed, instead of computing all of them in one go, breaking up that set into batches based on CPU speed / CPU core count / a job's average processing requirements is a good way to determine how many chunks to process in one complete work state loop.

This optimization technique is most effective when the user loads _many_ chunks at once, such as when they first load the world.


#### Priority Queueing
Key Terms:
- **High Priority Chunk Request**: A chunk that needs to be processed by the end of the _current_ frame.
- **Low Priority Chunk Request**: A chunk that needs to be processed as fast as possible, with minimal lag.

Deciding which chunks should be processed first was briefly mentioned above with fast-forwarding, but it is, in reality, more complicated. 

Once a chunk is requested (either high or low priority), the system then sorts it into a queue based on current queued chunk priorities and will update priorities each frame, as needed.

The following is a general set of rules we followed when implementing chunk processing priority queueing:
- High priority chunks:
  - No need to sort these requested chunks as they are _all_ processing that frame.
  - Always pulled from the queue by the system _before_ low priority chunks
- Low priority chunks:
  - Sorted by a weight which is usually the squared distance to the player as these chunks usually come from chunk loading
  - Pulled from the queue by the system when there are not enough high priority chunks to process

The following code reflects these set of rules:
```cs
// Grab high priority chunks (processed this frame)
while (_chunksToRegenerate.HighPriorityCount > 0)
  // Grab any high priority chunk
  _chunksToRegeneratePriorityBatch.Add(_chunksToRegenerate.Pop());

// If at the start of a new work state loop
if (_workState == WORK_STATE.FILL)
  // While there is still space to fill for the max job count - high priority chunk count
  while (_chunksToRegenerateBatch.Count < _maxJobCount && _chunksToRegenerate.LowPriorityCount > 0)
    // Pop the next item from the priority queue, sorted by distance to player
    _chunksToRegenerateBatch.Add(_chunksToRegenerate.Pop());
```

A rough example of 2D priority queueing, a cross-section of the 3D chunk loaded cube, is demonstrated as an interactive demo below. Move your cursor around to see which chunks have priority to be loaded relative to your cursor.

**Note:** This demo's source code does not reflect the project's implementation. It is purely for a visual understanding of the concept.

<p align="center">
<iframe class="child" src="https://www.openprocessing.org/sketch/1052217/embed/"></iframe>
</p>


The maximum number of chunks a three-stage loop can process is given by the following:  
`Max(Number Of High Priority Chunk Count, Number Of Reasonable Chunks Per Stage Loop)`  
That is to say that high priority chunks are always processed with low priority chunks filling in any free slots.

Using a priority queue and updating weights as needed, you get responsive chunk loading that can adapt quickly to, for example, changes in player position:

<p align="center">
<video playsinline autoplay loop muted controls class="desktop-70-mobile-100">
  <source src="/images/TerrainChunkPriorityLoading.webm" type="video/webm">
  Your browser does not support the video tag.
</video>
</p>

Once applying a similar technique to chunk unloading, you get fluid and responsive terrain.
<p align="center">
<video playsinline autoplay loop muted controls class="desktop-70-mobile-100">
  <source src="/images/TerrainChunkPriorityLoadingUnloading.webm" type="video/webm">
  Your browser does not support the video tag.
</video>
</p>


#### Level Of Detail (LOD)

Key Terms:
- **Level of Detail**: Also known as LOD, it is the amount (level) of data (detail) you are choosing to display to the user. This is often used on far-away objects since it is the same to the user visually but faster to compute. 

Given our grid-based voxel terrain, LOD was trivial to implement on a basic level. Since our chunks are 16x16x16, LOD can be a power of two to reduce the amount of data that needs to be computed/rendered out of this chunk. 

As a simple example, take the following 2D grid of 16 voxels, 17 nodes:

**Key:**
- **Purple Circles**: Density data nodes.
- **Black Squares**: Voxels generated from corner nodes.

<table width="100%">
  <tr>
    <th>LOD of 1:</th>
    <th>LOD of 2:</th> 
    <th>LOD of 4:</th>
  </tr>
  <tr>
    <td><img src="/images/CubeMarchingLOD1.png" alt="Cube Marching LOD 1" width="100%"/></td>
    <td><img src="/images/CubeMarchingLOD2.png" alt="Cube Marching LOD 2" width="100%"/></td>
    <td><img src="/images/CubeMarchingLOD4.png" alt="Cube Marching LOD 4" width="100%"/></td>
  </tr>
</table>

As can be seen, voxels sample from fewer nodes, but are scaled to take up the same amount of space.

The LOD gradients shown below demonstrate this logic applied to the terrain.

<table width="100%">
  <tr>
    <th>Smooth Sphere LOD Gradient:</th>
    <th>Noisy Sphere LOD Gradient</th>
  </tr>
  <tr>
    <td><img src="/images/LODSmoothSphere.png" alt="Smooth Sphere LOD Gradient:" width="500px"/></td>
    <td><img src="/images/LODNoisySphere.png" alt="Noisy Sphere LOD Gradient" width="500px"/></td>
  </tr>
</table>


Despite promising results, you would need to apply an algorithm similar to [TransVoxel](https://transvoxel.org/) to implement a more sophisticated solution that doesn't generate holes between differing LOD levels. As of currently, we do not implement this algorithm.

<!--
TODO:
- Resource collection
-->

## Terrain Features
### Terrain / Voxel Manipulation

When we manipulate our voxel terrain, we alter the density values in an area of influence.
In our game, we use a spherical brush to accomplish this, resulting in spherical cutouts of the terrain at the target area.

<p align="center">
<video playsinline autoplay loop muted controls class="desktop-70-mobile-100">
  <source src="/images/VoxelManipulation.webm" type="video/webm">
  Your browser does not support the video tag.
</video>
</p>

In the example above, you can see both additive and subtractive operations. Thankfully, these translate straightforwardly to adding and subtracting from the density values in our target area. 

Below is an interactive demo of the logic functioning in a 2D variant. Mouse over the area to subtract or add from a given area, altering the terrain. These values are either 1 or -1, representing a filled or unfilled area, respectively. As there is no gradient, this will result in unsmooth terrain.

Click the left mouse button to toggle addition/subtraction.

<p align="center"><iframe class="child" src="https://www.openprocessing.org/sketch/1051758/embed/" width="500vh" height="700vh"></iframe></p>


### Editor Mode

Procedural generation is typically executed at runtime. In other words, our voxel terrain would only be visible upon launching the game into Play Mode.
However, this is problematic in the case where we would like to edit our scene. How would determine where to place a sign sticking out of the ground, or a treasure chest?
We'd need a way to edit the scene with the world already constructed. Our solution is editor-time world loading.  

By using proximity loading of our chunks as found at runtime, we may move the player around in the scene to load whichever portion is needed to us.

<p align="center">
<video playsinline autoplay loop muted controls class="desktop-70-mobile-100">
  <source src="/images/EditorMode.webm" type="video/webm">
  Your browser does not support the video tag.
</video>
</p>

We track the current state of the Unity editor to determine when to dispose of the memory or create it anew.
Entering play mode or edit mode will reconstruct the necessary memory for the voxel terrain.



<!--
# Final Notes
***TODO***
~~In conclusion, this project produced an impressive and responsive terrain that makes for great gameplay.~~
~~In conclusion, the signal disruptor is an award-winning board~~



## Further Implementations
- Hot-loading
- 
-->


<!---
# ---- OTHER: ----
## Spherical

# EXTRA
## Process of Creating a Chunk



Once a chunk entity is created and its position is assigned, it will enter the system chain to be processed in the following order 

## Data Generation
## Cube Marching
### Solution Lookup
### Smoothing
## Mesh Generation
The process of mesh generation is split into three steps:
1) **Create Chunk Mesh**: Create the mesh object, and copy the data to the new mesh
1) **Bake Chunk Mesh**: Bake the mesh using Unity\'s `Physics.BakeMesh`
1) **Set Chunk Mesh**: Create a GameObject, and assign it the new mesh.
The reason mesh generation is split into three distinct steps is due to the inability of steps #1 & #3 to be parallelized with burst compilation, while step #2 can be.
###Creating the Chunk\'s Mesh
This step simply creates the mesh and copies the data from the `IBufferElementData` components to the new mesh.

This is done without burst and sequentially - due to Unity\'s `Mesh` being non-blittable.
### Baking the Chunk\'s Mesh
### Setting the Chunk\'s Mesh
## Live Editing With Unity Atoms
## Post Mortem

- Burst-Compiled Unity Jobs
- Chunk Loading
- Marching Cubes
- Unity Atoms
---
**NOTE**
The cost of using components as flags is not insignificant! The trade-off is knowing what stage any given chunk is at for debugging.
---
## Post Mortem
## Unity ECS
### Setup
To utilize the speed of Unity\'s provided ECS, chunks were entities that consist of data components and their associated GameObject to store + render the mesh. Along the way, they also get tagged/untagged with "Flag" components to tell the next system to operate on them.
The ECS chunk, after processing, would contain the following component data:
![Chunk Components](/images/ChunkComponents.png)

### Why It Didn't Work 
After all the work setting up systems, components, and way more, it seemed like the team was constantly fighting Unity ECS to make it fit our needs. System order was impossible to configure, command buffers wouldn't execute on the frames we needed, adding and removing components correctly was complex to manage, and what could run within a system was very restrictive.

Despite this, these problems were not the deal-breaker. Even if all these problems were alleviated, we needed all these systems to process chunk entities within one frame. When the player deforms the terrain, the "frame rate of deformation" should run at the same rate as the rest of the game. This was not the case when the systems ran across multiple frames as the deformation would run at a perceived FPS of Frame-Rate / System-Frame-Count and would look choppy.

### The Fix
Luckily, systems are very similar to Unity's job system which allowed up to transfer over easily.
-->