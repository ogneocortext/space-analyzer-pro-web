/**
 * Knowledge Database - Re-export of modular database
 * This file maintains backward compatibility while using the new modular structure
 * @deprecated Use server/db/index.js directly for new code
 */

const KnowledgeDatabase = require("./db");

module.exports = KnowledgeDatabase;
