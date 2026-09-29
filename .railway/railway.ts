import { defineRailway, project, service } from "railway/iac";

// This repository manages only its own resources in the environment. Other
// repositories export their own partial name.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = "CAPSTONEbakewise_system";

export default defineRailway(() => {
  const CAPSTONEbakewise_system = service("CAPSTONEbakewise_system", {
    start: "node server.js",
    // builder from CaC: "nixpacks"
  });
  return project("amusing-commitment", {
    resources: [CAPSTONEbakewise_system],
  });
});
