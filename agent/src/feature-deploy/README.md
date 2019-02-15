# Purpose

Make it possible to deploy multiple instances of a given service & deployment in a single
cluster, same namespace.


# Limitations
This is developed with specific deployments in mind, this should NOT be considered a generic
solution for all or any kubernetes deployments (yet).

Specifically, it does not support the following:
* Secrets
* Multiple config maps

# Functionality

* Change passed feature name to make it compatible with kubernetes:
  * Replace / with --
  * Replace _ with --
  * Make string lowercase

* Adds time-to-live-hours label (ttl-hours) to all deployment documents. This is processed
by delete-expired-resources.sh, which is initiated after each update of the environment.

* Changes replica specification of Deployment type docs to 1.

* Adjusts configmap names, volumes, and references from deployments to maintain internal consistency.


