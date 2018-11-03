import {
  createDockerRegistryApi,
  TDockerImageLabels
} from "./registry-metadata-api";
import { expect } from "chai";

describe("Registry metadata API against localhost on http", function() {
  this.timeout(60000);

  const api = createDockerRegistryApi({
    httpProtocol: "http",
    registryHost: "localhost:5000"
  });

  it("should retrieve image tags", () => {
    return api.getImageTags("shepherd").then(imageWithTags => {
      expect(imageWithTags.name).to.equal("shepherd");
      expect(imageWithTags.tags.length).to.be.gte(1);
    });
  });

  it("should have expected property names on manifest", () => {
    return api.getImageManifest("shepherd", "latest").then((manifest: any) => {
      const expectedPropNames = [
        "schemaVersion",
        "name",
        "tag",
        "architecture",
        "fsLayers",
        "history",
        "signatures"
      ];
      expect(Object.getOwnPropertyNames(manifest)).to.eql(expectedPropNames);
    });
  });

  it("should retrieve docker tags on existing image", () => {
    return api
      .getImageManifestLabels("shepherd", "latest")
      .then((dockerTags: TDockerImageLabels) => {
        expect(dockerTags["is.icelandairlabs.name"]).to.equal("Shepherd agent");
      });
  });

  it("should return empty object on image with no docker labels", () => {
    return api
      .getImageManifestLabels("alpine", "3.4")
      .then((dockerTags: TDockerImageLabels) => {
        expect(dockerTags).to.eql({});
      });
  });

  it("should give meaningful error on non-existing image", () => {
    return api.getImageManifestLabels("nowayjose", "latest").catch(err => {
      expect(err.message).to.equal("Not Found");
    });
  });
});
