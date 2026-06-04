/**
 * Settings Routes
 * API endpoints for user settings management
 */

const express = require("express");

class SettingsRoutes {
  constructor(server) {
    this.server = server;
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes() {
    // Get all settings
    this.router.get("/settings", async (req, res) => {
      try {
        // Check if knowledge service is available
        if (!this.server.knowledge || !this.server.knowledge.getAllUserSettings) {
          console.warn("⚠️ Knowledge service not available, returning default settings");
          return res.json({
            success: true,
            settings: {
              theme: "dark",
              notifications: {
                enabled: true,
                email: false,
                desktop: true,
              },
              scanning: {
                maxFiles: 100000,
                includeHidden: false,
                followSymlinks: false,
              },
              ui: {
                compactMode: false,
                showFilePreviews: true,
              },
            },
            fallback: true,
          });
        }

        const settings = await this.server.knowledge.getAllUserSettings();
        // Cache for 5 minutes since settings don't change often
        res.setHeader("Cache-Control", "max-age=300");
        res.json({
          success: true,
          settings,
          count: Object.keys(settings || {}).length,
        });
      } catch (error) {
        console.error("❌ Error fetching settings:", error);
        // Return default settings on error
        res.json({
          success: true,
          settings: {
            theme: "dark",
            notifications: {
              enabled: true,
              email: false,
              desktop: true,
            },
            scanning: {
              maxFiles: 100000,
              includeHidden: false,
              followSymlinks: false,
            },
            ui: {
              compactMode: false,
              showFilePreviews: true,
            },
          },
          fallback: true,
          error: error.message,
        });
      }
    });

    // IMPORTANT: Specific routes must be defined BEFORE generic /settings/:key route
    // to prevent Express from treating "notifications" as a key parameter

    // Get notification settings (convenience endpoint) - MUST be before /settings/:key
    this.router.get("/settings/notifications", async (req, res) => {
      try {
        // Check if knowledge service is available
        if (!this.server.knowledge || !this.server.knowledge.getUserSetting) {
          console.warn("⚠️ Knowledge service not available, returning default settings");
          res.setHeader("Cache-Control", "max-age=60");
          return res.json({
            success: true,
            settings: this.getDefaultNotificationSettings(),
          });
        }

        const settings = await this.server.knowledge.getUserSetting("notifications");
        // Cache for 1 minute since settings can change during user session
        res.setHeader("Cache-Control", "max-age=60");
        res.json({
          success: true,
          settings: settings || this.getDefaultNotificationSettings(),
        });
      } catch (error) {
        console.error("Error fetching notification settings:", error);
        res.setHeader("Cache-Control", "max-age=60");
        res.json({
          success: true,
          settings: this.getDefaultNotificationSettings(),
        });
      }
    });

    // Save notification settings (convenience endpoint) - MUST be before /settings/:key
    this.router.post("/settings/notifications", async (req, res) => {
      try {
        const settings = req.body;
        await this.server.knowledge.setUserSetting("notifications", settings);
        res.json({
          success: true,
          message: "Notification settings saved successfully",
        });
      } catch (error) {
        console.error("Error saving notification settings:", error);
        res.status(500).json({
          success: false,
          error: "Failed to save notification settings",
        });
      }
    });

    // Get specific setting - MUST be after specific routes like /settings/notifications
    this.router.get("/settings/:key", async (req, res) => {
      try {
        const { key } = req.params;

        // Validate key parameter
        if (!key || typeof key !== "string") {
          return res.status(400).json({
            success: false,
            error: "Valid setting key is required",
          });
        }

        // Check if knowledge service is available
        if (!this.server.knowledge || !this.server.knowledge.getUserSetting) {
          console.warn(`⚠️ Knowledge service not available for key: ${key}`);
          return res.json({
            success: true,
            key,
            value: null,
            fallback: true,
          });
        }

        const value = await this.server.knowledge.getUserSetting(key);
        // Cache for 5 minutes since settings don't change often
        res.setHeader("Cache-Control", "max-age=300");
        res.json({
          success: true,
          key,
          value,
          exists: value !== undefined && value !== null,
        });
      } catch (error) {
        console.error(`❌ Error fetching setting for key ${req.params.key}:`, error);
        res.status(500).json({
          success: false,
          error: "Failed to fetch setting",
          key: req.params.key,
        });
      }
    });

    // Set specific setting
    this.router.post("/settings/:key", async (req, res) => {
      try {
        const { key } = req.params;
        const { value } = req.body;

        // Validate key parameter
        if (!key || typeof key !== "string") {
          return res.status(400).json({
            success: false,
            error: "Valid setting key is required",
          });
        }

        // Validate value presence
        if (value === undefined) {
          return res.status(400).json({
            success: false,
            error: "Value is required",
          });
        }

        // Check if knowledge service is available
        if (!this.server.knowledge || !this.server.knowledge.setUserSetting) {
          console.warn(`⚠️ Knowledge service not available for setting: ${key}`);
          return res.json({
            success: false,
            error: "Knowledge service not available",
            key,
          });
        }

        await this.server.knowledge.setUserSetting(key, value);
        res.json({
          success: true,
          key,
          value,
          message: "Setting saved successfully",
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error(`❌ Error saving setting for key ${key}:`, error);
        res.status(500).json({
          success: false,
          error: "Failed to save setting",
          key: req.params.key,
        });
      }
    });

    // Set multiple settings at once
    this.router.post("/settings", async (req, res) => {
      try {
        const { settings } = req.body;

        if (!settings || typeof settings !== "object") {
          return res.status(400).json({
            success: false,
            error: "Settings object is required",
          });
        }

        const results = [];
        for (const [key, value] of Object.entries(settings)) {
          await this.server.knowledge.setUserSetting(key, value);
          results.push(key);
        }

        res.json({
          success: true,
          message: `${results.length} settings saved successfully`,
          keys: results,
        });
      } catch (error) {
        console.error("Error saving settings:", error);
        res.status(500).json({
          success: false,
          error: "Failed to save settings",
        });
      }
    });

    // Delete specific setting
    this.router.delete("/settings/:key", async (req, res) => {
      try {
        const { key } = req.params;
        await this.server.knowledge.deleteUserSetting(key);
        res.json({
          success: true,
          key,
          message: "Setting deleted successfully",
        });
      } catch (error) {
        console.error("Error deleting setting:", error);
        res.status(500).json({
          success: false,
          error: "Failed to delete setting",
        });
      }
    });
  }

  getDefaultNotificationSettings() {
    return {
      enabled: true,
      position: "top-right",
      duration: 5000,
      sounds: false,
      showProgress: true,
      maxVisible: 5,
      types: {
        success: { enabled: true, duration: 3000, persistent: false },
        error: { enabled: true, duration: 0, persistent: true },
        warning: { enabled: true, duration: 5000, persistent: false },
        info: { enabled: true, duration: 3000, persistent: false },
        progress: { enabled: true, duration: 0, persistent: true },
      },
    };
  }

  getRouter() {
    return this.router;
  }
}

module.exports = SettingsRoutes;
