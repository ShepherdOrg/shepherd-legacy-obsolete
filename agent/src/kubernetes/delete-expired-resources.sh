#!/usr/bin/env bash
export PATH=$PATH:$PWD
echo "Finding kubernetes resources with expired time-to-live"
echo "Deployments:"
kubectl get deployment -l 'ttl-hours' -o json | kube-filter-expired-resources.js | xargs -n 1 -I {} bash -c 'kubectl delete $@' _ {}

echo "Services:"
kubectl get service -l 'ttl-hours' -o json | kube-filter-expired-resources.js | xargs -n 1 -I {} bash -c 'kubectl delete $@' _ {}

echo "Secrets:"
kubectl get secret -l 'ttl-hours' -o json | kube-filter-expired-resources.js | xargs -n 1 -I {} bash -c 'kubectl delete $@' _ {}

echo "Configmaps:"
kubectl get configmap -l 'ttl-hours' -o json | kube-filter-expired-resources.js | xargs -n 1 -I {} bash -c 'kubectl delete $@' _ {}

echo "HorizontalPodAutoscalers:"
kubectl get hpa -l 'ttl-hours' -o json | kube-filter-expired-resources.js | xargs -n 1 -I {} bash -c 'kubectl delete $@' _ {}
