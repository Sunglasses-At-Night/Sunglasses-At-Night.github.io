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
- **[ImGui](https://github.com/ocornut/imgui) Engine GUI generation using RTTR**
- Designing archetypes for entities

In addition, I worked on the game as well
- Visual effects
- Post processing effects
- Player feedback

And things outside of the engine
- Configuring a student Azure VM to build our game on every push
  - CI / CD
- Configuring a student Amazon Web Service (AWS) VM to automatically sync the school's git repo to our internal private git server
- Tracked and scoped technical tasks as part of co-producer work and making sure everyone's workflow was smooth

Today I'll be talking about what I designed for integrating **JSON serialization** as well as **automatically generating [ImGui](https://github.com/ocornut/imgui) GUIS** for our datatypes. While I will be describing a simplified version of what I did, I'm omitting long talks into the many mistakes I've made in the game and will just point them out from time ti time. **I hope this will be useful for people trying to thread on the same path I did.**
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
Reflection is the ability to inspect, modify, and call methods at runtime. Imagine being able to inspect your type of object, and getting information about it.


![MyStruct](/images/Reflection-Serializer/CPPStruct.png)

Essentially, you can get a MyStructType that describes "Hey I have a string name, an int data, a float bigNumber, and two methods. My name is 'MyStruct'".

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

# Goals and Constraints
For the serializer to function, I constructed the system with several things in mind.
- Entity archetype saving and loading to Json
- Abstracted from gameplay programmers
  - Scripts don't have to care about serializing
- Json file is readable to humans
  - Designer can modify from json file

- As a constraint, I 


> Learning point:
The above seems good right? This was actually a **bad** set of goals. One major thing I overlooked was **saving and loading from a scene**. I also screwed up thinking that the **designer modifying from the json file** is a good thing. You want a tool for that instead.

For the GUI reflection...
- Abstracted from gameplay programmers
  - Scripts don't have to create their own GUI widgets
  - Programmers only need to register their scripts with RTTR to benefit from the GUI

> Learning point: Keeping features small and simple is good. Having too many goals complicates your feature and spaghetti starts happening.

# Implementation

I started working on the json integration first as I wanted to fullfill the Course's requirement on serialization first, and then do the reflection and GUI as an add on.

> Learning point: In hindsight, in the shortterm this was the right decision, but in the long term a bad one. Anyone can see once laid out that I should have worked with RTTR first, and then wrote the serializer and gui generator with it as a dependancy. Because of this mistake, I was straddled with legacy code that I had to write around.

## Serializer 1.0
The following is the diagram describing the serializer.

![Mind map of serializer](/images/Reflection-Serializer/serializermap.png)



At 1.0, the goal was to get serialization working ASAP and getting past the grading requirments for it. I used the simplest method I know.

```c++
// Sample object
struct Vector3{
    float x, y, z;
    JSON Serialize() const
    {
        JSON j;
        j["x"] = x;
        j["y"] = y;
        j["z"] = z;
        return j;
    }
    static Vector3 Deserialize(JSON& json)
    {
        Vector3 vec;
        vec.x = json["x"];
        vec.y = json["y"];
        vec.z = json["z"];
        return vec;
    }
}

class Serializer{
    public:
    template<typename T>
    JSON SerializeToJSON(const T& obj)
    {
        return obj.Serialize();
    }
    template<typename T>
    T DeserializeFromJSON(JSON& json)
    {
        return T::Deserialize(json);
    }
}

// somewhere in code
Vector3 dir = {0,0,0};
JSON j = Serializer::SerializeToJSON(dir);
save_to_file(j, "dir.json")
```
There were mainly two ways I saw to go with this

1) Use a template like what I am doing and call Serialize(). If T doesn't have this method compilation will fail.
2) All types inherit ISerializble, and then use polymorphism.

I went with option 1) because we were using glm::vec3 types and did not want to write an abstraction layer over them. Virtual functions also cause a cache miss, so I didn't want to lose out on performance.

>Learning Point: The cache miss point was totally irrelevant. It would never have mattered since the perf I saved was so small. Furthermore, a bunch of these small code and legacy Json files became a massive headache later on development when I refused to just delete them. I should have called a team meeting and insist on removing the legacy code and data instead of putting two different architechture types together

>Pondering Point: Should I have written an abstraction over glm (math library)? Common practice lean towards writing abstractions over every library you import, but a lot of glm functions only work because they expect glm functions. Writing our own abstraction just meant writing boilerplate code over the glm ones, and that seemed like a waste of time since we don't plan on using another math library.

## Serializer 2.0

You may notice that the serializer 1.0 *does nothing*. It only gives ensures common interface of T (to have a method called Serialize()).
Currently the object is responsibly for *how* it serializes itself, what we want is for the *serializer* to be responsible for that.

<// Draw image here with to describe idea>

I'll now walk through a simplified version of my Serializer 2.0 and explain the thought process behind it. 

There are 4 main ideas crucial to bringing the initial algorithm together.
1) Deconstructing a user-defined data type
2) Understanding how things should be on the JSON side
3) Dealing with pointers, data structures, and containers

And after that I had to modify the algorithm to work with RTTR library. Lets drive right in.

### Deconstructing a user-defined data type
Every type in C++ can be deconstructed to its fundamental types of int, char, pointer, etc.

```c++
struct InnerClass
{
    int data;
    float floatdata;
}

struct OuterClass
{
    InnerClass innerClass;
    const char * c_string;
}
////////////////////////////////////
// Outerclass can be deconstructed into
OuterClass
{
    int data;
    float floatdata;
    const char* c_string;
}
```

So the plan is to deconstruct a type *as much as possible*. Hence the general algorithm I used is

```py
# version 1
def Serialize(obj):
    if obj is a basic type
        serialize data as one of the basic types
    else
        for each property on obj:
            Serialize(property)
```

Seems simple for now! Notice that I passed over what it means to be a basic type. While we understand in C++ those data types, what are the fundamental basic types in JSON? 

### Examining the JSON side
Json has five data types

1) Number
   - No distinction between floats and ints and unsigned etc
2) String
3) Boolean
4) Array
5) Object
   - Collection of name-value pairs
6) null
   - empty

Given these data types, it makes sense to store C++ user defined types as objects, and they would in turn recursively store things until its either 

1. A number
2. A string
3. A boolean
4. Or an array

I used the property name as the key, and the object itself as the value. This seemed most intuitive. You might notice that 'A number' doesn't describe the wide range of data types that can represent a number in C++. Thankfully, most JSON libraries can handle this. Thus when serialized OuterClass would look like 

```json
{
    "OuterClass" : {
        "innerClass" : {
            "data" : 0,
            "floatdata": 0.0
        },
        "c_string" : "cstring"
    }
}
```



> Learning Point: Another mistake I feel like I made is attempting to fit the algorithm I was making **to a given output**. I learned that when it comes to this, its better to let the algorithm do its job, **THEN** examine the outcome. The reason is that deserialization becomes far easier when your algorithm is not filled with edge cases that you smashed in to fit your output.


Take note that this was the *final* output that I have decided on. During the course of developement, there were three different outputs that I tried, and I finally settled on keeping the algorithm clean instead.

```py
# Version 2
# Kickoff function
def Serialize(obj, name):
    JSON jsonObj
    SerializeRecur(obj, jsonObj[name])
    return jsonObj

# Arg0: object we want to serialize
# Arg1: json object to add onto
def SerializeRecur(obj, jsonObj):
    if obj is a basic type
        SerializeBasicType(obj, jsonObj[obj.name()])
    else
        for each property on obj:
            SerializeRecur(property, jsonObj[property.name()])

// Possible usage
Outerclass outerClass
Serialize(outerClass, "OuterClass") 
```
>The mentioned three different versions of output became a long lasting pain. I could never easily refactor my code without totally busting the previous versions. In hindsight, I should have gotten rid of them ASAP and swapped to the newer versions. Also, I should have given my Json files a version number to keep track of which version of the loader I was using. That way I could have kept my code clean instead of integrating them all into Frankenstien. 

### Dealing with C++'ness' issues
I've explained the very high level general algorithm of deconstructing a C++ type into its base type, and how I translated that into JSON file. When it comes to the dirt though, there are lots of weird C++ issues to deal with, and I'm glad I used RTTR as a library instead of writing my own reflection system to deal with them.

This part really consists of deconstructing what it means to be a *fundamental type in the context of serialization*. 

#### Dealing with polymorphism
Heres an example of some very reasonable code that would break our current algorithm.

```c++
struct Base { RTTR_ENABLE() };
struct Middle : Base { RTTR_ENABLE(Base) };
struct Derived : Middle { RTTR_ENABLE(Middle) };

struct Foo { Base* bar = nullptr;};

Foo foo;
Derived derived;

foo.bar = &derived;
// How do we serialize Derived when we have a pointer to Bar?
```
Polymorphism! And pointers! Pointers are a base data type, how do we deal with it? On the topic of pointers, what if it was a *shared* pointer? 

```c++
struct Foo {std::shared_ptr<Derived> ptr;}

Foo foo;
std::shared_ptr<Derived> instance = std::make_shared<Derived>();
foo.ptr = instance;
// How do we deal with this??
```
> At the start of the project, we were avoiding shared pointers because we were not doing multithreading and did not think we would need to manage our objects. This turns out to be completely false assumption when we realized our game code had behavior that references other behaviors. This caching became a classic dangling pointer problem. We only noticed this problem a quater of the way through the project, and decided to convert to smart pointers rather then deal with implementing some sort wrapper that acheived the same thing but specific to our engine. There was also a discussion about getting all the references every frame, but that was thrown out once we realized some behaviors *needed* references, like AIs need to know player and the search isn't cheap.

So lets revisit our high level algorithm, and modify it. We need to deal with getting, as RTTR defines it, the *raw type* of our object. A raw type is a type *without any qualifiers* (const, volatile, etc) nor any pointer.
After that, we need to detect if it is a shared_ptr, or something that wraps a value. Luckily, RTTR provides [functionality](https://www.rttr.org/doc/master/classrttr_1_1type.html#ad17345a59c8e3cc8a754eb4ec124581e) that detects if a type is a wrapper type. 

As for getting the derived type of a pointer, RTTR deals with that for us with [get_derived_type()](https://www.rttr.org/doc/master/classrttr_1_1instance.html#ab30381b954f8d8abc2da9c5162fb130d).

I'll also swap the pseudocode for checking base type for an rttr function [is_class()](https://www.rttr.org/doc/master/classrttr_1_1type.html#a8bd100682c9b846f6da1c5c9fb96f8c6).

```py
# Version 3
# Here I'm working in psuedo code with RTTR API

# Kickstart function
def Serialize(obj, name):
    JSON jsonObj
    SerializeRecur(obj, jsonObj[name])
    return jsonObj

# Arg0: object we want to serialize
# Arg1: json object to add onto
def SerializeRecur(obj, jsonObj):
    # If object is a fundemental C++ type, we'll go straight to writing it
    if not obj.is_class()
        SerializeBasic(obj, jsonObj)

    else
        # Get the type of the object if it is a wrapper
        if obj.type.get_raw_type().is_wrapper()
            localObj = obj.get_wrapped_instance()
        else
            localObj = obj

        # Deal with pointer issues by going to the derived class
        derivedType = localObj.get_derived_type()
        # Get property list from the derived type
        var property_list = derivedType.get_properties()

        # Iterate through the property list
        for var property in property_list
            # Get the value of the property
            rttr::variant property_value = property.get_value(localObj)
            # Keep serializing them based on property name
            SerializeRecur(property_value, jsonObj[property.name()])


// Possible usage
Outerclass outerClass
Serialize(outerClass, "OuterClass") 
```

### Dealing with arrays and data structures
Some very useful data structures that we want to serialize are arrays, vectors, and C++ maps (ordered or unordered). Thankfully they have pretty 1 : 1 conversions to JSON data.
- C++ Arrays <-> JSON Arrays
- C++ Vectors <-> JSON Arrays
- C++ Maps <-> JSON Objects

Even better, RTTR has two methods of identifying containers that cover your STL data containers. [is_associative_container()](https://www.rttr.org/doc/master/classrttr_1_1variant.html#aabe380968e1d9fcd27a2f3e77728b197) and [is_sequential_container()](https://www.rttr.org/doc/master/classrttr_1_1variant.html#a2d584cf950f15d1a52469b5f042488a3). [Associative containers](https://en.wikipedia.org/wiki/Associative_containers) are like maps, you map one thing to another. [Sequential containers](https://en.wikipedia.org/wiki/Sequence_container_(C%2B%2B)) are containers with memories laid out contigiously, like vectors and arrays. According to wikipedia, the current C++ data structures are below.
- Sequential Container
  - Array
  - Vector
  - List
  - Forward_list
  - Deque
- Associative Container
  - Set
  - Map
  - Multiset
  - Multismap
And so we will have
- C++ Array <-> Sequential Container <-> JSON Array
- C++ Vector <-> Sequential Container <-> JSON Array
- C++ Maps <-> Associative Container <-> JSON Objects
- C++ Hash Maps (Unordered_*) <-> Associative Container <-> JSON Objects

Which simplifies to
- Sequential Container <-> JSON Array
- Associative Container <-> JSON Objects

So we will identify if the type of the object is sequential or associative, and if they are we will handle them.
```py
# Version 4
# Here I'm working in psuedo code with RTTR API

# Kickstart function
def Serialize(obj, name):
    JSON jsonObj
    Serialize(obj, jsonObj[name])
    return jsonObj

# Arg0: object we want to serialize
# Arg1: json object to add onto
def SerializeRecur(obj, jsonObj):
    # If object is a fundemental C++ type, we'll go straight to writing it
    if not obj.is_class()
        SerializeBasic(obj, jsonObj)
    else if obj.is_associative_container()
        SerializeAssociativeContainer(obj, jsonObj)
    else if obj.is_sequential_container()
        SerializeSequentialContainer(obj, jsonObj)
    else
        # Get the type of the object if it is a wrapper
        if obj.type.get_raw_type().is_wrapper()
            localObj = obj.get_wrapped_instance()
        else
            localObj = obj

        # Deal with pointer issues by going to the derived class
        derivedType = localObj.get_derived_type()
        # Get property list from the derived type
        var property_list = derivedType.get_properties()

        # Iterate through the property list
        for var property in property_list
            # Get the value of the property
            rttr::variant property_value = property.get_value(localObj)
            # Keep serializing them based on property name
            SerializeRecur(property_value, jsonObj[property.name()])


// Possible usage
Outerclass outerClass
Serialize(outerClass, "OuterClass") 
```
#### Sequential Container Seriailization 
After detecting whether it is an associative or a sequential container, we have to decide how to serialize it. We'll start with sequential since thats the simplest. Since sequential maps to Json arrays 1 to 1, this was pretty simple.

```py
def WriteArray(obj, jsonObj):
    jsonObj.WriteJsonArray()

    for each item in obj, and counter start from 0:
        WriteVariant(item, writer[counter])
        counter += 1
```

```json
{
    "array" : [
        a,
        b,
        c
    ],
}
```
#### Associative Container
This one is a *bit* more complicated. We want to store both key and value, and we know our object will have multiple key and value. So lets use a json array to indicate all the key-pair values as json objects. 

```py
def WriteAssociative(obj, jsonObj):
    jsonObj.WriteJsonArray()

    for each item in obj, and counter start from 0:
        WriteVariant(item.first, writer[i]["Key"])
        WriteVariant(item.second, writer[i]["Value"])
```
and we're expecting something like this.
```json
    "dictionary" : [
        {
            "key": "red",
            "value": {
                "x": 5,
                "y": 6
            }
        },
        {
            "key": "green",
            "value": {
                "x": 1,
                "y": 2
            }
        },
    ]
```


### Wrangling RTTR
It was hard working with a library where I had no idea how it internally works. Let me explain some of the main concepts of RTTR that I had trouble understanding at first. This section will detail mainly how I coded the above psuedocodes in a C++ manner.

- [Instance](https://www.rttr.org/doc/master/classrttr_1_1instance.html)
  - Holds a reference to the given object.
  - Think of it as a std::any<T&>
- [Variant](https://www.rttr.org/doc/master/register_variant_page.html)
  - Return value for properties and methods
  - Content is ***copied*** over to new instance of content
  - Think of it as a std::any<T>
- [Properties](https://www.rttr.org/doc/master/register_properties_page.html)
  - Pretty straight forward
- [Policies](https://www.rttr.org/doc/master/register_policies_page.html)
  - Control how RTTR creates your object
  - This matters when the code starts running too slow
  
> One of the weirder things about the RTTR library is how *different* and how *little* an instance provides over a variant. I would expect an instance to have just as much to offer as a variant in terms of interface. It seems strange that I would need to copy an object anytime I wanted to query more information on it.

> Also this sets a constraint that you need to use assignment operators for whatever you're serializing. And default constructors for compatibility with sequential and associative containers.

With those in mind, lets get to writing actual C++ code and we'll start with registering our class with RTTR
#### Registration
This part is pretty straightforward, do it in the CPP with a couple of macros from RTTR. Here, we register InnerClass with properties innerClass and c_string. After that we register InnerClass with data and floatdata.
```c++
RTTR_REGISTRATION
{
	using namespace rttr;
	registration::class_<InnerClass>("InnerClass")
		.constructor<>()
		(
			rttr::policy::ctor::as_raw_ptr // Construct as raw pointer instead of shared for simplicity's sake
		)
		.property("data", &InnerClass::data)
		.property("floatdata", &InnerClass::floatdata)
	;

    registration::class_<OuterClass>("OuterClass")
		.constructor<>()
		(
			rttr::policy::ctor::as_raw_ptr // Construct as raw pointer instead of shared for simplicity's sake
		)
		.property("innerClass", &OuterClass::innerClass)
		.property("c_string", &OuterClass::c_string)
	;
}

```
#### Writing the serialization code
Lets begin by taking in a name and a instance (reference) of the object.

```c++
// Kickstart function
JSON ToJson(rttr::instance obj, const std::string& name)
{
    JSON writer;
    ToJSonRecur(obj, writer[name]);
    return writer;
}
```

##### Improvements to fundemental type detection
I was stuck here for a long time figuring out how wrangle the conversions between instances and variants and serialization. In the end, I implemented a function dedicated to writing variants, and then another function for writing basic types. Both of these work with a "white list"; that is if the function detects it cannot be serialized and return false.



Lets take a look at the recursive function from before.
```c++
// !Passing something that isn't supposed to be written as a Json Object will have issues
void ToJsonRecur(rttr::instance obj, JSON& writer)
{
    if(WriteFundamentalType(obj, writer))
    rttr::instance localObj;
    // Get the type of the object if it is a wrapper
    if(obj.get_type().get_raw_type().is_wrapper())
        localObj = obj.get_wrapped_instance();
    else
        localObj = obj;

    // Get the property list while dealing with polymorphism derived type
    auto prop_list = obj.get_derived_type().get_properties();
    
    // Iterate through the property list
    for (auto prop : prop_list)
    {
        // Get the value of the property
        rttr::variant prop_value = prop.get_value(obj);
        if (!prop_value)
            continue; // cannot serialize, because we cannot retrieve the value
        // Get the name of the property
        const auto name = prop.get_name();
        // Attempt to write the variant
        if (!VariantSerializer(prop_value, writer[name.data()]))
        {
            std::cerr << "cannot serialize property: " << name << std::endl;
        }
    }
}

// Example use case
OuterClass foo;
JSON writer;
ToJsonRecur(foo, "foo", writer);
```
The biggest difference is the use of rttr::instance as the object. This was chosen for the simple interface given. For some weird reason I **could not** convert an instance to a variant. It might make more sense to pass in a variant in that sense since variants have more functionality, but its also a copy which can be expensive. 

This choice removed the possibility of checking whether the instance is a fundamental type, and all the checking for the the maps before we split it up. This actually helped writing the code in a certain way because I could seperate the code more clearly from an RTTR perspective.

A second issue that came up was how to abstract the fundamental type seriailization detection out. In the end, I opted for a function that will attempt to serialize the object as a fundamental type, and if it fails it will return false. We will then test if it is any of the data containers, and then check how many properties the object has. If there it has  properties, then we can serialize it as a jsonObj.

So the plan is to deal with each RTTR abstraction at each level appropriately.
![The new plan](/images/Reflection-Serializer/serialize_new_plan.png)

And a fleshed out detail of the plan is on this image.   

![The new plan with detail](/images/Reflection-Serializer/serialize_detail.png)

With the new algorithm, WriteVariant() is the crux of it all. It attempts to write the object, and if it can't have several fallbacks, and at the end of it will either return true or fail. Failing means a case we haven't dealt with yet(pointers for example).

Another side-effect of this version of the algorithm is that we can only kick off the serialization function if the object we're passing in has properties. Meaning the type has to be a jsonObj. However, we can easily use WriteVariant() as the entry point if required.

#### C++ code
Headed back to the code, lets show the changed toJsonRecur().

```c++
void toJsonRecursive(const instance& obj, json& writer)
{
    // Dealing with wrapped objects
    instance localObj;
    if(obj.get_type().get_raw_type().is_wrapper())
        localObj = obj.get_wrapped_instance()
    else
        localObj = obj;
    // Handling pointer polymorphism cases
    auto prop_list = obj2.get_derived_type().get_properties();
    for (auto prop : prop_list)
    {
        // Retrieving value from property
        variant prop_value = prop.get_value(obj2);
        if (!prop_value)
            continue; // cannot serialize, because we cannot retrieve the value
        // Retrieve name of property
        const auto name = prop.get_name();
        // Serialize value of property using name
        if (!WriteVariant(prop_value, writer[name.data()]))
        {
            std::cerr << "Failed to serialize" << name << std::endl;
        }
    }
}
```

Pretty much the same thing as the initial algorithm, except without all the checking. The checking has now moved to WriteVariant(), and here is the crux of the algorithm.

```c++
bool WriteVariant(const variant& var, json& writer)
{
    // Deal with wrapped type
    variant localVar = var;
    type varType = var.get_type();
    if(varType.is_wrapper())
    {
        varType = varType.get_wrapped_type();
        localVar = localVar.extract_wrapped_value();
    }

    if (AttemptWriteFundementalType(varType, localVar, writer))
    {
        // Successful write!
    }
    // If its not a fundamental, is it a sequential?
    else if (var.is_sequential_container())
    {
        WriteArray(var.create_sequential_view(), writer);
    }
    // Is it associative
    else if (var.is_associative_container())
    {
        WriteAssociativeContainer(var.create_associative_view(), writer);
    }
    else
    {
        // Not a fundemental, or a container. Check if its an object
        auto child_props = varType.get_properties();
        if (!child_props.empty())
        {
            // We have properties, thus we can be serialized as an object
            toJsonRecursive(var, writer);
        }
        else
        {
            // Assert
            // Some unknown type that is not a fundamental, has no properties, and is not a data structure
            // Probably some registration issue
            // Or its a pointer! I handled pointers in here my game code
            assert("Unknown RTTR serilization edge case that we haven't discovered");
            return false;
        }
    }

    return true;
}
```
I moved the data container checking and writing of fundamental types here. Pretty self-explanatory stuff here. The only thing really worth mentioning is that I had to create a *_container view to view the container for WriteArray() and WriteAssociativeContainer().

Now lets take a look at the writing of fundamental types. One benefit here is that if we have more fundamental types to handle we can just put it in this function.

```c++
bool AttemptWriteFundementalType(const type& t, const variant& var, json& writer)
{
    // Json Number
    if (t.is_arithmetic())
    {
        if (t == type::get<bool>())
            writer = var.to_bool();
        else if (t == type::get<char>())
            writer = var.to_bool();
        else if (t == type::get<int>())
            writer = var.to_int();
        else if (t == type::get<uint64_t>())
            writer = var.to_uint64();
        else if (t == type::get<float>())
            writer = var.to_double();
        else if (t == type::get<double>())
            writer = var.to_double();
        return true;
    }
    // Enumeration as string
    else if (t.is_enumeration())
    {
        bool ok = false;
        // Attempt to serialize as string
        auto result = var.to_string(&ok);
        if (ok)
        {
            writer = var.to_string();
        }
        else
        {
            // Attempt to serialize as number
            auto value = var.to_uint64(&ok);
            if (ok)
                writer = uint64_t(value);
            else
                writer = nullptr;
        }

        return true;
    }
    // Strings!
    else if (t == type::get<std::string>())
    {
        writer = var.to_string();
        return true;
    }

    // Not a fundamental type we know how to process
    return false;
}
```
Notice that this function doesn't expect itself to handle all sorts of weird stuff like pointers, wrappers, or anything like that. Its very much a **"If you have these I will serialize it. If not then good bye."**

As for the associative and sequential containers:
```c++
static void WriteArray(const variant_sequential_view& view, json& writer)
{
    // Init array
    writer = json::array();
    int i = 0;
    for (const auto& item : view)
    {
        WriteVariant(item, writer[i]);
        i++;
    }
}

static void WriteAssociativeContainer(const variant_associative_view& view, json& writer)
{
    static const string_view key_name("key");
    static const string_view value_name("value");

    writer = json::array();
    int i = 0;
    // Dealing with keys = values containers like sets
    if (view.is_key_only_type())
    {
        for (auto& item : view)
        {
            WriteVariant(item.first, writer[i]);
            i++;
        }
    }
    else
    {
        for (auto& item : view)
        {
            WriteVariant(item.first, writer[i][key_name.data()]);
            WriteVariant(item.second, writer[i][value_name.data()]);
            i++;
        }
    }
}
```

And that ends the explanation for writing serialization with Json! I did not come up with the entire thing myself; I had to do quite a lot of research and looking up and seeing other people's code before coming to this solution.


