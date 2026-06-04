const ScanProfiles = {
  quick: {
    name: 'Quick Scan',
    description: 'Fast scan with basic metadata',
    options: {
      maxDepth: 3,
      includeHidden: false,
      maxFiles: 10000,
      timeout: 30000, // 30 seconds
      parallel: true,
      duplicates: false,
      hashLargeFiles: false,
      maxHashSize: 100, // MB
      profile: 'quick'
    },
    rustArgs: [
      '--max-depth', '3',
      '--parallel',
      '--format', 'json'
    ]
  },
  
  standard: {
    name: 'Standard Scan',
    description: 'Balanced scan with comprehensive metadata',
    options: {
      maxDepth: 10,
      includeHidden: false,
      maxFiles: 50000,
      timeout: 120000, // 2 minutes
      parallel: true,
      duplicates: true,
      hashLargeFiles: true,
      maxHashSize: 1000, // MB
      profile: 'standard'
    },
    rustArgs: [
      '--max-depth', '10',
      '--parallel',
      '--duplicates',
      '--format', 'json'
    ]
  },
  
  deep: {
    name: 'Deep Scan',
    description: 'Comprehensive scan with full analysis',
    options: {
      maxDepth: 20,
      includeHidden: true,
      maxFiles: 0, // No limit
      timeout: 600000, // 10 minutes
      parallel: true,
      duplicates: true,
      hashLargeFiles: true,
      maxHashSize: 5000, // MB
      enumerateLinks: true,
      profile: 'deep'
    },
    rustArgs: [
      '--max-depth', '20',
      '--parallel',
      '--duplicates',
      '--hidden',
      '--enumerate-links',
      '--format', 'json'
    ]
  },
  
  custom: {
    name: 'Custom Scan',
    description: 'User-defined scan configuration',
    options: {
      maxDepth: 10,
      includeHidden: false,
      maxFiles: 50000,
      timeout: 120000,
      parallel: true,
      duplicates: false,
      hashLargeFiles: false,
      maxHashSize: 1000,
      profile: 'custom'
    },
    rustArgs: [
      '--max-depth', '10',
      '--parallel',
      '--format', 'json'
    ]
  }
};

class ScanProfileManager {
  constructor() {
    this.profiles = { ...ScanProfiles };
    this.defaultProfile = 'standard';
  }

  getProfile(profileName) {
    if (!this.profiles[profileName]) {
      console.warn(`Unknown scan profile: ${profileName}, falling back to standard`);
      return this.profiles.standard;
    }
    return { ...this.profiles[profileName] };
  }

  getAllProfiles() {
    return Object.keys(this.profiles).map(key => ({
      name: key,
      displayName: this.profiles[key].name,
      description: this.profiles[key].description,
      options: this.profiles[key].options
    }));
  }

  createCustomProfile(name, options) {
    const customProfile = {
      name: name || 'Custom Scan',
      description: 'User-defined scan configuration',
      options: {
        maxDepth: 10,
        includeHidden: false,
        maxFiles: 50000,
        timeout: 120000,
        parallel: true,
        duplicates: false,
        hashLargeFiles: false,
        maxHashSize: 1000,
        profile: 'custom',
        ...options
      },
      rustArgs: this.buildRustArgs(options)
    };

    this.profiles[name] = customProfile;
    return customProfile;
  }

  buildRustArgs(options) {
    const args = ['--format', 'json'];

    if (options.maxDepth) {
      args.push('--max-depth', options.maxDepth.toString());
    }

    if (options.includeHidden) {
      args.push('--hidden');
    }

    if (options.maxFiles && options.maxFiles > 0) {
      args.push('--max-files', options.maxFiles.toString());
    }

    if (options.parallel) {
      args.push('--parallel');
    }

    if (options.duplicates) {
      args.push('--duplicates');
    }

    if (options.maxHashSize && options.maxHashSize > 0) {
      args.push('--max-hash-size', options.maxHashSize.toString());
    }

    if (options.enumerateLinks) {
      args.push('--enumerate-links');
    }

    // Add Windows-specific options if available
    if (options.usnIncremental) {
      args.push('--usn-incremental');
    }

    if (options.mftFast) {
      args.push('--mft-fast');
    }

    return args;
  }

  getProfileForOptions(options) {
    const profileName = options.profile || this.defaultProfile;
    const profile = this.getProfile(profileName);
    
    // Merge profile options with user-provided options
    const mergedOptions = {
      ...profile.options,
      ...options
    };

    // Build Rust arguments based on merged options
    const rustArgs = this.buildRustArgs(mergedOptions);

    return {
      ...profile,
      options: mergedOptions,
      rustArgs
    };
  }

  validateProfile(profile) {
    const errors = [];

    if (!profile.name) {
      errors.push('Profile name is required');
    }

    if (profile.options && profile.options.maxDepth !== undefined) {
      if (typeof profile.options.maxDepth !== 'number' || profile.options.maxDepth < 1) {
        errors.push('maxDepth must be a positive number');
      }
    }

    if (profile.options && profile.options.maxFiles !== undefined) {
      if (typeof profile.options.maxFiles !== 'number' || profile.options.maxFiles < 0) {
        errors.push('maxFiles must be a non-negative number');
      }
    }

    if (profile.options && profile.options.timeout !== undefined) {
      if (typeof profile.options.timeout !== 'number' || profile.options.timeout < 1000) {
        errors.push('timeout must be at least 1000ms');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  estimateScanTime(directorySize, profileName) {
    const profile = this.getProfile(profileName);
    const options = profile.options;

    // Rough estimation based on directory size and profile complexity
    let baseTimeMs = 1000; // 1 second base time
    let fileSizeMultiplier = 0.001; // 1ms per MB

    // Adjust based on profile complexity
    switch (profileName) {
      case 'quick':
        fileSizeMultiplier = 0.0005; // Faster
        break;
      case 'standard':
        fileSizeMultiplier = 0.001; // Normal
        break;
      case 'deep':
        fileSizeMultiplier = 0.005; // Slower but more thorough
        break;
      default:
        fileSizeMultiplier = 0.001;
    }

    // Adjust for parallel processing
    if (options.parallel) {
      fileSizeMultiplier *= 0.5; // 50% faster with parallel
    }

    // Adjust for duplicate detection
    if (options.duplicates) {
      fileSizeMultiplier *= 1.5; // 50% slower with duplicate detection
    }

    // Adjust for hidden files
    if (options.includeHidden) {
      fileSizeMultiplier *= 1.2; // 20% slower with hidden files
    }

    const estimatedTime = baseTimeMs + (directorySize * fileSizeMultiplier);
    return Math.min(estimatedTime, options.timeout || 300000); // Cap at timeout
  }

  getRecommendedProfile(directorySize, fileCount) {
    // Auto-select best profile based on directory characteristics
    if (fileCount < 1000 && directorySize < 100 * 1024 * 1024) { // < 1000 files, < 100MB
      return 'quick';
    } else if (fileCount < 50000 && directorySize < 10 * 1024 * 1024 * 1024) { // < 50k files, < 10GB
      return 'standard';
    } else {
      return 'deep';
    }
  }
}

module.exports = { ScanProfiles, ScanProfileManager };
