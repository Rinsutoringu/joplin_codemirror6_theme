module.exports = {
    default: function (context) {
        return {
            plugin: function (markdownIt, options) {
                try {
                    const MarkdownItGitHubAlerts = require('markdown-it-github-alerts');
                    markdownIt.use(MarkdownItGitHubAlerts, options);
                } catch (error) {
                    console.error('Failed to load markdown-it-github-alerts:', error);
                }
            },

            assets: function () {
                return [
                    { name: 'gh-alerts.css' },
                    { name: 'gh-alerts-theme-light.css' },
                    { name: 'gh-alerts-theme-dark.css' }
                ];
            },
        };
    }
};
