#!/bin/bash

# Create the 'build' directory if it does not exist
mkdir -p build

# Change to the 'build' directory
cd build

# Run CMake to configure the project
# -DCMAKE_TOOLCHAIN_FILE: Specifies the toolchain file for cross-compilation
# -DCMAKE_BUILD_TYPE=Release: Sets the build type to "Release" for optimized performance
cmake -DCMAKE_TOOLCHAIN_FILE=/root/tmp/rk3588_dev_rootfs/toolchain-aarch64.cmake -DCMAKE_BUILD_TYPE=Release ../tasks

# Compile the project using 'make'
make
