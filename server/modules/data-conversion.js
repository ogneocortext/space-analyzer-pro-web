/**
 * Convert data to CSV format
 * @param {Object} data - The data to convert
 * @returns {string} CSV formatted string
 */
function convertToCSV(data) {
    if (!data.files) return '';
    
    const headers = ['Name', 'Size', 'Path', 'Extension', 'Category'];
    const rows = data.files.map(f => [
        f.name,
        f.size,
        f.path,
        f.extension,
        f.category
    ]);
    
    return [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
}

/**
 * Convert data to TXT format
 * @param {Object} data - The data to convert
 * @param {Function} formatBytes - Function to format bytes
 * @returns {string} TXT formatted string
 */
function convertToTXT(data, formatBytes) {
    const lines = [];
    lines.push('='.repeat(60));
    lines.push('SPACE ANALYZER PRO - ANALYSIS REPORT');
    lines.push('='.repeat(60));
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');
    
    lines.push('SUMMARY');
    lines.push('-'.repeat(40));
    lines.push(`Total Files: ${data.totalFiles?.toLocaleString() || 0}`);
    lines.push(`Total Size: ${formatBytes(data.totalSize || 0)}`);
    lines.push('');
    
    if (data.categories) {
        lines.push('CATEGORIES');
        lines.push('-'.repeat(40));
        Object.entries(data.categories).forEach(([cat, info]) => {
            lines.push(`${cat}: ${info.count} files (${formatBytes(info.size)})`);
        });
        lines.push('');
    }
    
    if (data.files) {
        lines.push('FILES');
        lines.push('-'.repeat(40));
        data.files.forEach(f => {
            lines.push(`${f.name.padEnd(40)} ${formatBytes(f.size).padStart(10)} ${f.category}`);
        });
    }
    
    return lines.join('\n');
}

/**
 * Format bytes to human-readable format
 * @param {number} bytes - The bytes to format
 * @returns {string} Formatted string
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Convert category distribution to web format
 * @param {Object} distribution - The category distribution
 * @returns {Object} Converted distribution
 */
function convertCategoryDistribution(distribution) {
    if (!distribution) return {};
    
    const result = {};
    Object.entries(distribution).forEach(([category, data]) => {
        result[category] = {
            count: data.count || 0,
            size: data.size || 0,
            percentage: data.percentage || 0
        };
    });
    
    return result;
}

/**
 * Convert extension distribution to web format
 * @param {Object} distribution - The extension distribution
 * @returns {Object} Converted distribution
 */
function convertExtensionDistribution(distribution) {
    if (!distribution) return {};
    
    const result = {};
    Object.entries(distribution).forEach(([extension, data]) => {
        result[extension] = {
            count: data.count || 0,
            size: data.size || 0,
            percentage: data.percentage || 0
        };
    });
    
    return result;
}

module.exports = {
    convertToCSV,
    convertToTXT,
    formatBytes,
    convertCategoryDistribution,
    convertExtensionDistribution
};
