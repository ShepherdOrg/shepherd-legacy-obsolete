#How it works

This is a tool that queries the kubernetes cluster accessible through kubeconf cli tool configured using $KUBECONFIG 
environment variable, looking for services with either a "subdomain" label or a "topdomain" label. From this list
the tool compiles a list of desired DNS records.

It will then query route53 for all DNS records in the target top domain and compares with the list of
desired records.

For each missing record it will check if an existing records with that name is present, and in that
case will report it either as "not managed" A record or a "conflicted" record, which is then of some
other type (CNAME for example).

If there is nothing in the way, the tool inserts one A record pointing to the ELB endpoint for the
given service, and a TXT record declaring this name as managed record.

For each TXT record which declares that name as managed by this tool, it will check if there is still
a desired record for this name, and if not, it will issue a DELETE change request on that name.


Following is a typical list of cli commands issued:
```
kubectl get services -o json 
aws route53 list-hosted-zones --output json 
aws route53 list-resource-record-sets --hosted-zone-id /hostedzone/ZTMCDMUMZC1SF 
aws elb describe-load-balancers --load-balancer-names ae371b07eb71911e6b8da06ac32a160f --output json
aws route53 change-resource-record-sets --hosted-zone-id /hostedzone/ZTMCDMUMZC1SF --change-batch file:///tmp/dnsconfig.tmp.json
```

# Test commands

Run unittest-like tests using local data on disk.

```
./test-sync-kubernetes-services-with-dns-names.js
```

Calculate actual changes that will be performed:
```
ENV=capacity TOP_DOMAIN_NAME=mycompany.is ./sync-services-with-domain-names.js --debug --dryrun
```


#Alternative solutions which were not deemed a good-enough fit for the toolchain:
https://github.com/wearemolecule/route53-kubernetes
https://github.com/zalando-incubator/mate


# Example service declaration

This service will be mapped to unittest-alpha.mycompany.is and mycompany.is DNS records.

```
    {
      "kind": "Service",
      "apiVersion": "v1",
      "metadata": {
        "name": "www-icelandair-com",
        "namespace": "default",
        "labels": {
          "name": "www-icelandair-com",
          "subdomain": "unittest-alpha",
          "topdomain": "mycompany.is"
        },
        "annotations": {
          "kubectl.kubernetes.io/last-applied-configuration": "{\"kind\":\"Service\",\"apiVersion\":\"v1\",\"metadata\":{\"name\":\"www-icelandair-com\",\"creationTimestamp\":null,\"labels\":{\"name\":\"www-icelandair-com\",\"subdomain\":\"test-alpha\",\"topdomain\":\"mycompany.is\"}},\"spec\":{\"ports\":[{\"name\":\"http\",\"port\":80,\"targetPort\":0},{\"name\":\"https\",\"port\":443,\"targetPort\":0}],\"selector\":{\"name\":\"www-icelandair-com\",\"tier\":\"frontend\"},\"type\":\"LoadBalancer\"},\"status\":{\"loadBalancer\":{}}}"
        }
      },
      "spec": {
        "ports": [
          {
            "name": "http",
            "protocol": "TCP",
            "port": 80,
            "targetPort": 80,
            "nodePort": 32070
          },
          {
            "name": "https",
            "protocol": "TCP",
            "port": 443,
            "targetPort": 443,
            "nodePort": 32487
          }
        ],
        "selector": {
          "name": "www-icelandair-com",
          "tier": "frontend"
        },
        "type": "LoadBalancer",
        "sessionAffinity": "None"
      }
    }

```

# ToDos

1. Environment support
1. Error handling...ensure deployment stops on first error.
1. What is going on with deployment classifier? 