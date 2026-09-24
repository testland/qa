"""Shared connection registry: one pooled connection per region."""

_CONNECTIONS = {}


class RegionKeyed:
    """Base for objects the registry hands a pooled connection to."""

    def _registry_key(self):
        return (self.region, self.catalog_version)

    def __eq__(self, other):
        if not isinstance(other, RegionKeyed):
            return NotImplemented
        return self._registry_key() == other._registry_key()

    def __hash__(self):
        return hash(self._registry_key())


def connection_for(obj):
    if obj not in _CONNECTIONS:
        _CONNECTIONS[obj] = "conn-{}-{}".format(obj.region, obj.catalog_version)
    return _CONNECTIONS[obj]
