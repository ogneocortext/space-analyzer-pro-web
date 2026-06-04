#!/usr/bin/env node

/**
 * GitHub Repository Navigation Helper
 * Helps you navigate and manage your GitHub repositories
 */

import { execSync } from 'child_process';
import * as readline from 'readline';
import * as https from 'https';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

async function getGitHubRepos(username) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/users/${username}/repos`,
      method: 'GET',
      headers: {
        'User-Agent': 'GitHub-Nav-Helper'
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const repos = JSON.parse(data);
          resolve(repos);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function listRepos(username) {
  try {
    console.log(`\n📦 Fetching repositories for @${username}...\n`);
    const repos = await getGitHubRepos(username);
    
    if (repos.length === 0) {
      console.log('No repositories found.');
      return;
    }

    console.log(`Found ${repos.length} repositories:\n`);
    repos.forEach((repo, index) => {
      const updated = new Date(repo.updated_at).toLocaleDateString();
      console.log(`${index + 1}. ${repo.name}`);
      console.log(`   Description: ${repo.description || 'No description'}`);
      console.log(`   Language: ${repo.language || 'N/A'}`);
      console.log(`   Updated: ${updated}`);
      console.log(`   URL: ${repo.html_url}`);
      console.log(`   Clone: git clone ${repo.clone_url}\n`);
    });

    const choice = await question('\nEnter repository number to open in browser (or press Enter to exit): ');
    const index = parseInt(choice) - 1;
    
    if (index >= 0 && index < repos.length) {
      const url = repos[index].html_url;
      console.log(`\nOpening ${url}...`);
      execSync(`start ${url}`, { shell: true });
    }
  } catch (error) {
    console.error('Error fetching repositories:', error.message);
    console.log('\nMake sure your profile is public or provide a GitHub token for private repos.');
  }
}

async function main() {
  console.log('🔍 GitHub Repository Navigator\n');
  
  const username = await question('Enter your GitHub username: ');
  if (!username) {
    console.log('Username is required.');
    rl.close();
    return;
  }

  await listRepos(username);
  rl.close();
}

main();
