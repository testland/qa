#pragma once

#include <string>
#include <vector>

#include "audit.h"
#include "logger.h"
#include "store.h"

struct FakeStore : acme::Store {
  explicit FakeStore(std::vector<acme::Record> records) : records_(records) {}
  const std::vector<acme::Record>& all() const override { return records_; }
  void erase(int id) override;
  size_t size() const { return records_.size(); }

 private:
  std::vector<acme::Record> records_;
};

struct FakeAudit : acme::AuditLog {
  void record(const std::string& action, int id) override {
    entries.push_back({action, id});
  }
  struct Entry {
    std::string action;
    int id;
  };
  std::vector<Entry> entries;
};

struct FakeLogger : acme::Logger {
  void debug(const std::string& message) override { messages.push_back(message); }
  std::vector<std::string> messages;
};
