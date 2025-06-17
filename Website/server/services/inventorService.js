const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class InventorService {
    /**
     * @param {string} inputFolder - Relative folder name to search for the assembly file
     * @param {string} outputFolder - Relative folder name to store the output JSON
     */
    constructor(inputFolder, outputFolder) {
        // Resolve to absolute paths relative to the project root
        this.inputFolder = path.resolve(process.cwd(), inputFolder);
        this.outputFolder = path.resolve(process.cwd(), outputFolder);
    }

    /**
     * Finds the first .iam file in the input folder.
     * @returns {Promise<string>} - Path to the .iam file
     */
    async findAssemblyFile() {
        const files = await fs.readdir(this.inputFolder);
        const iamFile = files.find(f => f.toLowerCase().endsWith('.iam'));
        if (!iamFile) throw new Error('No .iam assembly file found in input folder');
        return path.join(this.inputFolder, iamFile);
    }

    /**
     * Runs the InventorExporterAlgo.exe with input and output file paths.
     * @param {string} inputAssemblyPath - Path to the input assembly file (.iam)
     * @param {string} outputJsonPath - Path where the output JSON should be saved
     * @returns {Promise<Object>} - Parsed JSON data from the output file
     */
    static async runExporter(inputAssemblyPath, outputJsonPath) {
        return new Promise((resolve, reject) => {
            const exePath = path.resolve(__dirname, '../../inventor/InventorExporterAlgo.exe');
            const args = [inputAssemblyPath, outputJsonPath];
            const exporter = spawn(exePath, args, { stdio: 'inherit' });

            exporter.on('error', (err) => {
                reject(new Error(`Failed to start InventorExporterAlgo.exe: ${err.message}`));
            });

            exporter.on('close', async (code) => {
                if (code !== 0) {
                    return reject(new Error(`InventorExporterAlgo.exe exited with code ${code}`));
                }
                try {
                    const data = await fs.readFile(outputJsonPath, 'utf-8');
                    resolve(JSON.parse(data));
                } catch (err) {
                    reject(new Error(`Failed to read or parse output JSON: ${err.message}`));
                }
            });
        });
    }

    /**
     * Finds the assembly file, runs the exporter, and returns the relationships data.
     * @returns {Promise<Object>} - Parsed relationships data from output JSON
     */
    async getAssemblyRelationshipsData() {
        const assemblyPath = await this.findAssemblyFile();
        const outputJsonPath = path.join(this.outputFolder, 'assembly_relationships.json');
        // Run the exporter and wait for it to finish
        await InventorService.runExporter(assemblyPath, outputJsonPath);
        // Read and parse the output JSON file
        const data = await fs.readFile(outputJsonPath, 'utf-8');
        return JSON.parse(data);
    }
}

module.exports = InventorService;