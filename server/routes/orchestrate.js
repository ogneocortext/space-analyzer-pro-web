const express = require("express");
const { PRIORITY } = require("../modules/priority"); // Assuming this exists or using numeric values

class OrchestrateRoutes {
  constructor(server) {
    this.server = server;
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes() {
    // Orchestrator analysis endpoint
    this.router.post("/orchestrate/analyze", async (req, res) => {
      try {
        const { directoryPath, options = {} } = req.body;
        if (!directoryPath) {
          return res.status(400).json({ success: false, error: "directoryPath is required" });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const suffix = Math.random().toString(36).substr(2, 4);
        const analysisId = `orchestrator-${timestamp}-${suffix}`;

        this.server.activeAnalyses.set(analysisId, {
          analysisId,
          files: 0,
          filesProcessed: 0,
          totalSize: 0,
          percentage: 0,
          currentFile: "Starting orchestrator analysis...",
          status: "starting",
          completed: false,
          startTime: Date.now(),
        });

        // Broadcast initial progress
        this.server.eventEmitter.emit("progress", this.server.activeAnalyses.get(analysisId));

        // Start analysis in background
        if (this.server.orchestrator) {
          this.server.orchestrator
            .analyzeDirectory(directoryPath, {
              ai: options.useOllama || false,
              priority: options.priority || 2, // NORMAL
              parallel: options.parallel !== false,
            })
            .then((result) => {
              const finalProgress = {
                analysisId,
                percentage: 100,
                status: "complete",
                completed: true,
                ...result,
              };
              this.server.activeAnalyses.set(analysisId, finalProgress);
              this.server.eventEmitter.emit("progress", finalProgress);
            })
            .catch((err) => {
              this.server.eventEmitter.emit("progress", {
                analysisId,
                status: "failed",
                error: err.message,
              });
            });
        }

        res.json({ success: true, analysisId, message: "Analysis started" });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Orchestrator health/status
    this.router.get("/orchestrate/status", (req, res) => {
      if (!this.server.orchestrator)
        return res.status(503).json({ error: "Orchestrator not initialized" });
      res.json({
        success: true,
        orchestrator: this.server.orchestrator.getHealth(),
        timestamp: new Date().toISOString(),
      });
    });

    // Agent health monitoring
    this.router.get("/orchestrate/agents/health", (req, res) => {
      if (!this.server.orchestrator)
        return res.status(503).json({ error: "Orchestrator not initialized" });

      const agentHealth = Array.from(this.server.orchestrator.agents.values()).map((agent) => ({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        state: agent.state,
        circuitBreaker: agent.circuitBreaker.getHealth(),
        metrics: agent.metrics,
        isAvailable: agent.state === "IDLE" && agent.circuitBreaker.state !== "OPEN",
      }));

      res.json({
        success: true,
        agents: agentHealth,
        timestamp: new Date().toISOString(),
      });
    });

    // Task Queue Management
    this.router.get("/orchestrate/tasks", (req, res) => {
      if (!this.server.orchestrator || !this.server.orchestrator.taskQueue) {
        return res.status(503).json({ error: "Task queue not available" });
      }

      const { status = "all", limit = 50 } = req.query;
      const allTasks = this.server.orchestrator.taskQueue.tasks || [];

      let filteredTasks = status === "all" ? allTasks : allTasks.filter((t) => t.status === status);
      const limitedTasks = filteredTasks.slice(0, parseInt(limit));

      res.json({
        success: true,
        tasks: limitedTasks,
        stats: {
          total: allTasks.length,
          pending: allTasks.filter((t) => t.status === "pending").length,
          active: allTasks.filter((t) => t.status === "active").length,
        },
      });
    });
  }

  getRouter() {
    return this.router;
  }
}

module.exports = OrchestrateRoutes;
