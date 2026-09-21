cmake_minimum_required(VERSION 3.16)
project(dms_edge_gateway C)

set(CMAKE_C_STANDARD 99)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -Wall -Wextra -Wpedantic -O2")

find_package(PkgConfig REQUIRED)
pkg_check_modules(MODBUS REQUIRED libmodbus)
pkg_check_modules(HIREDIS REQUIRED hiredis)
pkg_check_modules(CJSON REQUIRED libcjson)

include_directories(
    src
    ${MODBUS_INCLUDE_DIRS}
    ${HIREDIS_INCLUDE_DIRS}
    ${CJSON_INCLUDE_DIRS}
)

# 1. Production Edge Gateway Daemon
add_executable(edge_gateway
    src/main.c
    src/config.c
    src/modbus_client.c
    src/redis_publisher.c
)

target_link_libraries(edge_gateway
    ${MODBUS_LIBRARIES}
    ${HIREDIS_LIBRARIES}
    ${CJSON_LIBRARIES}
    m
)

# 2. Standalone Software Modbus PLC Simulator for Automated Testing
add_executable(plc_simulator
    mock/plc_simulator.c
    src/config.c
)

target_link_libraries(plc_simulator
    ${MODBUS_LIBRARIES}
    m
)
