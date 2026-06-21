import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;
const serverUrl = appBaseUrl || 'https://base44.app';

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl,
  requiresAuth: false,
  appBaseUrl: appBaseUrl || serverUrl
});

const KNOWN_ENTITIES = [
  "AuditLog",
  "Category",
  "Contest",
  "CriteriaTemplate",
  "Evaluation",
  "EvaluationCriterion",
  "EvaluationScore",
  "Judge",
  "JudgeAssignment",
  "Participant",
  "PublicVote",
  "Result",
];

const asArray = (value) => (Array.isArray(value) ? value : []);

const normalizeComparable = (value) => {
  if (value === undefined || value === null) return "";
  return String(value);
};

const matchesQuery = (item, query = {}) =>
  Object.entries(query).every(([key, value]) => normalizeComparable(item?.[key]) === normalizeComparable(value));

const patchEntityFilterFallbacks = () => {
  if (!base44?.entities) return;

  KNOWN_ENTITIES.forEach((entityName) => {
    const entity = base44.entities[entityName];
    if (!entity || entity.__voteAiFilterFallbackPatched) return;
    if (typeof entity.filter !== "function" || typeof entity.list !== "function") return;

    const originalFilter = entity.filter.bind(entity);
    const originalList = entity.list.bind(entity);

    entity.filter = async (query = {}, ...args) => {
      try {
        return await originalFilter(query, ...args);
      } catch (error) {
        console.warn(`[base44] ${entityName}.filter failed; using list fallback.`, error);
        const listResult = await originalList();
        return asArray(listResult).filter((item) => matchesQuery(item, query));
      }
    };

    Object.defineProperty(entity, "__voteAiFilterFallbackPatched", {
      value: true,
      enumerable: false,
    });
  });
};

patchEntityFilterFallbacks();
