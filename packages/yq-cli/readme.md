YAML query - a minimal wrapper that converts yaml from stdin to JSON and pipes through jq.

Does NOT include jq, must be present on path prior to installing, otherwise the test will fail.

[Installing jq](https://stedolan.github.io/jq/download/)

See [yq spec](src/yq.spec.js) for an example usage in javascript. In bash, typical use is
something like, which would extract the name out of the yaml file without surrounding quotes.

```
cat myyamlfile.yaml | yq .name -r 
```


