import * as agent from "superagent";

export type TImageWithTags = {
  name:string;
  tags:string[];
}

export type TRegistryImageManifest = {
  schemaVersion:any,
  name:any,
  tag:any,
  architecture:any,
  fsLayers:any,
  history:any,
  signature:any
}

export interface TDockerImageLabels {
  [key: string]: string;
}

export interface IRetrieveRegistryMetadata{
  getImageTags(image:string):Promise<TImageWithTags>
  getImageManifest(image:string, imageTag:string):Promise<TRegistryImageManifest>
  getImageManifestLabels(image: string, imageTag: string): Promise<TDockerImageLabels>;
}

export type TRegistryApiDependencies = {
  agent:any
}

export type TRegistryApiOptions = {
  httpProtocol:string;
  registryHost:string;
}

const defaultDeps:TRegistryApiDependencies={
  agent:agent
}

export function createDockerRegistryApi(options: TRegistryApiOptions, injected:TRegistryApiDependencies=defaultDeps): IRetrieveRegistryMetadata{

  function getImageManifest(image:string, imageTag:string):Promise<TRegistryImageManifest>{

    let ApiUrl = `${options.httpProtocol}://${options.registryHost}/v2/${image}/manifests/${imageTag}`;
    return injected.agent.get(ApiUrl).set("Host", options.registryHost).then((result) => {
      return JSON.parse(result.body);
    });
  }

  function getImageTags(IMAGE):Promise<TImageWithTags>{
    let ApiUrl = `${options.httpProtocol}://${options.registryHost}/v2/${IMAGE}/tags/list/?n=10`;
    return injected.agent.get(ApiUrl).set("Host", options.registryHost).then((result) => {
      return result.body;
    });
  }

  function getImageManifestLabels(image: string, imageTag: string): Promise<TDockerImageLabels>{
    return getImageManifest(image, imageTag).then((imageManifest)=>{
      if(!imageManifest.history[0].v1Compatibility || !imageManifest.history[0].v1Compatibility){
        return {}
      }
      let layerZero = JSON.parse(imageManifest.history[0].v1Compatibility);
      if(!layerZero.config.Labels){
        return {}
      }
      return layerZero.config.Labels;
    })
  }

  return {
    getImageManifest,
    getImageTags,
    getImageManifestLabels
  }

}