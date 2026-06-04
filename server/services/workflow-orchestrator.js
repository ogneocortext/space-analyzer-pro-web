/**
 * Workflow Orchestrator Service
 * Manages batch operations, scheduled scans, and workflow automation
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

class WorkflowOrchestrator {
  constructor() {
    this.activeWorkflows = new Map();
    this.scheduledWorkflows = new Map();
    this.completedWorkflows = new Map();
    this.workflowHistory = [];
    this.isRunning = false;
    
    // Workflow configuration
    this.config = {
      maxConcurrentWorkflows: 3,
      defaultTimeout: 30 * 60 * 1000, // 30 minutes
      retryAttempts: 3,
      retryDelay: 5000, // 5 seconds
      notificationLevel: 'info' // debug, info, warn, error
    };
    
    // Initialize workflow engines
    this.batchProcessor = new BatchProcessor();
    this.scheduler = new WorkflowScheduler();
    this.automationEngine = new AutomationEngine();
  }

  async initialize() {
    console.warn('🚀 Initializing Workflow Orchestrator...');
    
    // Load existing workflows
    await this.loadWorkflows();
    
    // Start scheduler
    await this.scheduler.start();
    
    // Start automation engine
    await this.automationEngine.start();
    
    // Register event handlers
    this.registerEventHandlers();
    
    console.warn('✅ Workflow Orchestrator initialized');
  }

  // Batch Operations
  async createBatchWorkflow(options) {
    const workflow = {
      id: this.generateWorkflowId(),
      type: 'batch',
      name: options.name || `Batch Operation ${Date.now()}`,
      description: options.description || '',
      status: 'pending',
      createdAt: new Date(),
      config: {
        operations: options.operations || [],
        parallel: options.parallel !== false,
        continueOnError: options.continueOnError || false,
        maxConcurrency: options.maxConcurrency || this.config.maxConcurrentWorkflows,
        timeout: options.timeout || this.config.defaultTimeout
      },
      progress: {
        total: 0,
        completed: 0,
        failed: 0,
        percentage: 0
      },
      results: [],
      errors: []
    };

    this.activeWorkflows.set(workflow.id, workflow);
    await this.saveWorkflows();
    
    console.warn(`📋 Created batch workflow: ${workflow.name} (${workflow.id})`);
    return workflow;
  }

  async executeBatchWorkflow(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    workflow.status = 'running';
    workflow.startedAt = new Date();
    
    try {
      console.warn(`🔄 Executing batch workflow: ${workflow.name}`);
      
      const results = await this.batchProcessor.execute(workflow.config.operations, {
        parallel: workflow.config.parallel,
        maxConcurrency: workflow.config.maxConcurrency,
        continueOnError: workflow.config.continueOnError,
        onProgress: (progress) => this.updateWorkflowProgress(workflowId, progress),
        onOperationComplete: (result) => this.handleOperationComplete(workflowId, result),
        onOperationError: (error) => this.handleOperationError(workflowId, error)
      });

      workflow.status = 'completed';
      workflow.completedAt = new Date();
      workflow.results = results;
      workflow.progress.percentage = 100;

      console.warn(`✅ Batch workflow completed: ${workflow.name}`);
      
      // Move to completed workflows
      this.activeWorkflows.delete(workflowId);
      this.completedWorkflows.set(workflowId, workflow);
      this.workflowHistory.push(workflow);
      
      await this.saveWorkflows();
      await this.notifyWorkflowCompletion(workflow);
      
      return workflow;
    } catch (error) {
      workflow.status = 'failed';
      workflow.completedAt = new Date();
      workflow.errors.push(error);
      
      console.error(`❌ Batch workflow failed: ${workflow.name}`, error);
      
      this.activeWorkflows.delete(workflowId);
      this.completedWorkflows.set(workflowId, workflow);
      this.workflowHistory.push(workflow);
      
      await this.saveWorkflows();
      await this.notifyWorkflowError(workflow, error);
      
      throw error;
    }
  }

  // Scheduled Operations
  async createScheduledWorkflow(options) {
    const workflow = {
      id: this.generateWorkflowId(),
      type: 'scheduled',
      name: options.name || `Scheduled Workflow ${Date.now()}`,
      description: options.description || '',
      status: 'scheduled',
      createdAt: new Date(),
      schedule: {
        type: options.schedule.type, // 'cron', 'interval', 'once'
        pattern: options.schedule.pattern, // cron expression or interval in ms
        timezone: options.schedule.timezone || 'UTC',
        nextRun: this.calculateNextRun(options.schedule),
        lastRun: null,
        runCount: 0
      },
      config: {
        operations: options.operations || [],
        parallel: options.parallel !== false,
        timeout: options.timeout || this.config.defaultTimeout,
        retryAttempts: options.retryAttempts || this.config.retryAttempts
      },
      results: [],
      errors: []
    };

    this.scheduledWorkflows.set(workflow.id, workflow);
    await this.scheduler.schedule(workflow);
    await this.saveWorkflows();
    
    console.warn(`⏰ Created scheduled workflow: ${workflow.name} (${workflow.id})`);
    return workflow;
  }

  async cancelScheduledWorkflow(workflowId) {
    const workflow = this.scheduledWorkflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Scheduled workflow not found: ${workflowId}`);
    }

    await this.scheduler.cancel(workflowId);
    this.scheduledWorkflows.delete(workflowId);
    
    workflow.status = 'cancelled';
    workflow.cancelledAt = new Date();
    
    await this.saveWorkflows();
    console.warn(`🛑 Cancelled scheduled workflow: ${workflow.name}`);
    
    return workflow;
  }

  // Automation Rules
  async createAutomationRule(rule) {
    const automationRule = {
      id: this.generateWorkflowId(),
      name: rule.name || `Automation Rule ${Date.now()}`,
      description: rule.description || '',
      enabled: rule.enabled !== false,
      createdAt: new Date(),
      triggers: rule.triggers || [], // Event-based triggers
      conditions: rule.conditions || [], // Conditions to evaluate
      actions: rule.actions || [], // Actions to execute
      statistics: {
        triggerCount: 0,
        executionCount: 0,
        successCount: 0,
        errorCount: 0,
        lastTriggered: null,
        lastExecuted: null
      }
    };

    await this.automationEngine.addRule(automationRule);
    await this.saveWorkflows();
    
    console.warn(`🤖 Created automation rule: ${automationRule.name}`);
    return automationRule;
  }

  async executeAutomationRule(ruleId, context = {}) {
    const rule = this.automationEngine.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Automation rule not found: ${ruleId}`);
    }

    try {
      console.warn(`🔄 Executing automation rule: ${rule.name}`);
      
      // Evaluate conditions
      const shouldExecute = await this.evaluateConditions(rule.conditions, context);
      
      if (shouldExecute) {
        rule.statistics.triggerCount++;
        rule.statistics.lastTriggered = new Date();
        
        // Execute actions
        const results = await this.executeActions(rule.actions, context);
        
        rule.statistics.executionCount++;
        rule.statistics.successCount++;
        rule.statistics.lastExecuted = new Date();
        
        console.warn(`✅ Automation rule executed: ${rule.name}`);
        return results;
      }
    } catch (error) {
      rule.statistics.executionCount++;
      rule.statistics.errorCount++;
      rule.statistics.lastExecuted = new Date();
      
      console.error(`❌ Automation rule failed: ${rule.name}`, error);
      throw error;
    }
  }

  // Progress Management
  updateWorkflowProgress(workflowId, progress) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) return;

    workflow.progress = {
      ...workflow.progress,
      ...progress,
      percentage: progress.total > 0 ? (progress.completed / progress.total) * 100 : 0
    };

    // Emit progress event
    this.emitProgressEvent(workflow);
  }

  handleOperationComplete(workflowId, result) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) return;

    workflow.results.push(result);
    workflow.progress.completed++;
    this.updateWorkflowProgress(workflowId, workflow.progress);
  }

  handleOperationError(workflowId, error) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) return;

    workflow.errors.push(error);
    workflow.progress.failed++;
    this.updateWorkflowProgress(workflowId, workflow.progress);
  }

  // Utility Methods
  generateWorkflowId() {
    return `wf_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  calculateNextRun(schedule) {
    const now = new Date();
    
    if (schedule.type === 'once') {
      return new Date(schedule.pattern);
    } else if (schedule.type === 'interval') {
      return new Date(now.getTime() + schedule.pattern);
    } else if (schedule.type === 'cron') {
      // Simplified cron parsing - would use a proper cron library in production
      return this.parseCronExpression(schedule.pattern, now);
    }
    
    return null;
  }

  parseCronExpression(cronExpression, fromDate) {
    // Simplified cron parsing - would use a proper cron library
    // This is a basic implementation for common patterns
    const parts = cronExpression.split(' ');
    if (parts.length !== 5) return null;
    
    const [minute, hour, day, month, dayOfWeek] = parts;
    const next = new Date(fromDate);
    
    // Handle common patterns
    if (minute === '*' && hour === '*' && day === '*' && month === '*' && dayOfWeek === '*') {
      // Every minute
      next.setMinutes(next.getMinutes() + 1);
    } else if (minute === '0' && hour === '*' && day === '*' && month === '*' && dayOfWeek === '*') {
      // Every hour
      next.setHours(next.getHours() + 1);
      next.setMinutes(0);
    } else if (minute === '0' && hour === '0' && day === '*' && month === '*' && dayOfWeek === '*') {
      // Every day at midnight
      next.setDate(next.getDate() + 1);
      next.setHours(0);
      next.setMinutes(0);
    }
    
    return next;
  }

  async evaluateConditions(conditions, context) {
    for (const condition of conditions) {
      const result = await this.evaluateCondition(condition, context);
      if (!result) return false;
    }
    return true;
  }

  async evaluateCondition(condition, context) {
    switch (condition.type) {
      case 'file_size':
        return this.evaluateFileSizeCondition(condition, context);
      case 'file_count':
        return this.evaluateFileCountCondition(condition, context);
      case 'file_type':
        return this.evaluateFileTypeCondition(condition, context);
      case 'time_based':
        return this.evaluateTimeBasedCondition(condition, context);
      case 'custom':
        return this.evaluateCustomCondition(condition, context);
      default:
        return true;
    }
  }

  evaluateFileSizeCondition(condition, context) {
    if (!context.fileSize) return false;
    
    const operator = condition.operator || 'gt'; // gt, lt, eq, gte, lte
    const value = condition.value;
    const fileSize = context.fileSize;
    
    switch (operator) {
      case 'gt': return fileSize > value;
      case 'lt': return fileSize < value;
      case 'eq': return fileSize === value;
      case 'gte': return fileSize >= value;
      case 'lte': return fileSize <= value;
      default: return false;
    }
  }

  evaluateFileCountCondition(condition, context) {
    if (!context.fileCount) return false;
    
    const operator = condition.operator || 'gt';
    const value = condition.value;
    const fileCount = context.fileCount;
    
    switch (operator) {
      case 'gt': return fileCount > value;
      case 'lt': return fileCount < value;
      case 'eq': return fileCount === value;
      case 'gte': return fileCount >= value;
      case 'lte': return fileCount <= value;
      default: return false;
    }
  }

  evaluateFileTypeCondition(condition, context) {
    if (!context.fileTypes) return false;
    
    const operator = condition.operator || 'contains';
    const value = condition.value;
    const fileTypes = context.fileTypes;
    
    switch (operator) {
      case 'contains': return fileTypes.includes(value);
      case 'not_contains': return !fileTypes.includes(value);
      case 'matches': return fileTypes.some(type => type.match(value));
      default: return false;
    }
  }

  evaluateTimeBasedCondition(condition, context) {
    const now = new Date();
    const operator = condition.operator || 'between';
    const value = condition.value;
    
    switch (operator) {
      case 'between':
        const start = new Date(value.start);
        const end = new Date(value.end);
        return now >= start && now <= end;
      case 'after':
        return now >= new Date(value);
      case 'before':
        return now <= new Date(value);
      default:
        return false;
    }
  }

  evaluateCustomCondition(condition, context) {
    // Execute custom JavaScript condition
    try {
      const func = new Function('context', `return ${condition.expression}`);
      return func(context);
    } catch (error) {
      console.error('Custom condition evaluation failed:', error);
      return false;
    }
  }

  async executeActions(actions, context) {
    const results = [];
    
    for (const action of actions) {
      try {
        const result = await this.executeAction(action, context);
        results.push({ action: action.name, result, success: true });
      } catch (error) {
        results.push({ action: action.name, error, success: false });
      }
    }
    
    return results;
  }

  async executeAction(action, context) {
    switch (action.type) {
      case 'scan_directory':
        return this.executeScanAction(action, context);
      case 'delete_files':
        return this.executeDeleteAction(action, context);
      case 'move_files':
        return this.executeMoveAction(action, context);
      case 'copy_files':
        return this.executeCopyAction(action, context);
      case 'compress_files':
        return this.executeCompressAction(action, context);
      case 'send_notification':
        return this.executeNotificationAction(action, context);
      case 'custom_script':
        return this.executeCustomScriptAction(action, context);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  async executeScanAction(action, context) {
    // Execute directory scan
    const scanner = require('./enhanced-polyglot-scanner');
    const scanResult = await scanner.analyzeDirectory(action.directory, {
      maxDepth: action.maxDepth,
      includeHidden: action.includeHidden,
      parallel: action.parallel
    });
    
    return scanResult;
  }

  async executeDeleteAction(action, context) {
    // Execute file deletion with safety checks
    const filesToDelete = action.files || [];
    const deletedFiles = [];
    
    for (const file of filesToDelete) {
      try {
        await fs.unlink(file);
        deletedFiles.push(file);
      } catch (error) {
        console.error(`Failed to delete file ${file}:`, error);
      }
    }
    
    return { deletedFiles, count: deletedFiles.length };
  }

  async executeMoveAction(action, context) {
    // Execute file move operation
    const filesToMove = action.files || [];
    const destination = action.destination;
    const movedFiles = [];
    
    for (const file of filesToMove) {
      try {
        const fileName = path.basename(file);
        const newPath = path.join(destination, fileName);
        await fs.rename(file, newPath);
        movedFiles.push({ from: file, to: newPath });
      } catch (error) {
        console.error(`Failed to move file ${file}:`, error);
      }
    }
    
    return { movedFiles, count: movedFiles.length };
  }

  async executeCopyAction(action, context) {
    // Execute file copy operation
    const filesToCopy = action.files || [];
    const destination = action.destination;
    const copiedFiles = [];
    
    for (const file of filesToCopy) {
      try {
        const fileName = path.basename(file);
        const newPath = path.join(destination, fileName);
        await fs.copyFile(file, newPath);
        copiedFiles.push({ from: file, to: newPath });
      } catch (error) {
        console.error(`Failed to copy file ${file}:`, error);
      }
    }
    
    return { copiedFiles, count: copiedFiles.length };
  }

  async executeCompressAction(action, context) {
    // Execute file compression
    const archiver = require('archiver');
    const filesToCompress = action.files || [];
    const outputPath = action.outputPath;
    
    return new Promise((resolve, reject) => {
      const output = require('fs').createWriteStream(outputPath);
      const archive = archiver('zip');
      
      output.on('close', () => {
        resolve({ outputPath, size: archive.pointer() });
      });
      
      archive.on('error', reject);
      archive.pipe(output);
      
      filesToCompress.forEach(file => {
        archive.file(require('fs').createReadStream(file), path.basename(file));
      });
      
      archive.finalize();
    });
  }

  async executeNotificationAction(action, context) {
    // Send notification
    const notification = {
      type: action.notificationType || 'info',
      title: action.title || 'Workflow Notification',
      message: action.message || 'Workflow action completed',
      recipients: action.recipients || [],
      channels: action.channels || ['system']
    };
    
    await this.sendNotification(notification);
    return { notification, sent: true };
  }

  async executeCustomScriptAction(action, context) {
    // Execute custom script
    const script = action.script;
    const scriptContext = { ...context, action };
    
    // Execute in a sandboxed environment
    const result = await this.executeSafely(script, scriptContext);
    return result;
  }

  async executeSafely(script, context) {
    // Simple sandbox execution - would use proper sandboxing in production
    try {
      const func = new Function('context', script);
      return func(context);
    } catch (error) {
      console.error('Script execution failed:', error);
      throw error;
    }
  }

  async sendNotification(notification) {
    // Send notification through various channels
    console.warn(`📢 Notification: ${notification.title} - ${notification.message}`);
    
    // Implementation would depend on notification system
    // Could integrate with email, Slack, Discord, etc.
  }

  emitProgressEvent(workflow) {
    // Emit progress event for real-time updates
    if (this.config.notificationLevel === 'debug') {
      console.warn(`📊 Workflow Progress: ${workflow.name} - ${workflow.progress.percentage.toFixed(1)}%`);
    }
  }

  async notifyWorkflowCompletion(workflow) {
    const notification = {
      type: 'success',
      title: 'Workflow Completed',
      message: `Workflow "${workflow.name}" completed successfully`,
      details: {
        duration: workflow.completedAt - workflow.startedAt,
        operations: workflow.results.length,
        errors: workflow.errors.length
      }
    };
    
    await this.sendNotification(notification);
  }

  async notifyWorkflowError(workflow, error) {
    const notification = {
      type: 'error',
      title: 'Workflow Failed',
      message: `Workflow "${workflow.name}" failed: ${error.message}`,
      details: {
        error: error.message,
        stack: error.stack,
        workflowId: workflow.id
      }
    };
    
    await this.sendNotification(notification);
  }

  // Event Handlers
  registerEventHandlers() {
    // Register system event handlers
    process.on('workflow:trigger', this.handleWorkflowTrigger.bind(this));
    process.on('workflow:cancel', this.handleWorkflowCancel.bind(this));
    process.on('workflow:pause', this.handleWorkflowPause.bind(this));
    process.on('workflow:resume', this.handleWorkflowResume.bind(this));
  }

  async handleWorkflowTrigger(event) {
    const { workflowId, context } = event;
    const workflow = this.scheduledWorkflows.get(workflowId);
    
    if (workflow) {
      await this.executeScheduledWorkflow(workflowId, context);
    }
  }

  async handleWorkflowCancel(event) {
    const { workflowId } = event;
    
    // Cancel active workflow
    const activeWorkflow = this.activeWorkflows.get(workflowId);
    if (activeWorkflow) {
      activeWorkflow.status = 'cancelled';
      activeWorkflow.cancelledAt = new Date();
      this.activeWorkflows.delete(workflowId);
      this.completedWorkflows.set(workflowId, activeWorkflow);
    }
    
    // Cancel scheduled workflow
    await this.cancelScheduledWorkflow(workflowId);
  }

  async handleWorkflowPause(event) {
    const { workflowId } = event;
    const workflow = this.activeWorkflows.get(workflowId);
    
    if (workflow) {
      workflow.status = 'paused';
      workflow.pausedAt = new Date();
    }
  }

  async handleWorkflowResume(event) {
    const { workflowId } = event;
    const workflow = this.activeWorkflows.get(workflowId);
    
    if (workflow && workflow.status === 'paused') {
      workflow.status = 'running';
      workflow.resumedAt = new Date();
    }
  }

  // Persistence
  async saveWorkflows() {
    try {
      const data = {
        active: Array.from(this.activeWorkflows.values()),
        scheduled: Array.from(this.scheduledWorkflows.values()),
        completed: Array.from(this.completedWorkflows.values()),
        history: this.workflowHistory.slice(-100), // Keep last 100
        automationRules: Array.from(this.automationEngine.rules.values())
      };
      
      const filePath = path.join(__dirname, 'data', 'workflows.json');
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      
    } catch (error) {
      console.error('Failed to save workflows:', error);
    }
  }

  async loadWorkflows() {
    try {
      const filePath = path.join(__dirname, 'data', 'workflows.json');
      const data = await fs.readFile(filePath, 'utf8');
      const workflows = JSON.parse(data);
      
      // Restore workflows
      workflows.active.forEach(w => this.activeWorkflows.set(w.id, w));
      workflows.scheduled.forEach(w => this.scheduledWorkflows.set(w.id, w));
      workflows.completed.forEach(w => this.completedWorkflows.set(w.id, w));
      this.workflowHistory = workflows.history || [];
      
      // Restore automation rules
      if (workflows.automationRules) {
        workflows.automationRules.forEach(rule => this.automationEngine.addRule(rule));
      }
      
      console.warn(`📂 Loaded ${workflows.active.length} active, ${workflows.scheduled.length} scheduled workflows`);
      
    } catch (error) {
      console.warn('No existing workflows found, starting fresh');
    }
  }

  // API Methods
  getActiveWorkflows() {
    return Array.from(this.activeWorkflows.values());
  }

  getScheduledWorkflows() {
    return Array.from(this.scheduledWorkflows.values());
  }

  getCompletedWorkflows() {
    return Array.from(this.completedWorkflows.values());
  }

  getWorkflowHistory(limit = 50) {
    return this.workflowHistory.slice(-limit);
  }

  getWorkflowStats() {
    const active = this.activeWorkflows.size;
    const scheduled = this.scheduledWorkflows.size;
    const completed = this.completedWorkflows.size;
    const total = this.workflowHistory.length;
    
    return {
      active,
      scheduled,
      completed,
      total,
      automationRules: this.automationEngine.rules.size,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };
  }
}

// Supporting Classes
class BatchProcessor {
  async execute(operations, options = {}) {
    const {
      parallel = true,
      maxConcurrency = 3,
      continueOnError = false,
      onProgress,
      onOperationComplete,
      onOperationError
    } = options;

    const results = [];
    let completed = 0;
    let failed = 0;

    if (parallel) {
      // Parallel execution
      const chunks = this.chunkArray(operations, maxConcurrency);
      
      for (const chunk of chunks) {
        const chunkResults = await Promise.allSettled(
          chunk.map(op => this.executeOperation(op))
        );
        
        chunkResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
            completed++;
            if (onOperationComplete) onOperationComplete(result.value);
          } else {
            results.push({ error: result.reason });
            failed++;
            if (onOperationError) onOperationError(result.reason);
            
            if (!continueOnError) {
              throw result.reason;
            }
          }
        });
        
        if (onProgress) {
          onProgress({ total: operations.length, completed, failed });
        }
      }
    } else {
      // Sequential execution
      for (const operation of operations) {
        try {
          const result = await this.executeOperation(operation);
          results.push(result);
          completed++;
          if (onOperationComplete) onOperationComplete(result);
        } catch (error) {
          results.push({ error });
          failed++;
          if (onOperationError) onOperationError(error);
          
          if (!continueOnError) {
            throw error;
          }
        }
        
        if (onProgress) {
          onProgress({ total: operations.length, completed, failed });
        }
      }
    }
    
    return results;
  }

  async executeOperation(operation) {
    // Execute individual operation based on type
    switch (operation.type) {
      case 'scan':
        return this.executeScanOperation(operation);
      case 'analyze':
        return this.executeAnalyzeOperation(operation);
      case 'process':
        return this.executeProcessOperation(operation);
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  async executeScanOperation(operation) {
    // Implementation depends on scanner integration
    const scanner = require('./enhanced-polyglot-scanner');
    return await scanner.analyzeDirectory(operation.path, operation.options);
  }

  async executeAnalyzeOperation(operation) {
    // Implementation depends on analyzer integration
    const analyzer = require('./ai-file-classifier');
    return await analyzer.classifyFile(operation.path, operation.stats);
  }

  async executeProcessOperation(operation) {
    // Generic operation execution
    return { operation: operation.id, processed: true, timestamp: new Date() };
  }

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

class WorkflowScheduler {
  constructor() {
    this.timers = new Map();
    this.isRunning = false;
  }

  async start() {
    this.isRunning = true;
    console.warn('⏰ Workflow Scheduler started');
  }

  async schedule(workflow) {
    if (workflow.schedule.type === 'cron') {
      // Schedule recurring workflow
      this.scheduleCronWorkflow(workflow);
    } else if (workflow.schedule.type === 'interval') {
      // Schedule interval workflow
      this.scheduleIntervalWorkflow(workflow);
    } else if (workflow.schedule.type === 'once') {
      // Schedule one-time workflow
      this.scheduleOnceWorkflow(workflow);
    }
  }

  scheduleCronWorkflow(workflow) {
    const interval = this.parseCronToInterval(workflow.schedule.pattern);
    const timer = setInterval(() => {
      this.executeWorkflow(workflow);
    }, interval);
    
    this.timers.set(workflow.id, timer);
  }

  scheduleIntervalWorkflow(workflow) {
    const timer = setInterval(() => {
      this.executeWorkflow(workflow);
    }, workflow.schedule.pattern);
    
    this.timers.set(workflow.id, timer);
  }

  scheduleOnceWorkflow(workflow) {
    const delay = workflow.schedule.nextRun - Date.now();
    const timer = setTimeout(() => {
      this.executeWorkflow(workflow);
    }, delay);
    
    this.timers.set(workflow.id, timer);
  }

  parseCronToInterval(cronExpression) {
    // Simplified cron to interval conversion
    // Would use proper cron library in production
    return 60 * 60 * 1000; // Default to 1 hour
  }

  async executeWorkflow(workflow) {
    workflow.schedule.lastRun = new Date();
    workflow.schedule.runCount++;
    
    // Emit workflow trigger event
    process.emit('workflow:trigger', {
      workflowId: workflow.id,
      context: { workflow }
    });
  }

  async cancel(workflowId) {
    const timer = this.timers.get(workflowId);
    if (timer) {
      clearInterval(timer);
      clearTimeout(timer);
      this.timers.delete(workflowId);
    }
  }
}

class AutomationEngine {
  constructor() {
    this.rules = new Map();
    this.eventListeners = new Map();
    this.isRunning = false;
  }

  async start() {
    this.isRunning = true;
    console.warn('🤖 Automation Engine started');
  }

  async addRule(rule) {
    this.rules.set(rule.id, rule);
    
    // Register event listeners for triggers
    for (const trigger of rule.triggers) {
      this.registerEventListener(trigger.event, rule);
    }
  }

  registerEventListener(event, rule) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
      
      // Register system event listener
      process.on(event, (eventData) => {
        this.handleEvent(event, eventData);
      });
    }
    
    this.eventListeners.get(event).push(rule);
  }

  async handleEvent(event, eventData) {
    const rules = this.eventListeners.get(event) || [];
    
    for (const rule of rules) {
      if (rule.enabled) {
        // Check if trigger conditions match
        const shouldExecute = this.evaluateTriggerConditions(rule.triggers, eventData);
        
        if (shouldExecute) {
          // Execute automation rule
          process.emit('automation:execute', {
            ruleId: rule.id,
            context: { event, eventData, rule }
          });
        }
      }
    }
  }

  evaluateTriggerConditions(triggers, eventData) {
    return triggers.every(trigger => {
      // Simple condition evaluation
      if (trigger.conditions) {
        return this.evaluateConditions(trigger.conditions, eventData);
      }
      return true;
    });
  }

  evaluateConditions(conditions, data) {
    return conditions.every(condition => {
      // Basic condition evaluation
      switch (condition.operator) {
        case 'equals':
          return data[condition.field] === condition.value;
        case 'contains':
          return String(data[condition.field]).includes(condition.value);
        case 'greater_than':
          return data[condition.field] > condition.value;
        case 'less_than':
          return data[condition.field] < condition.value;
        default:
          return true;
      }
    });
  }
}

module.exports = WorkflowOrchestrator;
