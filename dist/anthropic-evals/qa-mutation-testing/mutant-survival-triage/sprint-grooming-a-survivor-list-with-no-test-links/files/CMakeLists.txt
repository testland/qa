cmake_minimum_required(VERSION 3.22)
project(vault CXX)

add_library(vault_core src/retention.cpp src/format_duration.cpp)

add_executable(vault_tests test/retention_test.cpp test/format_duration_test.cpp)
target_link_libraries(vault_tests PRIVATE vault_core GTest::gtest_main)

# nightly compliance job only; sources live in the compliance/ submodule, which
# is not checked out in a normal developer clone
add_executable(compliance_e2e compliance/e2e_main.cpp)
target_link_libraries(compliance_e2e PRIVATE vault_core)
