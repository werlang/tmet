import path from 'path';
import fs from 'fs';
import MoodleUploader from '../helpers/moodle-uploader.js';

// Main execution
export default async function uploadCourses() {
    const uploader = new MoodleUploader(
        process.env.MOODLE_URL || 'https://apnp.ifsul.edu.br',
        process.env.MOODLE_TOKEN,
    );

    if (!fs.existsSync(path.resolve('files', 'moodle_classes.csv'))) {
        console.error('Error: moodle_classes.csv file not found.');
        process.exit(1);
    }
    const courses = fs.readFileSync(path.resolve('files', 'moodle_classes.csv'), 'utf-8').split('\n').map(line => line.split(',').map(item => item.trim())).map(item => ({
        fullname: item[0],
        shortname: item[1],
        category: item[2],
    }));

    // Upload via API
    console.log('\n=== Uploading via Moodle Web Service API ===\n');
    const results = await uploader.uploadCourses(courses);
    
    console.log('\n=== Upload Summary ===');
    console.log(`✓ Successfully created: ${results.success.length}`);
    console.log(`✗ Failed: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
        console.log('\nErrors:');
        results.errors.forEach(err => {
            console.log(`  - ${err.course}: ${err.error}`);
        });
    }

    return results;
}