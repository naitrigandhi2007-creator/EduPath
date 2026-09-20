const path = require("path");
const learningResources = require(path.join(__dirname, "../data/learningResources.json"));

const normalize = (value = "") => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function retrieveResources(skillGaps = []) {
  if (!Array.isArray(skillGaps)) {
    return [];
  }

  // Retrieval step: select relevant resources from the local knowledge base.
  return skillGaps
    .filter((gap) => gap && gap.skill)
    .map((gap) => {
      const normalizedSkill = normalize(gap.skill);
      const matches = learningResources.filter((resource) => {
        const resourceSkill = normalize(resource.skill);
        return resourceSkill === normalizedSkill ||
          resourceSkill.includes(normalizedSkill) ||
          normalizedSkill.includes(resourceSkill);
      });

      return {
        skill: gap.skill,
        priority: gap.priority || "medium",
        resources: matches,
      };
    })
    .filter((result) => result.resources.length > 0);
}

module.exports = {
  retrieveResources,
};
