const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { execSync } = require('child_process');

class ContextService {
    constructor() {
        this.contextDir = path.join(__dirname, '../../context');
        this.cachedContext = null;
    }

    /**
     * Reads all files in the context directory and combines them into a formatted string.
     */
    async getContextGrounding() {
        if (this.cachedContext) return this.cachedContext;

        try {
            if (!fs.existsSync(this.contextDir)) {
                logger.warn('Context directory not found:', this.contextDir);
                return '';
            }

            const files = fs.readdirSync(this.contextDir);
            let combinedContext = '--- PRODUCT CONTEXT & GROUNDING ---\n\n';

            for (const file of files) {
                const filePath = path.join(this.contextDir, file);
                const stats = fs.statSync(filePath);

                if (stats.isFile()) {
                    const extension = path.extname(file).toLowerCase();
                    let content = '';

                    try {
                        if (extension === '.txt' || extension === '.md') {
                            content = fs.readFileSync(filePath, 'utf8');
                        } else if (extension === '.rtf') {
                            // Basic RTF to text extraction (very simple)
                            const raw = fs.readFileSync(filePath, 'utf8');
                            content = raw.replace(/\\rtf1[\s\S]*?\{[\s\S]*\}|\\(?![\\{}])[a-z0-9-]+ ?|[{}]/gi, '').trim();
                        } else if (extension === '.docx') {
                            // Try to extract text from docx using unzip and sed if on a system that supports it
                            try {
                                content = execSync(`unzip -p "${filePath}" word/document.xml | sed -e 's/<[^>]*>//g'`, { encoding: 'utf8' });
                            } catch (e) {
                                logger.warn(`Could not extract text from docx file ${file}: ${e.message}`);
                                content = '[Binary DOCX file - could not extract text]';
                            }
                        } else {
                            logger.debug(`Skipping file with unknown extension: ${file}`);
                            continue;
                        }

                        combinedContext += `FILE: ${file}\n`;
                        combinedContext += `CONTENT:\n${content}\n`;
                        combinedContext += `---\n\n`;
                    } catch (fileError) {
                        logger.error(`Error reading context file ${file}:`, fileError);
                    }
                }
            }

            this.cachedContext = combinedContext;
            return combinedContext;
        } catch (error) {
            logger.error('Error loading context grounding:', error);
            return '';
        }
    }

    /**
     * Clears the cache to force a reload of context files.
     */
    clearCache() {
        this.cachedContext = null;
    }
}

module.exports = new ContextService();
