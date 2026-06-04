/**
 * Page Objects for Space Analyzer Application
 * Provides reusable page object classes for better test organization
 */

import { Page, Locator, expect } from '@playwright/test';
import { TestHelpers } from './test-helpers';

export class BasePage {
  protected page: Page;
  protected logger: any;

  constructor(page: Page, logger?: any) {
    this.page = page;
    this.logger = logger;
  }

  async navigateTo(url: string = '/') {
    await this.page.goto(url);
    await TestHelpers.waitForNetworkIdle(this.page);
  }

  async takeScreenshot(name: string) {
    await TestHelpers.takeScreenshot(this.page, name);
  }

  async waitForElement(selector: string, timeout: number = 5000) {
    await TestHelpers.waitForElement(this.page, selector, timeout);
  }

  async clickElement(selector: string) {
    await TestHelpers.clickWithRetry(this.page, selector);
  }

  async fillInput(selector: string, text: string) {
    await TestHelpers.fillWithTyping(this.page, selector, text);
  }

  async isElementVisible(selector: string): Promise<boolean> {
    return await TestHelpers.isVisible(this.page, selector);
  }

  async getElementText(selector: string): Promise<string | null> {
    return await TestHelpers.getTextContent(this.page, selector);
  }
}

export class LandingPage extends BasePage {
  // Locators
  readonly landingPage: Locator;
  readonly directoryInput: Locator;
  readonly startAnalysisButton: Locator;
  readonly backendStatus: Locator;
  readonly aiToggleButton: Locator;
  readonly navigation: Locator;

  constructor(page: Page, logger?: any) {
    super(page, logger);
    this.landingPage = page.locator('[data-testid="landing-page"]');
    this.directoryInput = page.locator('[data-testid="directory-path-input"]');
    this.startAnalysisButton = page.locator('[data-testid="start-analysis-button"]');
    this.backendStatus = page.locator('[data-testid="backend-status"]');
    this.aiToggleButton = page.locator('[data-testid="ai-toggle-button"]');
    this.navigation = page.locator('nav, [role="navigation"], .navbar, .sidebar');
  }

  async waitForPageLoad(): Promise<void> {
    await this.waitForElement('[data-testid="landing-page"]', 10000);
  }

  async isPageLoaded(): Promise<boolean> {
    return await this.isElementVisible('[data-testid="landing-page"]');
  }

  async enterDirectoryPath(path: string): Promise<void> {
    await this.fillInput('[data-testid="directory-path-input"]', path);
  }

  async startAnalysis(): Promise<void> {
    await this.clickElement('[data-testid="start-analysis-button"]');
  }

  async toggleAI(): Promise<void> {
    await this.clickElement('[data-testid="ai-toggle-button"]');
  }

  async isBackendStatusVisible(): Promise<boolean> {
    return await this.isElementVisible('[data-testid="backend-status"]');
  }

  async isAIToggleVisible(): Promise<boolean> {
    return await this.isElementVisible('[data-testid="ai-toggle-button"]');
  }

  async getBackendStatusText(): Promise<string | null> {
    return await this.getElementText('[data-testid="backend-status"]');
  }

  async validatePageElements(): Promise<{ [key: string]: boolean }> {
    const elements = {
      landingPage: await this.isPageLoaded(),
      directoryInput: await this.isElementVisible('[data-testid="directory-path-input"]'),
      startButton: await this.isElementVisible('[data-testid="start-analysis-button"]'),
      backendStatus: await this.isBackendStatusVisible(),
      aiToggle: await this.isAIToggleVisible(),
      navigation: await this.isElementVisible('nav, [role="navigation"], .navbar, .sidebar'),
    };

    return elements;
  }
}

export class AnalysisPage extends BasePage {
  // Locators
  readonly progressSection: Locator;
  readonly scanResults: Locator;
  readonly progressBar: Locator;
  readonly progressText: Locator;
  readonly resultsContainer: Locator;
  readonly aiInsights: Locator;
  readonly visualizationContainer: Locator;

  constructor(page: Page, logger?: any) {
    super(page, logger);
    this.progressSection = page.locator('[data-testid="progress-section"]');
    this.scanResults = page.locator('[data-testid="scan-results"]');
    this.progressBar = page.locator('[data-testid="progress-bar"]');
    this.progressText = page.locator('[data-testid="progress-text"]');
    this.resultsContainer = page.locator('[data-testid="results-container"]');
    this.aiInsights = page.locator('[data-testid="ai-insights"]');
    this.visualizationContainer = page.locator('[data-testid="visualization-container"]');
  }

  async waitForProgressSection(): Promise<void> {
    await this.waitForElement('[data-testid="progress-section"]', 10000);
  }

  async waitForAnalysisCompletion(timeout: number = 120000): Promise<void> {
    await this.waitForElement('[data-testid="progress-section"]', 10000);
    
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const isVisible = await this.isElementVisible('[data-testid="progress-section"]');
      if (!isVisible) {
        break;
      }
      await this.page.waitForTimeout(2000);
    }
  }

  async isProgressVisible(): Promise<boolean> {
    return await this.isElementVisible('[data-testid="progress-section"]');
  }

  async areResultsVisible(): Promise<boolean> {
    return await this.isElementVisible('[data-testid="scan-results"]');
  }

  async getProgressPercentage(): Promise<string | null> {
    return await this.getElementText('[data-testid="progress-text"]');
  }

  async getScanResults(): Promise<string | null> {
    return await this.getElementText('[data-testid="scan-results"]');
  }

  async areAIInsightsVisible(): Promise<boolean> {
    return await this.isElementVisible('[data-testid="ai-insights"]');
  }

  async isVisualizationVisible(): Promise<boolean> {
    return await this.isElementVisible('[data-testid="visualization-container"]');
  }

  async validateAnalysisElements(): Promise<{ [key: string]: boolean }> {
    const elements = {
      progressSection: await this.isProgressVisible(),
      scanResults: await this.areResultsVisible(),
      aiInsights: await this.areAIInsightsVisible(),
      visualization: await this.isVisualizationVisible(),
    };

    return elements;
  }
}

export class AIPage extends BasePage {
  // Locators
  readonly aiPanel: Locator;
  readonly aiModelSelector: Locator;
  readonly aiStatusIndicator: Locator;
  readonly aiInsights: Locator;
  readonly aiRecommendations: Locator;
  readonly aiErrorDisplay: Locator;

  constructor(page: Page, logger?: any) {
    super(page, logger);
    this.aiPanel = page.locator('[data-testid="ai-panel"]');
    this.aiModelSelector = page.locator('[data-testid="ai-model-selector"]');
    this.aiStatusIndicator = page.locator('[data-testid="ai-status-indicator"]');
    this.aiInsights = page.locator('[data-testid="ai-insights"]');
    this.aiRecommendations = page.locator('[data-testid="ai-recommendations"]');
    this.aiErrorDisplay = page.locator('[data-testid="ai-error-display"]');
  }

  async isAIPanelVisible(): Promise<boolean> {
    return await this.isElementVisible('[data-testid="ai-panel"]');
  }

  async selectAIModel(modelName: string): Promise<void> {
    await this.clickElement('[data-testid="ai-model-selector"]');
    await this.page.locator(`[data-value="${modelName}"]`).click();
  }

  async getAIStatus(): Promise<string | null> {
    return await this.getElementText('[data-testid="ai-status-indicator"]');
  }

  async getAIInsights(): Promise<string | null> {
    return await this.getElementText('[data-testid="ai-insights"]');
  }

  async getAIRecommendations(): Promise<string | null> {
    return await this.getElementText('[data-testid="ai-recommendations"]');
  }

  async hasAIError(): Promise<boolean> {
    return await this.isElementVisible('[data-testid="ai-error-display"]');
  }

  async validateAIElements(): Promise<{ [key: string]: boolean }> {
    const elements = {
      aiPanel: await this.isAIPanelVisible(),
      modelSelector: await this.isElementVisible('[data-testid="ai-model-selector"]'),
      statusIndicator: await this.isElementVisible('[data-testid="ai-status-indicator"]'),
      insights: await this.isElementVisible('[data-testid="ai-insights"]'),
      recommendations: await this.isElementVisible('[data-testid="ai-recommendations"]'),
      errorDisplay: await this.hasAIError(),
    };

    return elements;
  }
}

export class NavigationPage extends BasePage {
  // Locators
  readonly navigationMenu: Locator;
  readonly homeLink: Locator;
  readonly analysisLink: Locator;
  readonly reportsLink: Locator;
  readonly settingsLink: Locator;
  readonly helpLink: Locator;

  constructor(page: Page, logger?: any) {
    super(page, logger);
    this.navigationMenu = page.locator('nav, [role="navigation"], .navbar, .sidebar');
    this.homeLink = page.locator('[data-testid="nav-home"], a[href="/"]');
    this.analysisLink = page.locator('[data-testid="nav-analysis"], a[href*="analysis"]');
    this.reportsLink = page.locator('[data-testid="nav-reports"], a[href*="reports"]');
    this.settingsLink = page.locator('[data-testid="nav-settings"], a[href*="settings"]');
    this.helpLink = page.locator('[data-testid="nav-help"], a[href*="help"]');
  }

  async isNavigationVisible(): Promise<boolean> {
    return await this.isElementVisible('nav, [role="navigation"], .navbar, .sidebar');
  }

  async navigateToHome(): Promise<void> {
    await this.clickElement('[data-testid="nav-home"], a[href="/"]');
  }

  async navigateToAnalysis(): Promise<void> {
    await this.clickElement('[data-testid="nav-analysis"], a[href*="analysis"]');
  }

  async navigateToReports(): Promise<void> {
    await this.clickElement('[data-testid="nav-reports"], a[href*="reports"]');
  }

  async navigateToSettings(): Promise<void> {
    await this.clickElement('[data-testid="nav-settings"], a[href*="settings"]');
  }

  async navigateToHelp(): Promise<void> {
    await this.clickElement('[data-testid="nav-help"], a[href*="help"]');
  }

  async validateNavigationElements(): Promise<{ [key: string]: boolean }> {
    const elements = {
      navigation: await this.isNavigationVisible(),
      homeLink: await this.isElementVisible('[data-testid="nav-home"], a[href="/"]'),
      analysisLink: await this.isElementVisible('[data-testid="nav-analysis"], a[href*="analysis"]'),
      reportsLink: await this.isElementVisible('[data-testid="nav-reports"], a[href*="reports"]'),
      settingsLink: await this.isElementVisible('[data-testid="nav-settings"], a[href*="settings"]'),
      helpLink: await this.isElementVisible('[data-testid="nav-help"], a[href*="help"]'),
    };

    return elements;
  }
}

export class ErrorPage extends BasePage {
  // Locators
  readonly errorContainer: Locator;
  readonly errorMessage: Locator;
  readonly errorDetails: Locator;
  readonly retryButton: Locator;
  readonly backButton: Locator;

  constructor(page: Page, logger?: any) {
    super(page, logger);
    this.errorContainer = page.locator('[data-testid="error-container"], .error-container');
    this.errorMessage = page.locator('[data-testid="error-message"], .error-message');
    this.errorDetails = page.locator('[data-testid="error-details"], .error-details');
    this.retryButton = page.locator('[data-testid="retry-button"], .retry-button');
    this.backButton = page.locator('[data-testid="back-button"], .back-button');
  }

  async isErrorVisible(): Promise<boolean> {
    return await this.isElementVisible('[data-testid="error-container"], .error-container');
  }

  async getErrorMessage(): Promise<string | null> {
    return await this.getElementText('[data-testid="error-message"], .error-message');
  }

  async getErrorDetails(): Promise<string | null> {
    return await this.getElementText('[data-testid="error-details"], .error-details');
  }

  async clickRetry(): Promise<void> {
    await this.clickElement('[data-testid="retry-button"], .retry-button');
  }

  async clickBack(): Promise<void> {
    await this.clickElement('[data-testid="back-button"], .back-button');
  }

  async validateErrorElements(): Promise<{ [key: string]: boolean }> {
    const elements = {
      errorContainer: await this.isErrorVisible(),
      errorMessage: await this.isElementVisible('[data-testid="error-message"], .error-message'),
      errorDetails: await this.isElementVisible('[data-testid="error-details"], .error-details'),
      retryButton: await this.isElementVisible('[data-testid="retry-button"], .retry-button'),
      backButton: await this.isElementVisible('[data-testid="back-button"], .back-button'),
    };

    return elements;
  }
}