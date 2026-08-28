# Single-Client Boundary

NEOT has one application identity, one authenticated user population, and one database. Requests
derive authorization from the signed local token and persisted role assignments. Platform injects
that fixed database and actor into the NEOT host adapter.

The cloud-sync endpoint is the only alternate request context: it uses a NEOT sync token and the
same fixed database. There is no tenant header, customer selector, domain resolver, database
registry, or database-per-customer routing.
