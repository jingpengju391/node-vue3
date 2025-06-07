# Minimum required version of CMake
cmake_minimum_required(VERSION 3.22)

# Define the project name
project(yolov8)

# Set the C++ standard to C++17
set(CMAKE_CXX_STANDARD 17)

# Set the build type (Options: None, Debug, Release, RelWithDebInfo, MinSizeRel)
set(CMAKE_BUILD_TYPE Release)

# Define compiler flags for Debug and Release builds
# The `-Wno-unused-parameter` suppresses warnings about unused function parameters
# The `-O3` flag enables maximum optimization
# The `-g` flag includes debugging symbols
# The `-Wall` flag enables all common warnings
SET(CMAKE_CXX_FLAGS_DEBUG "$ENV{CXXFLAGS} -Wno-unused-parameter -O3 -g -Wall")
SET(CMAKE_CXX_FLAGS_RELEASE "$ENV{CXXFLAGS}  -Wno-unused-parameter -O3 -g -Wall")

# Include directories for header files
include_directories(include)

# Add the 'utils' subdirectory, which contains additional source files and CMake configurations
add_subdirectory(utils)

# Find and include OpenCV library
find_package(OpenCV REQUIRED)
include_directories(${OpenCV_INCLUDE_DIRS})

# Find required external libraries
find_package(kaylordut REQUIRED)
find_package(bytetrack REQUIRED)

# Define the 'videofile_demo' executable and link necessary libraries
add_executable(videofile_demo videofile_demo.cpp)
target_link_libraries(videofile_demo ${kaylordut_LIBS} ${OpenCV_LIBS} yolov8-kaylordut ${bytetrack_LIBS})

# Define the 'camera_demo' executable and link necessary libraries
add_executable(camera_demo camera_demo.cpp)
target_link_libraries(camera_demo ${kaylordut_LIBS} ${OpenCV_LIBS} yolov8-kaylordut ${bytetrack_LIBS})

# Define the 'imagefile_demo' executable and link necessary libraries
add_executable(imagefile_demo imagefile_demo.cpp)
target_link_libraries(imagefile_demo ${kaylordut_LIBS} ${OpenCV_LIBS} yolov8-kaylordut ${bytetrack_LIBS})
