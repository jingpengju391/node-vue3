# Specify the target system name and processor architecture
set(CMAKE_SYSTEM_NAME Linux)
set(CMAKE_SYSTEM_PROCESSOR aarch64)

# Set the CMAKE_MAKE_PROGRAM if needed
# set(CMAKE_MAKE_PROGRAM /usr/bin/make)

# Specify the cross-compiler (replace with the actual path of your cross-compilation toolchain)
set(CMAKE_C_COMPILER /usr/bin/aarch64-linux-gnu-gcc)
set(CMAKE_CXX_COMPILER /usr/bin/aarch64-linux-gnu-g++)

# Define the sysroot, which represents the target system's root filesystem
set(CMAKE_SYSROOT /opt/data/orangepi/rk3588_dev_rootfs/rootfs)

# Set the root path for finding dependencies within the target environment
set(CMAKE_FIND_ROOT_PATH /opt/data/orangepi/rk3588_dev_rootfs/rootfs)

# Configure how CMake searches for programs, libraries, and includes:
# - NEVER: Do not use the target environment when searching for programs.
# - ONLY: Restrict library and include searches to the target environment.
set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)   # Don't search for programs in the target sysroot
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)    # Only look for libraries in the target sysroot
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)    # Only look for headers in the target sysroot

# Configure pkg-config to use the target environment's package configurations
set(ENV{PKG_CONFIG_DIR} "${CMAKE_SYSROOT}/usr/lib/pkgconfig")
set(ENV{PKG_CONFIG_LIBDIR} "${CMAKE_SYSROOT}/usr/lib/pkgconfig:${CMAKE_SYSROOT}/usr/share/pkgconfig")
set(ENV{PKG_CONFIG_SYSROOT_DIR} ${CMAKE_SYSROOT})

# Set the staging prefix (uncomment if necessary)
# set(CMAKE_STAGING_PREFIX ${CMAKE_SYSROOT}/usr)

# Include directories from the target environment when cross-compiling
# include_directories(${CMAKE_STAGING_PREFIX}/include)

# Add the library directories for linking
# link_directories(${CMAKE_STAGING_PREFIX}/lib/aarch64-linux-gnu)

# Debugging: Print all link directories detected by CMake
# get_directory_property(dir_link_dirs DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR} LINK_DIRECTORIES)
# foreach(dir ${dir_link_dirs})
#   message(STATUS "Global link directory: ${dir}")
# endforeach()
